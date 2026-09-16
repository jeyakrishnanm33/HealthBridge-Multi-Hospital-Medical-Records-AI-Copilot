const { ForbiddenError } = require('../errors/AppError');

/**
 * Terminal appointment statuses that are no longer actionable.
 */
const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW'];

/**
 * Verify whether an administrative user possesses management authority over
 * a hospital's appointments. Mirrors the authority check in assignmentPolicy.
 *
 * @param {Object} hospital
 * @param {Object} user
 * @throws {ForbiddenError} if unauthorized
 * @returns {boolean} true if authorized
 */
const verifyHospitalAppointmentAuthority = (hospital, user) => {
  if (user.role === 'SYSTEM_ADMIN') {
    return true;
  }

  if (user.role === 'HOSPITAL_ADMIN') {
    const userIdStr = (user.id || user._id || '').toString();
    const isAdmin = hospital.admin && hospital.admin.toString() === userIdStr;
    const isRegisteredBy =
      hospital.registeredBy && hospital.registeredBy.toString() === userIdStr;

    if (isAdmin || isRegisteredBy) {
      return true;
    }
  }

  throw new ForbiddenError(
    'You are not authorized to manage appointments for this hospital',
    'HOSPITAL_APPOINTMENT_ACCESS_FORBIDDEN'
  );
};

/**
 * Verify whether a user possesses read access to an appointment.
 * Allows: involved doctor, involved patient, hospital admin for that hospital, system admin.
 *
 * @param {Object} appointment - Populated appointment document
 * @param {Object} user - Authenticated user
 * @param {Object} [context] - Additional context ({ doctorProfile, patientProfile })
 * @throws {ForbiddenError} if unauthorized
 * @returns {boolean} true if authorized
 */
const verifyAppointmentReadAccess = (appointment, user, context = {}) => {
  if (user.role === 'SYSTEM_ADMIN') {
    return true;
  }

  const userId = (user.id || user._id || '').toString();

  if (user.role === 'HOSPITAL_ADMIN') {
    const hospitalObj = appointment.hospital;
    const hospitalAdminStr = (hospitalObj?.admin || '').toString();
    const hospitalRegisteredByStr = (hospitalObj?.registeredBy || '').toString();

    if (userId === hospitalAdminStr || userId === hospitalRegisteredByStr) {
      return true;
    }

    throw new ForbiddenError(
      'You are not authorized to access appointments for this hospital',
      'APPOINTMENT_ACCESS_FORBIDDEN'
    );
  }

  if (user.role === 'DOCTOR') {
    const doctorProfile = context.doctorProfile;
    if (doctorProfile) {
      const doctorProfileIdStr = (doctorProfile._id || doctorProfile.id || '').toString();
      const appointmentDoctorIdStr = (
        appointment.doctor?._id ||
        appointment.doctor?.id ||
        appointment.doctor ||
        ''
      ).toString();

      if (doctorProfileIdStr && doctorProfileIdStr === appointmentDoctorIdStr) {
        return true;
      }
    }

    throw new ForbiddenError(
      'You are not authorized to access appointments for another doctor',
      'APPOINTMENT_ACCESS_FORBIDDEN'
    );
  }

  if (user.role === 'PATIENT') {
    const patientProfile = context.patientProfile;
    if (patientProfile) {
      const patientProfileIdStr = (patientProfile._id || patientProfile.id || '').toString();
      const appointmentPatientIdStr = (
        appointment.patient?._id ||
        appointment.patient?.id ||
        appointment.patient ||
        ''
      ).toString();

      if (patientProfileIdStr && patientProfileIdStr === appointmentPatientIdStr) {
        return true;
      }
    }

    throw new ForbiddenError(
      'You are not authorized to access appointments for another patient',
      'APPOINTMENT_ACCESS_FORBIDDEN'
    );
  }

  throw new ForbiddenError(
    'Unauthorized to access this appointment',
    'APPOINTMENT_ACCESS_FORBIDDEN'
  );
};

/**
 * Verify whether a user possesses write authority for a specific appointment action.
 *
 * Confirm / Reject: Doctor involved, hospital admin, or system admin
 * Cancel: Involved patient, involved doctor, hospital admin, or system admin
 * Complete / No-Show: Involved doctor, hospital admin, or system admin
 * Reschedule: Involved patient, involved doctor, hospital admin, or system admin
 *
 * @param {Object} appointment - Populated appointment document
 * @param {Object} user - Authenticated user
 * @param {string} action - One of 'confirm', 'reject', 'cancel', 'complete', 'no-show', 'reschedule'
 * @param {Object} [context] - Additional context ({ doctorProfile, patientProfile })
 * @throws {ForbiddenError} if unauthorized
 * @returns {boolean} true if authorized
 */
const verifyAppointmentWriteAccess = (appointment, user, action, context = {}) => {
  if (user.role === 'SYSTEM_ADMIN') {
    return true;
  }

  const userId = (user.id || user._id || '').toString();

  // Helper: is user the hospital admin?
  const isHospitalAdmin = () => {
    if (user.role !== 'HOSPITAL_ADMIN') return false;
    const hospitalObj = appointment.hospital;
    const hospitalAdminStr = (hospitalObj?.admin || '').toString();
    const hospitalRegisteredByStr = (hospitalObj?.registeredBy || '').toString();
    return userId === hospitalAdminStr || userId === hospitalRegisteredByStr;
  };

  // Helper: is user the involved doctor?
  const isInvolvedDoctor = () => {
    if (user.role !== 'DOCTOR') return false;
    const doctorProfile = context.doctorProfile;
    if (!doctorProfile) return false;
    const doctorProfileIdStr = (doctorProfile._id || doctorProfile.id || '').toString();
    const appointmentDoctorIdStr = (
      appointment.doctor?._id ||
      appointment.doctor?.id ||
      appointment.doctor ||
      ''
    ).toString();
    return doctorProfileIdStr && doctorProfileIdStr === appointmentDoctorIdStr;
  };

  // Helper: is user the involved patient?
  const isInvolvedPatient = () => {
    if (user.role !== 'PATIENT') return false;
    const patientProfile = context.patientProfile;
    if (!patientProfile) return false;
    const patientProfileIdStr = (patientProfile._id || patientProfile.id || '').toString();
    const appointmentPatientIdStr = (
      appointment.patient?._id ||
      appointment.patient?.id ||
      appointment.patient ||
      ''
    ).toString();
    return patientProfileIdStr && patientProfileIdStr === appointmentPatientIdStr;
  };

  switch (action) {
    case 'confirm':
    case 'reject':
      if (isInvolvedDoctor() || isHospitalAdmin()) return true;
      break;

    case 'cancel':
    case 'reschedule':
      if (isInvolvedPatient() || isInvolvedDoctor() || isHospitalAdmin()) return true;
      break;

    case 'complete':
    case 'no-show':
      if (isInvolvedDoctor() || isHospitalAdmin()) return true;
      break;

    default:
      break;
  }

  throw new ForbiddenError(
    `You are not authorized to ${action} this appointment`,
    'APPOINTMENT_WRITE_FORBIDDEN'
  );
};

module.exports = {
  verifyHospitalAppointmentAuthority,
  verifyAppointmentReadAccess,
  verifyAppointmentWriteAccess,
  TERMINAL_STATUSES,
};
