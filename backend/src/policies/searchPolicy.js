/**
 * Semantic Clinical Search Authorization Policies
 * Enforces RBAC, Patient Isolation, Doctor Clinical Boundaries, and Admin Clinical Exclusion.
 */
const { Doctor } = require('../models/Doctor');
const { DoctorHospitalAffiliation } = require('../models/DoctorHospitalAffiliation');
const { DoctorPatientAssignment } = require('../models/DoctorPatientAssignment');
const { Patient } = require('../models/Patient');
const { PatientHospitalMembership } = require('../models/PatientHospitalMembership');
const { Hospital } = require('../models/Hospital');
const { Consent } = require('../models/Consent');
const { ForbiddenError, NotFoundError } = require('../errors/AppError');
const { assertNoAdminClinicalAccess } = require('./medicalRecordPolicy');

/**
 * Validate and compute the authorized search scope for an authenticated user.
 *
 * @param {Object} params
 * @param {Object} params.user - Authenticated user { id, role }
 * @param {Object} params.searchParams - { patientId, hospitalId, recordTypes, fromDate, toDate, limit }
 * @returns {Promise<Object>} Authorized filter scope for AI Search & DB retrieval
 */
const verifySearchAuthorization = async ({ user, searchParams }) => {
  // 1. Strict Admin Exclusion
  assertNoAdminClinicalAccess(user);

  if (!user || !user.role) {
    throw new ForbiddenError('Authentication required for clinical search', 'AUTHENTICATION_REQUIRED');
  }

  const { patientId, hospitalId, recordTypes, fromDate, toDate, limit } = searchParams;

  // 2. PATIENT Scope
  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) {
      throw new ForbiddenError('Patient profile not found for authenticated user', 'PATIENT_PROFILE_NOT_FOUND');
    }

    // If client supplied a patientId, verify it matches own profile
    if (patientId && patientId.toString() !== patientProfile._id.toString()) {
      throw new ForbiddenError(
        'Patients are strictly forbidden from searching other patients medical records',
        'PATIENT_ISOLATION_VIOLATION'
      );
    }

    return {
      patientId: patientProfile._id.toString(),
      hospitalId: hospitalId || undefined,
      recordTypes: recordTypes || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      limit: limit || 10,
      authorizedPatientProfile: patientProfile,
    };
  }

  // 3. DOCTOR Scope
  if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile) {
      throw new ForbiddenError('Doctor profile not found for authenticated user', 'DOCTOR_PROFILE_NOT_FOUND');
    }

    if (doctorProfile.status !== 'ACTIVE') {
      throw new ForbiddenError('Doctor profile must be active to search clinical records', 'DOCTOR_NOT_ACTIVE');
    }

    // Doctor searching specific patient
    if (patientId) {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new NotFoundError('Target patient not found', 'PATIENT_NOT_FOUND');
      }

      // 3.1 Check Direct Clinical Assignment
      const assignment = await DoctorPatientAssignment.findOne({
        doctor: doctorProfile._id,
        patient: patient._id,
        status: 'ACTIVE',
      });

      if (assignment) {
        // Verify hospital affiliation
        const affiliation = await DoctorHospitalAffiliation.findOne({
          doctor: doctorProfile._id,
          hospital: assignment.hospital,
          status: 'ACTIVE',
        });

        if (affiliation) {
          return {
            patientId: patient._id.toString(),
            hospitalId: hospitalId || undefined,
            recordTypes: recordTypes || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            limit: limit || 10,
            doctorProfile,
          };
        }
      }

      // 3.2 Check Same-Hospital Active Memberships & Doctor Affiliations
      const doctorAffiliations = await DoctorHospitalAffiliation.find({
        doctor: doctorProfile._id,
        status: 'ACTIVE',
      });
      const doctorHospitalIds = doctorAffiliations.map((a) => a.hospital.toString());

      const patientMemberships = await PatientHospitalMembership.find({
        patient: patient._id,
        status: 'ACTIVE',
        hospital: { $in: doctorHospitalIds },
      });

      if (patientMemberships.length > 0) {
        return {
          patientId: patient._id.toString(),
          hospitalId: hospitalId || undefined,
          recordTypes: recordTypes || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          limit: limit || 10,
          doctorProfile,
        };
      }

      // 3.3 Check Cross-Hospital Patient Consent
      const now = new Date();
      const activeConsents = await Consent.find({
        patient: patient._id,
        requestingDoctor: doctorProfile._id,
        revokedAt: null,
        expiresAt: { $gt: now },
      });

      if (activeConsents.length > 0) {
        return {
          patientId: patient._id.toString(),
          hospitalId: hospitalId || undefined,
          recordTypes: recordTypes || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          limit: limit || 10,
          doctorProfile,
        };
      }

      // If neither assignment, same-hospital membership, nor consent is present:
      throw new ForbiddenError(
        'Doctor does not have authorized clinical access or consent for this patient',
        'DOCTOR_CLINICAL_ACCESS_RESTRICTED'
      );
    }

    // Doctor searching within a hospital without specific patientId
    if (hospitalId) {
      const affiliation = await DoctorHospitalAffiliation.findOne({
        doctor: doctorProfile._id,
        hospital: hospitalId,
        status: 'ACTIVE',
      });

      if (!affiliation) {
        throw new ForbiddenError(
          'Doctor is not actively affiliated with the requested hospital',
          'DOCTOR_NOT_AFFILIATED'
        );
      }

      return {
        patientId: undefined,
        hospitalId: hospitalId.toString(),
        recordTypes: recordTypes || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        limit: limit || 10,
        doctorProfile,
      };
    }

    // Unscoped doctor search across arbitrary unassigned patients is prohibited
    throw new ForbiddenError(
      'Doctor search requires either an authorized patientId or an affiliated hospitalId',
      'UNSCOPED_SEARCH_FORBIDDEN'
    );
  }

  throw new ForbiddenError('Unauthorized user role for clinical search', 'ROLE_NOT_AUTHORIZED');
};

module.exports = {
  verifySearchAuthorization,
};
