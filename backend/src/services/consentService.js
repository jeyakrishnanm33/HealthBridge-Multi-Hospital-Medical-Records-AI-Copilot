const { Consent } = require('../models/Consent');
const { Patient } = require('../models/Patient');
const { Doctor } = require('../models/Doctor');
const { Hospital } = require('../models/Hospital');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} = require('../errors/AppError');
const { verifyPatientCanRevokeConsent } = require('../policies/consentPolicy');

const consentPopulation = [
  {
    path: 'patient',
    select: 'patientId gender dateOfBirth bloodGroup status',
    populate: { path: 'user', select: 'name email' },
  },
  {
    path: 'requestingDoctor',
    select: 'fullName specialization medicalLicenseNumber status',
    populate: { path: 'user', select: 'name email' },
  },
  {
    path: 'requestingHospital',
    select: 'name hospitalCode status address contactEmail contactPhone',
  },
  {
    path: 'sourceHospital',
    select: 'name hospitalCode status address contactEmail contactPhone',
  },
  {
    path: 'grantedBy',
    select: 'name email role',
  },
  {
    path: 'revokedBy',
    select: 'name email role',
  },
];

/**
 * Create a new Consent artifact resulting from an approved AccessRequest.
 */
const createConsentFromApproval = async ({
  accessRequest,
  patientUser,
  expiresAt,
  grantedScopes,
}) => {
  const scopesToGrant = grantedScopes || accessRequest.requestedScopes;

  const consent = await Consent.create({
    patient: accessRequest.patient,
    requestingDoctor: accessRequest.requestingDoctor,
    requestingHospital: accessRequest.requestingHospital,
    sourceHospital: accessRequest.sourceHospital,
    accessRequest: accessRequest._id,
    scopes: scopesToGrant,
    purpose: accessRequest.purpose || 'TREATMENT',
    grantedAt: new Date(),
    expiresAt: new Date(expiresAt),
    grantedBy: patientUser.id || patientUser._id,
  });

  return await Consent.findById(consent._id).populate(consentPopulation);
};

/**
 * List consents with role-scoped isolation.
 */
const listConsents = async ({ query = {}, user }) => {
  const filter = {};
  const now = new Date();

  // Status filtering computed dynamically
  if (query.status === 'ACTIVE') {
    filter.revokedAt = null;
    filter.expiresAt = { $gt: now };
  } else if (query.status === 'REVOKED') {
    filter.revokedAt = { $ne: null };
  } else if (query.status === 'EXPIRED') {
    filter.revokedAt = null;
    filter.expiresAt = { $lte: now };
  }

  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) return { consents: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    filter.patient = patientProfile._id;
  } else if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile) return { consents: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    filter.requestingDoctor = doctorProfile._id;
    if (query.patientId) filter.patient = query.patientId;
  } else if (user.role === 'HOSPITAL_ADMIN') {
    let targetHospitalId = query.hospitalId;
    if (!targetHospitalId) {
      const userHosp = await Hospital.findOne({
        $or: [{ admin: user.id }, { registeredBy: user.id }],
      });
      if (userHosp) targetHospitalId = userHosp._id;
    }
    if (targetHospitalId) {
      filter.$or = [{ sourceHospital: targetHospitalId }, { requestingHospital: targetHospitalId }];
    }
  } else if (user.role === 'SYSTEM_ADMIN') {
    if (query.hospitalId) {
      filter.$or = [{ sourceHospital: query.hospitalId }, { requestingHospital: query.hospitalId }];
    }
    if (query.patientId) filter.patient = query.patientId;
    if (query.doctorId) filter.requestingDoctor = query.doctorId;
  } else {
    throw new ForbiddenError('Unauthorized to view consents', 'ACCESS_FORBIDDEN');
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [consents, total] = await Promise.all([
    Consent.find(filter)
      .populate(consentPopulation)
      .sort({ grantedAt: -1 })
      .skip(skip)
      .limit(limit),
    Consent.countDocuments(filter),
  ]);

  return {
    consents,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieve a single consent by ID with access control.
 */
const getConsentById = async ({ consentId, user }) => {
  const consent = await Consent.findById(consentId).populate(consentPopulation);
  if (!consent) {
    throw new NotFoundError('Consent record not found', 'CONSENT_NOT_FOUND');
  }

  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile || !consent.patient._id.equals(patientProfile._id)) {
      throw new ForbiddenError('You can only access your own consent records', 'CONSENT_ACCESS_FORBIDDEN');
    }
  } else if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile || !consent.requestingDoctor._id.equals(doctorProfile._id)) {
      throw new ForbiddenError('You can only access consents granted to you', 'CONSENT_ACCESS_FORBIDDEN');
    }
  } else if (user.role === 'HOSPITAL_ADMIN') {
    const userHosp = await Hospital.findOne({
      $or: [{ admin: user.id }, { registeredBy: user.id }],
    });
    if (!userHosp) throw new ForbiddenError('Not authorized', 'HOSPITAL_ACCESS_FORBIDDEN');
    const isSource = consent.sourceHospital?._id?.equals(userHosp._id);
    const isRequesting = consent.requestingHospital?._id?.equals(userHosp._id);
    if (!isSource && !isRequesting) {
      throw new ForbiddenError('Not authorized to access consent for other hospitals', 'HOSPITAL_ACCESS_FORBIDDEN');
    }
  }

  return consent;
};

/**
 * Revoke an active consent by the patient owner.
 */
const revokeConsent = async ({ consentId, user, reason }) => {
  if (user.role !== 'PATIENT') {
    throw new ForbiddenError('Only the patient may revoke clinical access consent', 'PATIENT_ROLE_REQUIRED');
  }

  const patientProfile = await Patient.findOne({ user: user.id });
  const consent = await Consent.findById(consentId);
  if (!consent) {
    throw new NotFoundError('Consent record not found', 'CONSENT_NOT_FOUND');
  }

  verifyPatientCanRevokeConsent(user, patientProfile, consent);

  consent.revokedAt = new Date();
  consent.revokedBy = user.id || user._id;
  await consent.save();

  return await Consent.findById(consent._id).populate(consentPopulation);
};

/**
 * Find an active, non-expired, non-revoked consent for cross-hospital clinical access.
 */
const findValidConsent = async ({ patientId, doctorId, sourceHospitalId, requestingHospitalId }) => {
  const now = new Date();
  const filter = {
    patient: patientId,
    requestingDoctor: doctorId,
    sourceHospital: sourceHospitalId,
    revokedAt: null,
    expiresAt: { $gt: now },
  };

  if (requestingHospitalId) {
    filter.requestingHospital = requestingHospitalId;
  }

  return await Consent.findOne(filter);
};

module.exports = {
  createConsentFromApproval,
  listConsents,
  getConsentById,
  revokeConsent,
  findValidConsent,
};
