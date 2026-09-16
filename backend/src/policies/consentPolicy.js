const { ForbiddenError, BadRequestError } = require('../errors/AppError');

const SCOPE_TO_RECORD_TYPE = {
  VISITS: 'VISIT',
  DIAGNOSES: 'DIAGNOSIS',
  MEDICATIONS: 'MEDICATION',
  LAB_RESULTS: 'LAB_RESULT',
  PRESCRIPTIONS: 'PRESCRIPTION',
  DOCUMENTS: 'DOCUMENT',
};

const RECORD_TYPE_TO_SCOPE = {
  VISIT: 'VISITS',
  DIAGNOSIS: 'DIAGNOSES',
  MEDICATION: 'MEDICATIONS',
  LAB_RESULT: 'LAB_RESULTS',
  PRESCRIPTION: 'PRESCRIPTIONS',
  DOCUMENT: 'DOCUMENTS',
};

/**
 * Check whether a consent is currently legally active.
 *
 * @param {Object} consent
 * @returns {boolean}
 */
const isConsentActive = (consent) => {
  if (!consent) return false;
  if (consent.revokedAt) return false;
  const now = new Date();
  const expiry = new Date(consent.expiresAt);
  return now < expiry;
};

/**
 * Check whether a consent covers a specific MedicalRecord discriminator type.
 *
 * @param {Object} consent
 * @param {string} recordType - e.g. 'VISIT', 'LAB_RESULT'
 * @returns {boolean}
 */
const doesConsentAuthorizeRecordType = (consent, recordType) => {
  if (!isConsentActive(consent)) return false;
  const requiredScope = RECORD_TYPE_TO_SCOPE[recordType];
  if (!requiredScope) return false;
  return Array.isArray(consent.scopes) && consent.scopes.includes(requiredScope);
};

/**
 * Check whether a consent covers all requested plural scopes.
 *
 * @param {Object} consent
 * @param {string[]} requestedScopes
 * @returns {boolean}
 */
const doesConsentAuthorizeAllScopes = (consent, requestedScopes) => {
  if (!isConsentActive(consent)) return false;
  if (!Array.isArray(requestedScopes) || requestedScopes.length === 0) return false;
  return requestedScopes.every((scope) => consent.scopes && consent.scopes.includes(scope));
};

/**
 * Verify that a patient possesses the authority to revoke a consent artifact.
 *
 * @param {Object} user
 * @param {Object} patientProfile
 * @param {Object} consent
 * @throws {ForbiddenError}
 */
const verifyPatientCanRevokeConsent = (user, patientProfile, consent) => {
  if (!user || user.role !== 'PATIENT') {
    throw new ForbiddenError(
      'Only the patient may revoke clinical access consent',
      'PATIENT_ROLE_REQUIRED'
    );
  }

  if (!patientProfile) {
    throw new ForbiddenError('Patient profile not found', 'PATIENT_NOT_FOUND');
  }

  const patientId = (patientProfile._id || patientProfile.id || '').toString();
  const consentPatientId = (
    consent.patient?._id ||
    consent.patient?.id ||
    consent.patient ||
    ''
  ).toString();

  if (patientId !== consentPatientId) {
    throw new ForbiddenError(
      'You are not authorized to revoke consent belonging to another patient',
      'CONSENT_ACCESS_FORBIDDEN'
    );
  }

  if (consent.revokedAt) {
    throw new BadRequestError('Consent has already been revoked', 'CONSENT_ALREADY_REVOKED');
  }

  if (new Date(consent.expiresAt) <= new Date()) {
    throw new BadRequestError('Cannot revoke an already expired consent', 'CONSENT_ALREADY_EXPIRED');
  }

  return true;
};

module.exports = {
  SCOPE_TO_RECORD_TYPE,
  RECORD_TYPE_TO_SCOPE,
  isConsentActive,
  doesConsentAuthorizeRecordType,
  doesConsentAuthorizeAllScopes,
  verifyPatientCanRevokeConsent,
};
