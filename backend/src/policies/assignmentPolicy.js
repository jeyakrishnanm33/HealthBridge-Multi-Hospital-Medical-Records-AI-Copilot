const { ForbiddenError } = require('../errors/AppError');

/**
 * Check whether an assignment is currently active.
 *
 * @param {Object} assignment
 * @returns {boolean}
 */
const isAssignmentActive = (assignment) => {
  return Boolean(assignment && assignment.status === 'ACTIVE');
};

/**
 * Verify whether an administrative user possesses management authority over a hospital's assignments.
 * System Admins possess platform-wide authority.
 * Hospital Admins must be the assigned admin or registering user for the specific hospital.
 *
 * @param {Object} hospital
 * @param {Object} adminUser
 * @throws {ForbiddenError} if unauthorized
 * @returns {boolean} true if authorized
 */
const verifyHospitalAdminAssignmentAuthority = (hospital, adminUser) => {
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
    'You are not authorized to manage assignments for this hospital',
    'HOSPITAL_ACCESS_FORBIDDEN'
  );
};

/**
 * Verify whether a doctor possesses read/access authority over an assignment.
 *
 * @param {Object} assignment
 * @param {string|Object} doctorId
 * @throws {ForbiddenError} if unauthorized
 * @returns {boolean} true if authorized
 */
const verifyDoctorAssignmentAccess = (assignment, doctorId) => {
  const docIdStr = (doctorId?._id || doctorId || '').toString();
  const assignmentDocIdStr = (
    assignment.doctor?._id ||
    assignment.doctor?.id ||
    assignment.doctor ||
    ''
  ).toString();

  if (docIdStr && assignmentDocIdStr && docIdStr === assignmentDocIdStr) {
    return true;
  }

  throw new ForbiddenError(
    'You are not authorized to access this assignment',
    'ASSIGNMENT_ACCESS_FORBIDDEN'
  );
};

module.exports = {
  isAssignmentActive,
  verifyHospitalAdminAssignmentAuthority,
  verifyDoctorAssignmentAccess,
};
