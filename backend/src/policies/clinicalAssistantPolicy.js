/**
 * Clinical AI Assistant Authorization Policies
 * Strict RBAC, Patient Data Isolation, Doctor Clinical Boundary Enforcement, and Admin Clinical Exclusion.
 */
const { Doctor } = require('../models/Doctor');
const { DoctorHospitalAffiliation } = require('../models/DoctorHospitalAffiliation');
const { DoctorPatientAssignment } = require('../models/DoctorPatientAssignment');
const { Patient } = require('../models/Patient');
const { PatientHospitalMembership } = require('../models/PatientHospitalMembership');
const { Hospital } = require('../models/Hospital');
const { Consent } = require('../models/Consent');
const { ForbiddenError, NotFoundError, BadRequestError } = require('../errors/AppError');
const { assertNoAdminClinicalAccess } = require('./medicalRecordPolicy');

// Granular Scope to Discriminator Mapping
const CONSENT_SCOPE_MAP = {
  VISITS: 'VISIT',
  DIAGNOSES: 'DIAGNOSIS',
  MEDICATIONS: 'MEDICATION',
  LAB_RESULTS: 'LAB_RESULT',
  PRESCRIPTIONS: 'PRESCRIPTION',
  DOCUMENTS: 'DOCUMENT',
};

/**
 * Verify authorization for querying the Clinical AI Assistant
 *
 * @param {Object} params
 * @param {Object} params.user - Authenticated user { id, role }
 * @param {Object} params.queryParams - { patientId, hospitalId, recordTypes, startDate, endDate, topK }
 * @returns {Promise<Object>} Authorized retrieval scope
 */
const verifyAssistantAuthorization = async ({ user, queryParams }) => {
  // 1. Strict Administrative Clinical Exclusion
  assertNoAdminClinicalAccess(user);

  if (!user || !user.role) {
    throw new ForbiddenError('Authentication required for clinical assistant', 'AUTHENTICATION_REQUIRED');
  }

  const { patientId, hospitalId, recordTypes, startDate, endDate, topK } = queryParams;

  // 2. PATIENT Role Enforcement (Own records only)
  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) {
      throw new ForbiddenError('Patient profile not found for authenticated user', 'PATIENT_PROFILE_NOT_FOUND');
    }

    // Explicit cross-patient protection
    if (patientId && patientId.toString() !== patientProfile._id.toString()) {
      throw new ForbiddenError(
        'Patients are strictly forbidden from asking questions about other patients medical records',
        'PATIENT_ISOLATION_VIOLATION'
      );
    }

    return {
      patientId: patientProfile._id.toString(),
      hospitalId: hospitalId || undefined,
      recordTypes: recordTypes || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      topK: topK || 5,
      role: 'PATIENT',
      authorizedPatientProfile: patientProfile,
      allowedRecordTypes: null, // Full access to own records
    };
  }

  // 3. DOCTOR Role Enforcement
  if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile) {
      throw new ForbiddenError('Doctor profile not found for authenticated user', 'DOCTOR_PROFILE_NOT_FOUND');
    }

    if (doctorProfile.status !== 'ACTIVE') {
      throw new ForbiddenError('Doctor profile must be active to access clinical assistant', 'DOCTOR_NOT_ACTIVE');
    }

    if (!patientId) {
      throw new BadRequestError(
        'Doctor clinical assistant query requires an authorized patientId',
        'PATIENT_ID_REQUIRED'
      );
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new NotFoundError('Target patient not found', 'PATIENT_NOT_FOUND');
    }

    // 3.1 Check Direct Active Doctor-Patient Assignment
    const assignment = await DoctorPatientAssignment.findOne({
      doctor: doctorProfile._id,
      patient: patient._id,
      status: 'ACTIVE',
    });

    if (assignment) {
      const hospital = await Hospital.findById(assignment.hospital);
      if (hospital && hospital.status === 'APPROVED') {
        const affiliation = await DoctorHospitalAffiliation.findOne({
          doctor: doctorProfile._id,
          hospital: assignment.hospital,
          status: 'ACTIVE',
        });

        const membership = await PatientHospitalMembership.findOne({
          patient: patient._id,
          hospital: assignment.hospital,
          status: 'ACTIVE',
        });

        if (affiliation && membership) {
          return {
            patientId: patient._id.toString(),
            hospitalId: hospitalId || undefined,
            recordTypes: recordTypes || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            topK: topK || 5,
            role: 'DOCTOR',
            doctorProfile,
            allowedRecordTypes: null, // Full access under active clinical assignment
          };
        }
      }
    }

    // 3.2 Check Cross-Hospital Active Consent
    const now = new Date();
    const activeConsents = await Consent.find({
      patient: patient._id,
      requestingDoctor: doctorProfile._id,
      revokedAt: null,
      expiresAt: { $gt: now },
    });


    if (activeConsents.length > 0) {
      // Aggregate allowed discriminator types across all active consents
      const allowedTypesSet = new Set();
      for (const c of activeConsents) {
        if (Array.isArray(c.scopes)) {
          c.scopes.forEach((scope) => {
            const mapped = CONSENT_SCOPE_MAP[scope];
            if (mapped) allowedTypesSet.add(mapped);
          });
        }
      }
      const allowedRecordTypes = Array.from(allowedTypesSet);

      return {
        patientId: patient._id.toString(),
        hospitalId: hospitalId || undefined,
        recordTypes: recordTypes || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        topK: topK || 5,
        role: 'DOCTOR',
        doctorProfile,
        allowedRecordTypes: allowedRecordTypes.length > 0 ? allowedRecordTypes : null,
      };
    }

    // If no assignment, affiliation, or active consent exists
    throw new ForbiddenError(
      'Doctor does not have authorized clinical access or active consent for this patient',
      'DOCTOR_CLINICAL_ACCESS_RESTRICTED'
    );
  }

  throw new ForbiddenError('Unauthorized user role for clinical assistant', 'ROLE_NOT_AUTHORIZED');
};

module.exports = {
  verifyAssistantAuthorization,
  CONSENT_SCOPE_MAP,
};
