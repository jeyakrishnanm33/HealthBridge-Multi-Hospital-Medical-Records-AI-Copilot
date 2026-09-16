const { Doctor } = require('../models/Doctor');
const {
  DoctorHospitalAffiliation,
  ALLOWED_DOCTOR_AFFILIATION_TRANSITIONS,
} = require('../models/DoctorHospitalAffiliation');
const { Hospital } = require('../models/Hospital');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../errors/AppError');
const { verifyHospitalAdminAuthority } = require('../policies/doctorPolicy');

/**
 * Create a new Doctor profile linked to an authenticated user.
 */
const createDoctorProfile = async ({ userId, userRole, profileData }) => {
  if (userRole !== 'DOCTOR') {
    throw new ForbiddenError(
      'Only users with the DOCTOR role may create a doctor profile',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  const existingProfile = await Doctor.findOne({ user: userId });
  if (existingProfile) {
    throw new ConflictError(
      'A doctor profile already exists for this user',
      'DOCTOR_PROFILE_EXISTS'
    );
  }

  const formattedLicense = profileData.medicalLicenseNumber.trim().toUpperCase();
  const licenseCollision = await Doctor.findOne({ medicalLicenseNumber: formattedLicense });
  if (licenseCollision) {
    throw new ConflictError(
      'A doctor profile with this medical license number already exists',
      'DOCTOR_PROFILE_EXISTS'
    );
  }

  try {
    const doctor = await Doctor.create({
      user: userId,
      fullName: profileData.fullName,
      phone: profileData.phone,
      gender: profileData.gender,
      dateOfBirth: new Date(profileData.dateOfBirth),
      medicalLicenseNumber: formattedLicense,
      specialization: profileData.specialization,
      qualifications: profileData.qualifications,
      yearsOfExperience: profileData.yearsOfExperience || 0,
      status: 'PENDING',
    });

    const populatedDoctor = await Doctor.findById(doctor._id).populate(
      'user',
      'name email role status'
    );

    return populatedDoctor;
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError(
        'A doctor profile already exists for this user or medical license collision occurred',
        'DOCTOR_PROFILE_EXISTS'
      );
    }
    throw err;
  }
};

/**
 * Retrieve the doctor profile for the authenticated user.
 */
const getMyDoctorProfile = async (userId) => {
  const doctor = await Doctor.findOne({ user: userId }).populate(
    'user',
    'name email role status'
  );

  if (!doctor) {
    throw new NotFoundError('Doctor profile not found', 'DOCTOR_PROFILE_NOT_FOUND');
  }

  return doctor;
};

/**
 * Update allowed fields of the authenticated doctor's profile.
 */
const updateMyDoctorProfile = async ({ userId, updateData }) => {
  const doctor = await Doctor.findOne({ user: userId });
  if (!doctor) {
    throw new NotFoundError('Doctor profile not found', 'DOCTOR_PROFILE_NOT_FOUND');
  }

  if (updateData.phone !== undefined) {
    doctor.phone = updateData.phone;
  }

  if (updateData.specialization !== undefined) {
    doctor.specialization = updateData.specialization;
  }

  if (updateData.qualifications !== undefined) {
    doctor.qualifications = updateData.qualifications;
  }

  if (updateData.yearsOfExperience !== undefined) {
    doctor.yearsOfExperience = updateData.yearsOfExperience;
  }

  await doctor.save();

  const updatedDoctor = await Doctor.findById(doctor._id).populate(
    'user',
    'name email role status'
  );

  return updatedDoctor;
};

/**
 * Request affiliation with an approved hospital.
 */
const requestHospitalAffiliation = async ({ userId, hospitalId, department }) => {
  const doctor = await Doctor.findOne({ user: userId });
  if (!doctor) {
    throw new NotFoundError('Doctor profile not found', 'DOCTOR_PROFILE_NOT_FOUND');
  }

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  if (hospital.status !== 'APPROVED') {
    throw new BadRequestError(
      `Cannot request affiliation with a hospital with status '${hospital.status}'. Only APPROVED hospitals accept affiliations`,
      'HOSPITAL_NOT_APPROVED'
    );
  }

  const existingAffiliation = await DoctorHospitalAffiliation.findOne({
    doctor: doctor._id,
    hospital: hospital._id,
  });

  if (existingAffiliation) {
    throw new ConflictError(
      'An affiliation request or record already exists for this hospital',
      'DOCTOR_AFFILIATION_EXISTS'
    );
  }

  try {
    const affiliation = await DoctorHospitalAffiliation.create({
      doctor: doctor._id,
      hospital: hospital._id,
      department: department || '',
      status: 'PENDING',
    });

    const populatedAffiliation = await DoctorHospitalAffiliation.findById(affiliation._id).populate(
      'hospital',
      'name hospitalCode status address'
    );

    return populatedAffiliation;
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError(
        'An affiliation request already exists for this hospital',
        'DOCTOR_AFFILIATION_EXISTS'
      );
    }
    throw err;
  }
};

/**
 * Retrieve all affiliations for the authenticated doctor.
 */
const getMyHospitalAffiliations = async (userId) => {
  const doctor = await Doctor.findOne({ user: userId });
  if (!doctor) {
    throw new NotFoundError('Doctor profile not found', 'DOCTOR_PROFILE_NOT_FOUND');
  }

  const affiliations = await DoctorHospitalAffiliation.find({ doctor: doctor._id })
    .populate('hospital', 'name hospitalCode status address')
    .sort({ createdAt: -1 });

  return affiliations;
};

/**
 * Retrieve all doctors affiliated with a specific hospital (Hospital Admin or System Admin).
 */
const getHospitalDoctors = async ({ hospitalId, adminUser }) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  verifyHospitalAdminAuthority(hospital, adminUser);

  const affiliations = await DoctorHospitalAffiliation.find({ hospital: hospital._id })
    .populate({
      path: 'doctor',
      select: 'fullName phone gender dateOfBirth medicalLicenseNumber specialization qualifications yearsOfExperience status',
      populate: {
        path: 'user',
        select: 'name email',
      },
    })
    .populate('approvedBy', 'name email')
    .sort({ createdAt: -1 });

  return affiliations;
};

/**
 * Update affiliation status (Hospital Admin or System Admin).
 * Enforces authoritative state machine transitions and hospital lifecycle constraints.
 */
const updateDoctorAffiliationStatus = async ({
  hospitalId,
  affiliationId,
  newStatus,
  adminUser,
}) => {
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  verifyHospitalAdminAuthority(hospital, adminUser);

  const affiliation = await DoctorHospitalAffiliation.findById(affiliationId);
  if (!affiliation || affiliation.hospital.toString() !== hospital._id.toString()) {
    throw new NotFoundError(
      'Doctor affiliation not found for this hospital',
      'DOCTOR_AFFILIATION_NOT_FOUND'
    );
  }

  // Hospital lifecycle check: doctor cannot become ACTIVE under an unapproved or suspended hospital
  if (newStatus === 'ACTIVE' && hospital.status !== 'APPROVED') {
    throw new BadRequestError(
      `Cannot activate affiliation because the hospital status is '${hospital.status}'. Only APPROVED hospitals can have active affiliations`,
      'HOSPITAL_NOT_APPROVED'
    );
  }

  const allowedTransitions = ALLOWED_DOCTOR_AFFILIATION_TRANSITIONS[affiliation.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new BadRequestError(
      `Cannot transition doctor affiliation status from '${affiliation.status}' to '${newStatus}'`,
      'INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION'
    );
  }

  const adminId = adminUser.id || adminUser._id;

  if (affiliation.status === 'PENDING' && newStatus === 'ACTIVE') {
    affiliation.approvedAt = new Date();
    affiliation.approvedBy = adminId;
    // Activate doctor profile if it was pending
    await Doctor.findByIdAndUpdate(affiliation.doctor, { status: 'ACTIVE' });
  } else if (affiliation.status === 'PENDING' && newStatus === 'REJECTED') {
    affiliation.approvedAt = new Date();
    affiliation.approvedBy = adminId;
  }

  affiliation.status = newStatus;
  await affiliation.save();

  const updated = await DoctorHospitalAffiliation.findById(affiliation._id)
    .populate({
      path: 'doctor',
      select: 'fullName phone gender dateOfBirth medicalLicenseNumber specialization qualifications yearsOfExperience status',
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
  createDoctorProfile,
  getMyDoctorProfile,
  updateMyDoctorProfile,
  requestHospitalAffiliation,
  getMyHospitalAffiliations,
  getHospitalDoctors,
  updateDoctorAffiliationStatus,
};
