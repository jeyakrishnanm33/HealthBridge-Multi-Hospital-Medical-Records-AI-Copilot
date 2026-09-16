const { ForbiddenError } = require('../errors/AppError');
const { Hospital } = require('../models/Hospital');

/**
 * Checks if the user is authorized to view audit logs in any capacity.
 * Strictly restricted to SYSTEM_ADMIN and HOSPITAL_ADMIN.
 *
 * @param {Object} user
 * @throws {ForbiddenError}
 */
function canViewAuditLogs(user) {
  if (!user) {
    throw new ForbiddenError('Authentication required to access audit logs', 'AUTHENTICATION_REQUIRED');
  }

  if (user.role !== 'SYSTEM_ADMIN' && user.role !== 'HOSPITAL_ADMIN') {
    throw new ForbiddenError(
      'Access to audit logs is restricted to administrative personnel',
      'FORBIDDEN'
    );
  }

  return true;
}

/**
 * Resolves the hospital IDs administered by a given HOSPITAL_ADMIN user.
 *
 * @param {Object} user
 * @returns {Promise<string[]>} Array of hospital ID strings
 */
async function resolveAdminHospitalIds(user) {
  if (user.role === 'SYSTEM_ADMIN') {
    return []; // System Admin has platform-wide authority
  }

  const userId = user.id || user._id;
  const hospitals = await Hospital.find({
    $or: [{ admin: userId }, { registeredBy: userId }],
  }).select('_id');

  return hospitals.map((h) => h._id.toString());
}

/**
 * Verifies that a user can view a specific audit log event.
 *
 * @param {Object} user
 * @param {Object} auditLog
 * @param {string[]} adminHospitalIds
 * @throws {ForbiddenError}
 */
function canViewAuditEvent(user, auditLog, adminHospitalIds = []) {
  canViewAuditLogs(user);

  if (user.role === 'SYSTEM_ADMIN') {
    return true;
  }

  if (user.role === 'HOSPITAL_ADMIN') {
    const eventHospitalId = auditLog.hospital
      ? (auditLog.hospital._id || auditLog.hospital.id || auditLog.hospital).toString()
      : null;

    if (!eventHospitalId || !adminHospitalIds.includes(eventHospitalId)) {
      throw new ForbiddenError(
        'You are not authorized to view audit events from another hospital',
        'HOSPITAL_ACCESS_FORBIDDEN'
      );
    }

    return true;
  }

  throw new ForbiddenError('You are not authorized to view audit events', 'FORBIDDEN');
}

module.exports = {
  canViewAuditLogs,
  resolveAdminHospitalIds,
  canViewAuditEvent,
};
