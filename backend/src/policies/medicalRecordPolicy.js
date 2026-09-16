const { ForbiddenError, UnauthorizedError } = require('../errors/AppError');
const { isDoctor, hasActiveDoctorProfile, hasActiveHospitalAffiliation } = require('./doctorPolicy');
const { isAssignmentActive } = require('./assignmentPolicy');

/**
 * Verify whether an administrative user is attempting direct clinical access,
 * and block it per HealthBridge security specifications.
 *
 * @param {Object} user
 * @throws {ForbiddenError}
 */
const assertNoAdminClinicalAccess = (user) => {
  if (user && (user.role === 'HOSPITAL_ADMIN' || user.role === 'SYSTEM_ADMIN')) {
    throw new ForbiddenError(
      'Administrative roles do not have direct access to clinical medical record content',
      'ADMIN_CLINICAL_ACCESS_RESTRICTED'
    );
  }
};

/**
 * Validate doctor credentials and active clinical relationships required to create a medical record.
 * 9-step chain:
 * 1. User is DOCTOR
 * 2. Doctor profile exists
 * 3. Doctor is ACTIVE
 * 4. Hospital exists
 * 5. Hospital is APPROVED
 * 6. Doctor has ACTIVE affiliation with that hospital
 * 7. Patient exists
 * 8. Patient has ACTIVE membership with that hospital
 * 9. Doctor has ACTIVE assignment with that patient at that hospital
 *
 * @param {Object} params
 * @param {Object} params.user
 * @param {Object} params.doctor
 * @param {Object} params.hospital
 * @param {Object} params.affiliation
 * @param {Object} params.patient
 * @param {Object} params.membership
 * @param {Object} params.assignment
 * @throws {ForbiddenError|UnauthorizedError}
 */
const verifyDoctorCanCreateRecord = ({
  user,
  doctor,
  hospital,
  affiliation,
  patient,
  membership,
  assignment,
}) => {
  if (!user || !isDoctor(user)) {
    throw new ForbiddenError('Only authenticated doctors can create medical records', 'DOCTOR_ROLE_REQUIRED');
  }

  if (!doctor || !hasActiveDoctorProfile(doctor)) {
    throw new ForbiddenError('Doctor profile must be active to create medical records', 'DOCTOR_NOT_ACTIVE');
  }

  if (!hospital || hospital.status !== 'APPROVED') {
    throw new ForbiddenError('Records can only be created at approved hospitals', 'HOSPITAL_NOT_APPROVED');
  }

  if (!affiliation || !hasActiveHospitalAffiliation(affiliation, hospital)) {
    throw new ForbiddenError(
      'Doctor does not possess an active affiliation with this hospital',
      'DOCTOR_NOT_AFFILIATED'
    );
  }

  if (!patient) {
    throw new ForbiddenError('Patient not found or invalid', 'PATIENT_NOT_FOUND');
  }

  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError(
      'Patient does not possess an active membership with this hospital',
      'PATIENT_NOT_MEMBER'
    );
  }

  if (!assignment || !isAssignmentActive(assignment)) {
    throw new ForbiddenError(
      'Doctor does not possess an active assignment with this patient at this hospital',
      'ASSIGNMENT_NOT_ACTIVE'
    );
  }

  return true;
};

/**
 * Verify whether a doctor can read a patient's medical records.
 * Requires active doctor profile, approved hospital, active affiliation, and active assignment.
 *
 * @param {Object} params
 * @param {Object} params.doctor
 * @param {Object} params.hospital
 * @param {Object} params.affiliation
 * @param {Object} params.assignment
 * @throws {ForbiddenError}
 */
const verifyDoctorCanReadRecord = ({ doctor, hospital, affiliation, assignment }) => {
  if (!doctor || !hasActiveDoctorProfile(doctor)) {
    throw new ForbiddenError('Doctor profile must be active to access medical records', 'DOCTOR_NOT_ACTIVE');
  }

  if (!hospital || hospital.status !== 'APPROVED') {
    throw new ForbiddenError('Records from unapproved hospitals cannot be accessed', 'HOSPITAL_NOT_APPROVED');
  }

  if (!affiliation || !hasActiveHospitalAffiliation(affiliation, hospital)) {
    throw new ForbiddenError(
      'Doctor is not actively affiliated with the hospital associated with this record',
      'DOCTOR_NOT_AFFILIATED'
    );
  }

  if (!assignment || !isAssignmentActive(assignment)) {
    throw new ForbiddenError(
      'Doctor does not possess an active clinical assignment with this patient',
      'ASSIGNMENT_NOT_ACTIVE'
    );
  }

  return true;
};

/**
 * Verify whether a patient is accessing their own records.
 *
 * @param {Object} user
 * @param {Object} patientProfile
 * @param {string|Object} recordPatientId
 * @throws {ForbiddenError}
 */
const verifyPatientCanReadRecord = (user, patientProfile, targetPatient) => {
  if (!patientProfile) {
    throw new ForbiddenError('Patient profile not found', 'PATIENT_NOT_FOUND');
  }

  const userId = (user?.id || user?._id || '').toString();
  const profileUserId = (
    patientProfile.user?._id ||
    patientProfile.user?.id ||
    patientProfile.user ||
    ''
  ).toString();

  if (userId && profileUserId && userId !== profileUserId) {
    throw new ForbiddenError(
      'Patients can only access their own medical records',
      'PATIENT_ACCESS_FORBIDDEN'
    );
  }

  const patientProfileId = (patientProfile._id || patientProfile.id || '').toString();
  const targetPatientId = (
    targetPatient?._id ||
    (typeof targetPatient === 'string' ? targetPatient : null) ||
    (targetPatient && typeof targetPatient.toString === 'function' ? targetPatient.toString() : '')
  ).toString();

  if (patientProfileId !== targetPatientId) {
    throw new ForbiddenError(
      'Patients can only access their own medical records',
      'PATIENT_ACCESS_FORBIDDEN'
    );
  }

  return true;
};

/**
 * Verify whether a doctor can update an existing medical record.
 * Enforces that doctor is active, hospital is approved, doctor has active affiliation,
 * and doctor has active assignment with the patient at that hospital.
 *
 * @param {Object} params
 * @throws {ForbiddenError}
 */
const verifyDoctorCanUpdateRecord = ({
  user,
  doctor,
  hospital,
  affiliation,
  assignment,
  record,
}) => {
  if (!user || !isDoctor(user)) {
    throw new ForbiddenError('Only authenticated doctors can update medical records', 'DOCTOR_ROLE_REQUIRED');
  }

  if (!doctor || !hasActiveDoctorProfile(doctor)) {
    throw new ForbiddenError('Doctor profile must be active to update medical records', 'DOCTOR_NOT_ACTIVE');
  }

  if (!hospital || hospital.status !== 'APPROVED') {
    throw new ForbiddenError('Records from unapproved hospitals cannot be modified', 'HOSPITAL_NOT_APPROVED');
  }

  if (!affiliation || !hasActiveHospitalAffiliation(affiliation, hospital)) {
    throw new ForbiddenError(
      'Doctor is not actively affiliated with the hospital associated with this record',
      'DOCTOR_NOT_AFFILIATED'
    );
  }

  if (!assignment || !isAssignmentActive(assignment)) {
    throw new ForbiddenError(
      'Doctor does not possess an active clinical assignment with this patient at this hospital',
      'ASSIGNMENT_NOT_ACTIVE'
    );
  }

  return true;
};

const { isConsentActive, doesConsentAuthorizeRecordType } = require('./consentPolicy');

/**
 * Verify whether a doctor can access a cross-hospital medical record under an active patient consent.
 *
 * @param {Object} params
 * @param {Object} params.user
 * @param {Object} params.doctor
 * @param {Object} params.patient
 * @param {Object} params.record
 * @param {Object} params.consent
 * @throws {ForbiddenError}
 */
const verifyCrossHospitalRecordAccess = ({ user, doctor, patient, record, consent }) => {
  if (!user || !isDoctor(user)) {
    throw new ForbiddenError(
      'Only authenticated doctors can access cross-hospital clinical records',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  if (!doctor || !hasActiveDoctorProfile(doctor)) {
    throw new ForbiddenError(
      'Doctor profile must be active to access clinical records',
      'DOCTOR_NOT_ACTIVE'
    );
  }

  if (!consent) {
    throw new ForbiddenError(
      'No valid consent exists for cross-hospital record access',
      'CONSENT_REQUIRED'
    );
  }

  if (consent.revokedAt) {
    throw new ForbiddenError(
      'Patient consent has been revoked and can no longer be used for record access',
      'CONSENT_REVOKED'
    );
  }

  const now = new Date();
  if (new Date(consent.expiresAt) <= now) {
    throw new ForbiddenError(
      'Patient consent has expired',
      'CONSENT_EXPIRED'
    );
  }

  // Verify patient match
  const patientId = (patient?._id || patient?.id || patient || '').toString();
  const consentPatientId = (consent.patient?._id || consent.patient?.id || consent.patient || '').toString();
  if (patientId !== consentPatientId) {
    throw new ForbiddenError('Consent does not match requested patient', 'CONSENT_PATIENT_MISMATCH');
  }

  // Verify requesting doctor match
  const doctorId = (doctor?._id || doctor?.id || doctor || '').toString();
  const consentDoctorId = (
    consent.requestingDoctor?._id ||
    consent.requestingDoctor?.id ||
    consent.requestingDoctor ||
    ''
  ).toString();
  if (doctorId !== consentDoctorId) {
    throw new ForbiddenError('Consent was not granted to this doctor', 'CONSENT_DOCTOR_MISMATCH');
  }

  // Verify source hospital match
  const recordHospitalId = (record?.hospital?._id || record?.hospital?.id || record?.hospital || '').toString();
  const consentSourceHospitalId = (
    consent.sourceHospital?._id ||
    consent.sourceHospital?.id ||
    consent.sourceHospital ||
    ''
  ).toString();
  if (recordHospitalId !== consentSourceHospitalId) {
    throw new ForbiddenError(
      'Consent was not granted for the hospital holding this record',
      'CONSENT_HOSPITAL_MISMATCH'
    );
  }

  // Verify record type authorization
  if (!doesConsentAuthorizeRecordType(consent, record.recordType)) {
    throw new ForbiddenError(
      `Consent does not authorize clinical access to records of type '${record.recordType}'`,
      'CONSENT_SCOPE_NOT_AUTHORIZED'
    );
  }

  return true;
};

module.exports = {
  assertNoAdminClinicalAccess,
  verifyDoctorCanCreateRecord,
  verifyDoctorCanReadRecord,
  verifyPatientCanReadRecord,
  verifyDoctorCanUpdateRecord,
  verifyCrossHospitalRecordAccess,
};
