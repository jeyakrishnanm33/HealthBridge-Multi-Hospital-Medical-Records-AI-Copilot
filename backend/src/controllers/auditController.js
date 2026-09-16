const { AuditLog } = require('../models/AuditLog');
const {
  canViewAuditLogs,
  resolveAdminHospitalIds,
  canViewAuditEvent,
} = require('../policies/auditPolicy');
const { NotFoundError } = require('../errors/AppError');

/**
 * List audit logs with role-scoped filtering and pagination.
 * SYSTEM_ADMIN: platform-wide visibility.
 * HOSPITAL_ADMIN: strictly tenant-isolated to their administered hospital(s).
 */
const listAuditLogs = async (req, res, next) => {
  try {
    canViewAuditLogs(req.user);

    const adminHospitalIds = await resolveAdminHospitalIds(req.user);

    const {
      page = 1,
      limit = 20,
      action,
      resourceType,
      resourceId,
      result,
      hospitalId,
      patientId,
      actorId,
      requestId,
      startDate,
      endDate,
    } = req.query;

    const queryFilter = {};

    // Enforce Tenant Isolation for Hospital Admins
    if (req.user.role === 'HOSPITAL_ADMIN') {
      // If admin administers no hospitals, force impossible match so no cross-tenant logs leak
      queryFilter.hospital = { $in: adminHospitalIds };
    } else if (hospitalId) {
      // System Admin can filter by any hospital
      queryFilter.hospital = hospitalId;
    }

    if (action) queryFilter.action = action;
    if (resourceType) queryFilter.resourceType = resourceType;
    if (resourceId) queryFilter.resourceId = resourceId;
    if (result) queryFilter.result = result;
    if (patientId) queryFilter.patient = patientId;
    if (actorId) queryFilter.actor = actorId;
    if (requestId) queryFilter.requestId = requestId;

    // Date range filtering
    if (startDate || endDate) {
      queryFilter.createdAt = {};
      if (startDate) {
        queryFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        // If date-only string was passed (e.g. YYYY-MM-DD), expand to end of day
        if (typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          end.setHours(23, 59, 59, 999);
        }
        queryFilter.createdAt.$lte = end;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(queryFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('actor', 'name email role')
        .populate({
          path: 'patient',
          select: 'patientId user',
          populate: { path: 'user', select: 'name email' },
        })
        .populate('hospital', 'name hospitalCode status'),
      AuditLog.countDocuments(queryFilter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        auditLogs: auditLogs.map((log) => log.toJSON()),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single audit log event by ID with tenant access verification.
 */
const getAuditLogById = async (req, res, next) => {
  try {
    canViewAuditLogs(req.user);

    const adminHospitalIds = await resolveAdminHospitalIds(req.user);

    const auditLog = await AuditLog.findById(req.params.id)
      .populate('actor', 'name email role')
      .populate({
        path: 'patient',
        select: 'patientId user',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('hospital', 'name hospitalCode status');

    if (!auditLog) {
      throw new NotFoundError('Audit log event not found', 'AUDIT_LOG_NOT_FOUND');
    }

    // Verify tenant access for Hospital Admins
    canViewAuditEvent(req.user, auditLog, adminHospitalIds);

    res.status(200).json({
      success: true,
      data: {
        auditLog: auditLog.toJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAuditLogs,
  getAuditLogById,
};
