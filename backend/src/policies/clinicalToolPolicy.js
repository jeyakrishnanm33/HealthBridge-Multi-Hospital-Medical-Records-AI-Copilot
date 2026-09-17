/**
 * Clinical AI Tool Authorization Policies
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

// Scope to Discriminator Mapping
const TOOL_SCOPE_MAP = {
  VISITS: 'VISIT',
  DIAGNOSES: 'DIAGNOSIS',
  MEDICATIONS: 'MEDICATION',
  LAB_RESULTS: 'LAB_RESULT',
  PRESCRIPTIONS: 'PRESCRIPTION',
  DOCUMENTS: 'DOCUMENT',
};

/**
 * Authorize execution of a clinical tool against a target patient
 *
 * @param {Object} params
 * @param {Object} params.user - Authenticated user { id, role }
 * @param {string} params.patientId - Target Patient ID (MongoDB ObjectId string)
 * @param {string} [params.requiredScope] - Required clinical consent scope (e.g. 'VISITS', 'DIAGNOSES')
 * @returns {Promise<Object>} Authorization context
 */
const authorizeClinicalToolAccess = async ({ user, patientId, requiredScope }) => {
  // 1. Strict Administrative Clinical Exclusion
  assertNoAdminClinicalAccess(user);

  if (!user || !user.role) {
    throw new ForbiddenError('Authentication required for clinical tool execution', 'AUTHENTICATION_REQUIRED');
  }

  // 2. PATIENT Role Enforcement
  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) {
      throw new ForbiddenError('Patient profile not found for authenticated user', 'PATIENT_PROFILE_NOT_FOUND');
    }

    if (patientId && patientId.toString() !== patientProfile._id.toString()) {
      throw new ForbiddenError(
        'Patients are strictly forbidden from executing clinical tools on other patients medical records',
        'PATIENT_ISOLATION_VIOLATION'
      );
    }

    return {
      authorized: true,
      role: 'PATIENT',
      patientId: patientProfile._id.toString(),
      patientProfile,
      allowedScopes: null, // Full access to own records
    };
  }

  // 3. DOCTOR Role Enforcement
  if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile) {
      throw new ForbiddenError('Doctor profile not found for authenticated user', 'DOCTOR_PROFILE_NOT_FOUND');
    }

    if (doctorProfile.status !== 'ACTIVE') {
      throw new ForbiddenError('Doctor profile must be active to execute clinical tools', 'DOCTOR_NOT_ACTIVE');
    }

    if (!patientId) {
      throw new BadRequestError('Clinical tool execution requires a valid patientId', 'PATIENT_ID_REQUIRED');
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new NotFoundError('Target patient not found', 'PATIENT_NOT_FOUND');
    }

    // 3.1 Check Direct Active Assignment
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
            authorized: true,
            role: 'DOCTOR',
            patientId: patient._id.toString(),
            doctorProfile,
            allowedScopes: null, // Full access under active clinical assignment
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
      const allowedScopesSet = new Set();
      activeConsents.forEach((c) => {
        if (Array.isArray(c.scopes)) {
          c.scopes.forEach((s) => allowedScopesSet.add(s));
        }
      });
      const allowedScopes = Array.from(allowedScopesSet);

      if (requiredScope && !allowedScopes.includes(requiredScope)) {
        throw new ForbiddenError(
          `Doctor consent does not cover required clinical scope: ${requiredScope}`,
          'CONSENT_SCOPE_RESTRICTED'
        );
      }

      return {
        authorized: true,
        role: 'DOCTOR',
        patientId: patient._id.toString(),
        doctorProfile,
        allowedScopes,
      };
    }

    // If neither assignment nor active consent
    throw new ForbiddenError(
      'Doctor does not have authorized clinical access or active consent for this patient',
      'DOCTOR_CLINICAL_ACCESS_RESTRICTED'
    );
  }

  throw new ForbiddenError('Unauthorized user role for clinical tools', 'ROLE_NOT_AUTHORIZED');
};

module.exports = {
  authorizeClinicalToolAccess,
  TOOL_SCOPE_MAP,
};
