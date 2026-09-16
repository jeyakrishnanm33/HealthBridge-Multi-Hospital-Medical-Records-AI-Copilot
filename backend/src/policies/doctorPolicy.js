const { ForbiddenError } = require('../errors/AppError');

/**
 * Check whether a user has the DOCTOR role.
 *
 * @param {Object} user
 * @returns {boolean}
 */
const isDoctor = (user) => {
  return Boolean(user && user.role === 'DOCTOR');
};

/**
 * Check whether a doctor profile is in ACTIVE status.
 *
 * @param {Object} doctor
 * @returns {boolean}
 */
const hasActiveDoctorProfile = (doctor) => {
  return Boolean(doctor && doctor.status === 'ACTIVE');
};

/**
 * Check whether a doctor has an active affiliation with an approved hospital.
 *
 * @param {Object} affiliation
 * @param {Object} hospital
 * @returns {boolean}
 */
const hasActiveHospitalAffiliation = (affiliation, hospital) => {
  const isAffiliationActive = Boolean(affiliation && affiliation.status === 'ACTIVE');
  const isHospitalApproved = Boolean(hospital && hospital.status === 'APPROVED');
  return isAffiliationActive && isHospitalApproved;
};

/**
 * Verify whether an administrative user possesses management authority over a hospital's doctors.
 * System Admins possess platform-wide authority.
 * Hospital Admins must be the assigned admin or registering user for the specific hospital.
 *
 * @param {Object} hospital
 * @param {Object} adminUser
 * @throws {ForbiddenError} if unauthorized
 * @returns {boolean} true if authorized
 */
const verifyHospitalAdminAuthority = (hospital, adminUser) => {
  if (adminUser.role === 'SYSTEM_ADMIN') {
    return true;
  }

  if (adminUser.role === 'HOSPITAL_ADMIN') {
    const adminIdStr = (adminUser.id || adminUser._id || '').toString();
    const isAdmin = hospital.admin && hospital.admin.toString() === adminIdStr;
    const isRegisteredBy =
      hospital.registeredBy && hospital.registeredBy.toString() === adminIdStr;

    if (isAdmin || isRegisteredBy) {
      return true;
    }
  }

  throw new ForbiddenError(
    'You are not authorized to access or manage doctors for this hospital',
    'HOSPITAL_ACCESS_FORBIDDEN'
  );
};

module.exports = {
  isDoctor,
  hasActiveDoctorProfile,
  hasActiveHospitalAffiliation,
  verifyHospitalAdminAuthority,
};
