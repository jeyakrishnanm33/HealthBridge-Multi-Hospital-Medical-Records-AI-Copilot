const { AccessRequest } = require('../models/AccessRequest');
const { Doctor } = require('../models/Doctor');
const { DoctorHospitalAffiliation } = require('../models/DoctorHospitalAffiliation');
const { DoctorPatientAssignment } = require('../models/DoctorPatientAssignment');
const { Patient } = require('../models/Patient');
const { PatientHospitalMembership } = require('../models/PatientHospitalMembership');
const { Hospital } = require('../models/Hospital');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../errors/AppError');
const {
  normalizeScopesKey,
  verifyDoctorCanCreateAccessRequest,
  verifyPatientCanRespondToAccessRequest,
  verifyDoctorCanCancelAccessRequest,
} = require('../policies/accessRequestPolicy');
const consentService = require('./consentService');
const auditService = require('./auditService');
const { DOMAIN_EVENTS, publishDomainEvent } = require('../utils/domainEvents');

const accessRequestPopulation = [
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
    path: 'respondedBy',
    select: 'name email role',
  },
];

/**
 * Create a new cross-hospital access request initiated by an attending doctor.
 */
const createAccessRequest = async ({
  user,
  patientId,
  sourceHospitalId,
  requestingHospitalId,
  requestedScopes,
  purpose = 'TREATMENT',
  notes = '',
}) => {
  if (!user || user.role !== 'DOCTOR') {
    throw new ForbiddenError(
      'Only authenticated doctors can initiate cross-hospital access requests',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  // 1. Doctor Profile
  const doctor = await Doctor.findOne({ user: user.id });
  if (!doctor) {
    throw new NotFoundError('Doctor profile not found', 'DOCTOR_PROFILE_NOT_FOUND');
  }

  // 2. Requesting Hospital
  const requestingHospital = await Hospital.findById(requestingHospitalId);
  if (!requestingHospital) {
    throw new NotFoundError('Requesting hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  // 3. Affiliation
  const affiliation = await DoctorHospitalAffiliation.findOne({
    doctor: doctor._id,
    hospital: requestingHospital._id,
    status: 'ACTIVE',
  });

  // 4. Patient
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
  }

  // 5. Source Hospital
  const sourceHospital = await Hospital.findById(sourceHospitalId);
  if (!sourceHospital) {
    throw new NotFoundError('Source hospital not found', 'SOURCE_HOSPITAL_NOT_FOUND');
  }

  // 6. Patient Membership (must be active at the source hospital where records reside)
  const patientMembership = await PatientHospitalMembership.findOne({
    patient: patient._id,
    hospital: sourceHospital._id,
    status: 'ACTIVE',
  });

  // 7. Doctor-Patient Assignment at Requesting Hospital
  const assignment = await DoctorPatientAssignment.findOne({
    doctor: doctor._id,
    patient: patient._id,
    hospital: requestingHospital._id,
    status: 'ACTIVE',
  });

  // Enforce the 12-invariant chain policy
  verifyDoctorCanCreateAccessRequest({
    user,
    doctor,
    requestingHospital,
    affiliation,
    patient,
    patientMembership,
    sourceHospital,
    assignment,
    requestedScopes,
    purpose,
  });

  // Duplicate Check with normalized scopes
  const normalizedKey = normalizeScopesKey(requestedScopes);
  const existingPending = await AccessRequest.findOne({
    requestingDoctor: doctor._id,
    patient: patient._id,
    requestingHospital: requestingHospital._id,
    sourceHospital: sourceHospital._id,
    normalizedScopesKey: normalizedKey,
    status: 'PENDING',
  });

  if (existingPending) {
    throw new ConflictError(
      'A pending access request already exists for this patient, doctor, hospital, and scope combination',
      'DUPLICATE_PENDING_REQUEST'
    );
  }

  const accessRequest = await AccessRequest.create({
    patient: patient._id,
    requestingDoctor: doctor._id,
    requestingHospital: requestingHospital._id,
    sourceHospital: sourceHospital._id,
    requestedScopes: [...new Set(requestedScopes)],
    normalizedScopesKey: normalizedKey,
    purpose,
    notes,
    status: 'PENDING',
    requestedAt: new Date(),
  });

  const populated = await AccessRequest.findById(accessRequest._id).populate(accessRequestPopulation);

  await auditService.recordSuccess('ACCESS_REQUEST_CREATED', 'ACCESS_REQUEST', accessRequest._id, {
    actor: user.id,
    actorRole: 'DOCTOR',
    patient: patient._id,
    hospital: sourceHospital._id,
    metadata: {
      requestingHospital: requestingHospital._id,
      requestedScopes,
      purpose,
    },
  });

  await publishDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_CREATED, {
    accessRequestId: accessRequest._id,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id || patient.user,
    doctorName: populated.requestingDoctor?.fullName || doctor.fullName,
    requestingHospitalName: requestingHospital.name,
    sourceHospitalName: sourceHospital.name,
    patientId: populated.patient?._id || patient._id,
    hospitalId: sourceHospital._id,
    actor: user.id,
  });

  return populated;
};

/**
 * List access requests with role-based visibility.
 */
const listAccessRequests = async ({ query = {}, user }) => {
  const filter = {};

  if (query.status && query.status !== 'ALL') {
    filter.status = query.status;
  }

  if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile) return { requests: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    filter.requestingDoctor = doctorProfile._id;
    if (query.patientId) filter.patient = query.patientId;
  } else if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) return { requests: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    filter.patient = patientProfile._id;
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
    throw new ForbiddenError('Unauthorized to view access requests', 'ACCESS_FORBIDDEN');
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    AccessRequest.find(filter)
      .populate(accessRequestPopulation)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit),
    AccessRequest.countDocuments(filter),
  ]);

  return {
    requests,
    accessRequests: requests,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieve a single access request by ID.
 */
const getAccessRequestById = async ({ accessRequestId, user }) => {
  const request = await AccessRequest.findById(accessRequestId).populate(accessRequestPopulation);
  if (!request) {
    throw new NotFoundError('Access request not found', 'ACCESS_REQUEST_NOT_FOUND');
  }

  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile || !request.patient._id.equals(patientProfile._id)) {
      throw new ForbiddenError('You are not authorized to view this access request', 'ACCESS_REQUEST_FORBIDDEN');
    }
  } else if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile || !request.requestingDoctor._id.equals(doctorProfile._id)) {
      throw new ForbiddenError('You are not authorized to view access requests of another doctor', 'ACCESS_REQUEST_FORBIDDEN');
    }
  } else if (user.role === 'HOSPITAL_ADMIN') {
    const userHosp = await Hospital.findOne({
      $or: [{ admin: user.id }, { registeredBy: user.id }],
    });
    if (!userHosp) throw new ForbiddenError('Not authorized', 'HOSPITAL_ACCESS_FORBIDDEN');
    const isSource = request.sourceHospital?._id?.equals(userHosp._id);
    const isRequesting = request.requestingHospital?._id?.equals(userHosp._id);
    if (!isSource && !isRequesting) {
      throw new ForbiddenError('Not authorized to access requests for other hospitals', 'HOSPITAL_ACCESS_FORBIDDEN');
    }
  }

  return request;
};

/**
 * Patient approves an access request, transitioning it PENDING -> APPROVED, and creating a Consent.
 */
const approveAccessRequest = async ({ accessRequestId, user, approvalData }) => {
  if (user.role !== 'PATIENT') {
    throw new ForbiddenError(
      'Only the patient may approve an access request',
      'PATIENT_ROLE_REQUIRED'
    );
  }

  const patientProfile = await Patient.findOne({ user: user.id });
  const request = await AccessRequest.findById(accessRequestId);
  if (!request) {
    throw new NotFoundError('Access request not found', 'ACCESS_REQUEST_NOT_FOUND');
  }

  verifyPatientCanRespondToAccessRequest(user, patientProfile, request);

  if (request.status !== 'PENDING') {
    throw new BadRequestError(
      `Cannot approve access request with status '${request.status}'. Only PENDING requests can be approved`,
      'INVALID_STATE_TRANSITION'
    );
  }

  request.status = 'APPROVED';
  request.approvedAt = new Date();
  request.respondedAt = request.approvedAt;
  request.respondedBy = user.id || user._id;
  await request.save();

  // Create Consent artifact
  const consent = await consentService.createConsentFromApproval({
    accessRequest: request,
    patientUser: user,
    expiresAt: approvalData.expiresAt,
    grantedScopes: approvalData.scopes,
  });

  const updatedRequest = await AccessRequest.findById(request._id).populate(accessRequestPopulation);

  await auditService.recordSuccess('ACCESS_REQUEST_APPROVED', 'ACCESS_REQUEST', request._id, {
    actor: user.id,
    actorRole: 'PATIENT',
    patient: request.patient,
    hospital: request.sourceHospital,
    metadata: {
      consentId: consent?.id || consent?._id,
    },
  });

  await publishDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_APPROVED, {
    accessRequestId: request._id,
    doctorUser: updatedRequest.requestingDoctor?.user?._id || updatedRequest.requestingDoctor?.user?.id || updatedRequest.requestingDoctor?.user,
    patientCode: updatedRequest.patient?.patientId,
    patientId: request.patient,
    hospitalId: request.sourceHospital,
    actor: user.id,
  });

  return {
    accessRequest: updatedRequest,
    consent,
  };
};

/**
 * Patient denies an access request, transitioning it PENDING -> DENIED.
 */
const denyAccessRequest = async ({ accessRequestId, user, reason }) => {
  if (user.role !== 'PATIENT') {
    throw new ForbiddenError(
      'Only the patient may deny an access request',
      'PATIENT_ROLE_REQUIRED'
    );
  }

  const patientProfile = await Patient.findOne({ user: user.id });
  const request = await AccessRequest.findById(accessRequestId);
  if (!request) {
    throw new NotFoundError('Access request not found', 'ACCESS_REQUEST_NOT_FOUND');
  }

  verifyPatientCanRespondToAccessRequest(user, patientProfile, request);

  if (request.status !== 'PENDING') {
    throw new BadRequestError(
      `Cannot deny access request with status '${request.status}'. Only PENDING requests can be denied`,
      'INVALID_STATE_TRANSITION'
    );
  }

  request.status = 'DENIED';
  request.deniedAt = new Date();
  request.respondedAt = request.deniedAt;
  request.respondedBy = user.id || user._id;
  request.decisionReason = reason || '';
  await request.save();

  const updated = await AccessRequest.findById(request._id).populate(accessRequestPopulation);

  await auditService.recordSuccess('ACCESS_REQUEST_DENIED', 'ACCESS_REQUEST', request._id, {
    actor: user.id,
    actorRole: 'PATIENT',
    patient: request.patient,
    hospital: request.sourceHospital,
    reasonCode: 'PATIENT_DENIED',
    metadata: { reason: reason || '' },
  });

  await publishDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_DENIED, {
    accessRequestId: request._id,
    doctorUser: updated.requestingDoctor?.user?._id || updated.requestingDoctor?.user?.id || updated.requestingDoctor?.user,
    patientCode: updated.patient?.patientId,
    patientId: request.patient,
    hospitalId: request.sourceHospital,
    actor: user.id,
  });

  return updated;
};

/**
 * Doctor cancels their own pending access request, transitioning PENDING -> CANCELLED.
 */
const cancelAccessRequest = async ({ accessRequestId, user, reason }) => {
  if (user.role !== 'DOCTOR') {
    throw new ForbiddenError(
      'Only the requesting doctor may cancel an access request',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  const doctorProfile = await Doctor.findOne({ user: user.id });
  const request = await AccessRequest.findById(accessRequestId);
  if (!request) {
    throw new NotFoundError('Access request not found', 'ACCESS_REQUEST_NOT_FOUND');
  }

  verifyDoctorCanCancelAccessRequest(user, doctorProfile, request);

  if (request.status !== 'PENDING') {
    throw new BadRequestError(
      `Cannot cancel access request with status '${request.status}'. Only PENDING requests can be cancelled`,
      'INVALID_STATE_TRANSITION'
    );
  }

  request.status = 'CANCELLED';
  request.cancelledAt = new Date();
  request.respondedAt = request.cancelledAt;
  request.respondedBy = user.id || user._id;
  request.decisionReason = reason || '';
  await request.save();

  const updated = await AccessRequest.findById(request._id).populate(accessRequestPopulation);

  await auditService.recordSuccess('ACCESS_REQUEST_CANCELLED', 'ACCESS_REQUEST', request._id, {
    actor: user.id,
    actorRole: 'DOCTOR',
    patient: request.patient,
    hospital: request.sourceHospital,
    reasonCode: 'DOCTOR_CANCELLED',
    metadata: { reason: reason || '' },
  });

  await publishDomainEvent(DOMAIN_EVENTS.ACCESS_REQUEST_CANCELLED, {
    accessRequestId: request._id,
    patientUser: updated.patient?.user?._id || updated.patient?.user?.id || updated.patient?.user,
    doctorName: updated.requestingDoctor?.fullName,
    patientId: request.patient,
    hospitalId: request.sourceHospital,
    actor: user.id,
  });

  return updated;
};

module.exports = {
  createAccessRequest,
  listAccessRequests,
  getAccessRequestById,
  approveAccessRequest,
  denyAccessRequest,
  cancelAccessRequest,
};
