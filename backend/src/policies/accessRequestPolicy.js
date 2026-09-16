const { ForbiddenError, BadRequestError } = require('../errors/AppError');
const { isDoctor, hasActiveDoctorProfile, hasActiveHospitalAffiliation } = require('./doctorPolicy');
const { isAssignmentActive } = require('./assignmentPolicy');

/**
 * Normalize and sort an array of scopes to produce a canonical key.
 *
 * @param {string[]} scopes
 * @returns {string}
 */
const normalizeScopesKey = (scopes) => {
  if (!Array.isArray(scopes)) return '';
  return [...new Set(scopes)].sort().join(',');
};

/**
 * Verify all 12 preconditions required to create a cross-hospital access request.
 *
 * 1. User has DOCTOR role
 * 2. Doctor profile exists
 * 3. Doctor profile is ACTIVE
 * 4. Requesting hospital is APPROVED
 * 5. Doctor has ACTIVE affiliation with requesting hospital
 * 6. Patient exists
 * 7. Patient has an ACTIVE hospital membership
 * 8. Source hospital exists and is APPROVED
 * 9. Requesting hospital is different from source hospital
 * 10. Doctor has an ACTIVE doctor-patient assignment at requesting hospital
 * 11. Requested scopes are valid
 * 12. Purpose is valid
 *
 * @param {Object} params
 * @throws {ForbiddenError|BadRequestError}
 */
const verifyDoctorCanCreateAccessRequest = ({
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
}) => {
  // 1. Role
  if (!user || !isDoctor(user)) {
    throw new ForbiddenError(
      'Only authenticated doctors can initiate cross-hospital access requests',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  // 2 & 3. Doctor profile
  if (!doctor || !hasActiveDoctorProfile(doctor)) {
    throw new ForbiddenError(
      'Doctor clinical profile must be ACTIVE to request cross-hospital access',
      'DOCTOR_NOT_ACTIVE'
    );
  }

  // 4. Requesting Hospital
  if (!requestingHospital || requestingHospital.status !== 'APPROVED') {
    throw new ForbiddenError(
      'Access requests can only be initiated from approved hospitals',
      'REQUESTING_HOSPITAL_NOT_APPROVED'
    );
  }

  // 5. Affiliation
  if (!affiliation || !hasActiveHospitalAffiliation(affiliation, requestingHospital)) {
    throw new ForbiddenError(
      'Doctor does not possess an ACTIVE affiliation with the requesting hospital',
      'DOCTOR_NOT_AFFILIATED'
    );
  }

  // 6. Patient
  if (!patient) {
    throw new ForbiddenError('Patient not found', 'PATIENT_NOT_FOUND');
  }

  // 7. Doctor-Patient Assignment at Requesting Hospital
  if (!assignment || !isAssignmentActive(assignment)) {
    throw new ForbiddenError(
      'Doctor must have an ACTIVE doctor-patient assignment with this patient at the requesting hospital',
      'ASSIGNMENT_NOT_ACTIVE'
    );
  }

  // 8. Source Hospital
  if (!sourceHospital || sourceHospital.status !== 'APPROVED') {
    throw new ForbiddenError(
      'Source hospital must be an approved facility',
      'SOURCE_HOSPITAL_NOT_APPROVED'
    );
  }

  // 9. Requesting hospital !== Source hospital
  const reqHospId = (requestingHospital._id || requestingHospital.id || '').toString();
  const srcHospId = (sourceHospital._id || sourceHospital.id || '').toString();
  if (reqHospId === srcHospId) {
    throw new BadRequestError(
      'Cross-hospital access requests cannot be created for the same hospital. Use same-hospital clinical workflow instead',
      'SAME_HOSPITAL_REQUEST_REJECTED'
    );
  }

  // 10. Patient Membership at Source Hospital
  if (!patientMembership || patientMembership.status !== 'ACTIVE') {
    throw new BadRequestError(
      'Patient must possess an ACTIVE membership with the source hospital',
      'PATIENT_SOURCE_MEMBERSHIP_REQUIRED'
    );
  }

  // 11. Scopes
  if (!Array.isArray(requestedScopes) || requestedScopes.length === 0) {
    throw new BadRequestError('At least one requested scope is required', 'SCOPES_REQUIRED');
  }

  return true;
};

/**
 * Verify that a patient possesses authority to approve or deny an access request.
 *
 * @param {Object} user
 * @param {Object} patientProfile
 * @param {Object} accessRequest
 * @throws {ForbiddenError}
 */
const verifyPatientCanRespondToAccessRequest = (user, patientProfile, accessRequest) => {
  if (!user || user.role !== 'PATIENT') {
    throw new ForbiddenError(
      'Only the patient may approve or deny an access request',
      'PATIENT_ROLE_REQUIRED'
    );
  }

  if (!patientProfile) {
    throw new ForbiddenError('Patient profile not found', 'PATIENT_NOT_FOUND');
  }

  const patientId = (patientProfile._id || patientProfile.id || '').toString();
  const reqPatientId = (
    accessRequest.patient?._id ||
    accessRequest.patient?.id ||
    accessRequest.patient ||
    ''
  ).toString();

  if (patientId !== reqPatientId) {
    throw new ForbiddenError(
      'You are not authorized to respond to access requests for another patient',
      'ACCESS_REQUEST_FORBIDDEN'
    );
  }

  return true;
};

/**
 * Verify that a doctor possesses authority to cancel their own pending access request.
 *
 * @param {Object} user
 * @param {Object} doctorProfile
 * @param {Object} accessRequest
 * @throws {ForbiddenError}
 */
const verifyDoctorCanCancelAccessRequest = (user, doctorProfile, accessRequest) => {
  if (!user || user.role !== 'DOCTOR') {
    throw new ForbiddenError(
      'Only the requesting doctor may cancel an access request',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  if (!doctorProfile) {
    throw new ForbiddenError('Doctor profile not found', 'DOCTOR_NOT_FOUND');
  }

  const docId = (doctorProfile._id || doctorProfile.id || '').toString();
  const reqDocId = (
    accessRequest.requestingDoctor?._id ||
    accessRequest.requestingDoctor?.id ||
    accessRequest.requestingDoctor ||
    ''
  ).toString();

  if (docId !== reqDocId) {
    throw new ForbiddenError(
      'You are not authorized to cancel access requests created by another doctor',
      'ACCESS_REQUEST_FORBIDDEN'
    );
  }

  return true;
};

module.exports = {
  normalizeScopesKey,
  verifyDoctorCanCreateAccessRequest,
  verifyPatientCanRespondToAccessRequest,
  verifyDoctorCanCancelAccessRequest,
};
