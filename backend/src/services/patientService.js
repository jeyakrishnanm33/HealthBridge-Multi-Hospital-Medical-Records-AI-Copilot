const crypto = require('crypto');
const { Patient } = require('../models/Patient');
const {
  PatientHospitalMembership,
  ALLOWED_TRANSITIONS,
} = require('../models/PatientHospitalMembership');
const { Hospital } = require('../models/Hospital');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../errors/AppError');

/**
 * Generate collision-safe patient identifier.
 * Format: PAT- followed by 6 uppercase hexadecimal characters (e.g., PAT-7F42A1).
 */
const generatePatientId = async () => {
  const maxAttempts = 10;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidateId = `PAT-${randomHex}`;
    const existing = await Patient.findOne({ patientId: candidateId });
    if (!existing) {
      return candidateId;
    }
  }
  // Fallback with timestamp component if extreme collision occurs
  const uniqueHex = crypto.randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
  return `PAT-${uniqueHex}`;
};

/**
 * Create a new Patient profile linked to an authenticated user.
 */
const createPatientProfile = async ({ userId, userRole, profileData }) => {
  if (userRole !== 'PATIENT') {
    throw new ForbiddenError(
      'Only users with the PATIENT role may create a patient profile',
      'PATIENT_ROLE_REQUIRED'
    );
  }

  const existingProfile = await Patient.findOne({ user: userId });
  if (existingProfile) {
    throw new ConflictError(
      'A patient profile already exists for this user',
      'PATIENT_PROFILE_EXISTS'
    );
  }

  const patientId = await generatePatientId();

  try {
    const patient = await Patient.create({
      user: userId,
      patientId,
      dateOfBirth: new Date(profileData.dateOfBirth),
      gender: profileData.gender,
      bloodGroup: profileData.bloodGroup || null,
      phone: profileData.phone,
      address: profileData.address,
      emergencyContact: profileData.emergencyContact || {},
      status: 'ACTIVE',
    });

    const populatedPatient = await Patient.findById(patient._id).populate(
      'user',
      'name email role status'
    );

    return populatedPatient;
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError(
        'A patient profile already exists for this user or identifier collision occurred',
        'PATIENT_PROFILE_EXISTS'
      );
    }
    throw err;
  }
};

/**
 * Retrieve the patient profile for the authenticated user.
 */
const getMyPatientProfile = async (userId) => {
  const patient = await Patient.findOne({ user: userId }).populate(
    'user',
    'name email role status'
  );

  if (!patient) {
    throw new NotFoundError('Patient profile not found', 'PATIENT_PROFILE_NOT_FOUND');
  }

  return patient;
};

/**
 * Update allowed fields of the authenticated patient's profile.
 */
const updateMyPatientProfile = async ({ userId, updateData }) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) {
    throw new NotFoundError('Patient profile not found', 'PATIENT_PROFILE_NOT_FOUND');
  }

  if (updateData.phone !== undefined) {
    patient.phone = updateData.phone;
  }

  if (updateData.bloodGroup !== undefined) {
    patient.bloodGroup = updateData.bloodGroup;
  }

  if (updateData.address) {
    patient.address = {
      ...patient.address.toObject(),
      ...updateData.address,
    };
  }

  if (updateData.emergencyContact) {
    patient.emergencyContact = {
      ...patient.emergencyContact.toObject(),
      ...updateData.emergencyContact,
    };
  }

  await patient.save();

  const updatedPatient = await Patient.findById(patient._id).populate(
    'user',
    'name email role status'
  );

  return updatedPatient;
};

/**
 * Request membership to an approved hospital.
 */
const requestHospitalMembership = async ({ userId, hospitalId }) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) {
    throw new NotFoundError('Patient profile not found', 'PATIENT_PROFILE_NOT_FOUND');
  }

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  if (hospital.status !== 'APPROVED') {
    throw new BadRequestError(
      `Cannot request membership to a hospital with status '${hospital.status}'. Only APPROVED hospitals accept memberships`,
      'HOSPITAL_NOT_APPROVED'
    );
  }

  const existingMembership = await PatientHospitalMembership.findOne({
    patient: patient._id,
    hospital: hospital._id,
  });

  if (existingMembership) {
    throw new ConflictError(
      'A membership request or record already exists for this hospital',
      'MEMBERSHIP_EXISTS'
    );
  }

  try {
    const membership = await PatientHospitalMembership.create({
      patient: patient._id,
      hospital: hospital._id,
      status: 'PENDING',
    });

    const populatedMembership = await PatientHospitalMembership.findById(membership._id).populate(
      'hospital',
      'name hospitalCode status address'
    );

    return populatedMembership;
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError(
        'A membership request already exists for this hospital',
        'MEMBERSHIP_EXISTS'
      );
    }
    throw err;
  }
};

/**
 * Retrieve all memberships for the authenticated patient.
 */
const getMyHospitalMemberships = async (userId) => {
  const patient = await Patient.findOne({ user: userId });
  if (!patient) {
    throw new NotFoundError('Patient profile not found', 'PATIENT_PROFILE_NOT_FOUND');
  }

  const memberships = await PatientHospitalMembership.find({ patient: patient._id })
    .populate('hospital', 'name hospitalCode status address')
    .sort({ createdAt: -1 });

  return memberships;
};

/**
 * Verify whether an admin user is authorized to manage a hospital's memberships.
 */
const verifyHospitalAdminAuthority = (hospital, adminUser) => {
  if (adminUser.role === 'SYSTEM_ADMIN') {
    return true;
  }

  if (adminUser.role === 'HOSPITAL_ADMIN') {
    const adminIdStr = adminUser.id || adminUser._id.toString();
    const isAdmin = hospital.admin && hospital.admin.toString() === adminIdStr;
    const isRegisteredBy =
      hospital.registeredBy && hospital.registeredBy.toString() === adminIdStr;

    if (isAdmin || isRegisteredBy) {
      return true;
    }
  }

  throw new ForbiddenError(
    'You are not authorized to access or manage memberships for this hospital',
    'HOSPITAL_ACCESS_FORBIDDEN'
  );
};

/**
 * Get all memberships for a specific hospital (Hospital Admin or System Admin).
 */
const getHospitalMemberships = async ({ hospitalId, adminUser }) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  verifyHospitalAdminAuthority(hospital, adminUser);

  const memberships = await PatientHospitalMembership.find({ hospital: hospital._id })
    .populate({
      path: 'patient',
      select: 'patientId gender dateOfBirth status phone',
      populate: {
        path: 'user',
        select: 'name email',
      },
    })
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  return memberships;
};

/**
 * Update a membership's status (Hospital Admin or System Admin).
 * Enforces authoritative state machine transitions.
 */
const updateMembershipStatus = async ({ hospitalId, membershipId, newStatus, adminUser }) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  verifyHospitalAdminAuthority(hospital, adminUser);

  const membership = await PatientHospitalMembership.findById(membershipId);
  if (!membership || membership.hospital.toString() !== hospital._id.toString()) {
    throw new NotFoundError(
      'Membership not found for this hospital',
      'MEMBERSHIP_NOT_FOUND'
    );
  }

  const allowedTransitions = ALLOWED_TRANSITIONS[membership.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot transition membership status from '${membership.status}' to '${newStatus}'`,
      'INVALID_MEMBERSHIP_STATUS_TRANSITION'
    );
  }

  const adminId = adminUser.id || adminUser._id;

  if (membership.status === 'PENDING' && newStatus === 'ACTIVE') {
    membership.joinedAt = new Date();
    membership.approvedAt = new Date();
    membership.approvedBy = adminId;
  } else if (membership.status === 'PENDING' && newStatus === 'REJECTED') {
    membership.approvedAt = new Date();
    membership.approvedBy = adminId;
  }

  membership.status = newStatus;
  await membership.save();

  const updated = await PatientHospitalMembership.findById(membership._id)
    .populate({
      path: 'patient',
      select: 'patientId gender dateOfBirth status phone',
      populate: {
        path: 'user',
        select: 'name email',
      },
    })
    .populate('approvedBy', 'name email')
    .populate('hospital', 'name hospitalCode status');

  return updated;
};

module.exports = {
  generatePatientId,
  createPatientProfile,
  getMyPatientProfile,
  updateMyPatientProfile,
  requestHospitalMembership,
  getMyHospitalMemberships,
  getHospitalMemberships,
  updateMembershipStatus,
};
