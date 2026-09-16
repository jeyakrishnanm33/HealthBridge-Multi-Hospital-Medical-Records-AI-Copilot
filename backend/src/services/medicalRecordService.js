const { MedicalRecord, RECORD_TYPES } = require('../models/MedicalRecord');
const { VisitRecord } = require('../models/VisitRecord');
const { DiagnosisRecord } = require('../models/DiagnosisRecord');
const { MedicationRecord } = require('../models/MedicationRecord');
const { LabResultRecord } = require('../models/LabResultRecord');
const { PrescriptionRecord } = require('../models/PrescriptionRecord');
const { DocumentRecord } = require('../models/DocumentRecord');
const { Doctor } = require('../models/Doctor');
const { DoctorHospitalAffiliation } = require('../models/DoctorHospitalAffiliation');
const { DoctorPatientAssignment } = require('../models/DoctorPatientAssignment');
const { Patient } = require('../models/Patient');
const { PatientHospitalMembership } = require('../models/PatientHospitalMembership');
const { Hospital } = require('../models/Hospital');
const { Consent } = require('../models/Consent');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} = require('../errors/AppError');
const {
  assertNoAdminClinicalAccess,
  verifyDoctorCanCreateRecord,
  verifyDoctorCanReadRecord,
  verifyPatientCanReadRecord,
  verifyDoctorCanUpdateRecord,
  verifyCrossHospitalRecordAccess,
} = require('../policies/medicalRecordPolicy');
const { SCOPE_TO_RECORD_TYPE } = require('../policies/consentPolicy');
const { contentSchemasByType } = require('../validators/medicalRecordValidators');

const medicalRecordPopulation = [
  {
    path: 'doctor',
    select: 'fullName specialization medicalLicenseNumber yearsOfExperience status user',
    populate: { path: 'user', select: 'name email role' },
  },
  {
    path: 'patient',
    select: 'patientId gender dateOfBirth bloodGroup status user',
    populate: { path: 'user', select: 'name email' },
  },
  {
    path: 'hospital',
    select: 'name hospitalCode status address contactEmail contactPhone',
  },
];

const discriminatorModels = {
  VISIT: VisitRecord,
  DIAGNOSIS: DiagnosisRecord,
  MEDICATION: MedicationRecord,
  LAB_RESULT: LabResultRecord,
  PRESCRIPTION: PrescriptionRecord,
  DOCUMENT: DocumentRecord,
};

/**
 * Create a new clinical medical record.
 * Enforces the full 9-step authorization chain:
 * 1. Authenticated user is a DOCTOR
 * 2. Doctor profile exists
 * 3. Doctor profile is ACTIVE
 * 4. Hospital exists
 * 5. Hospital is APPROVED
 * 6. Doctor has ACTIVE affiliation with that hospital
 * 7. Patient exists
 * 8. Patient has ACTIVE membership with that hospital
 * 9. Doctor has ACTIVE assignment with that patient at that hospital
 */
const createMedicalRecord = async ({
  user,
  patientId,
  hospitalId,
  recordType,
  recordDate,
  content,
}) => {
  // Reject admin direct clinical creation attempts
  assertNoAdminClinicalAccess(user);

  if (!user || user.role !== 'DOCTOR') {
    throw new ForbiddenError(
      'Only authenticated doctors can create medical records',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  // 1. Doctor Profile
  const doctor = await Doctor.findOne({ user: user.id });
  if (!doctor) {
    throw new NotFoundError(
      'Doctor profile not found for authenticated user',
      'DOCTOR_PROFILE_NOT_FOUND'
    );
  }

  // 2. Hospital
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  // 3. Doctor-Hospital Affiliation
  const affiliation = await DoctorHospitalAffiliation.findOne({
    doctor: doctor._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });

  // 4. Patient
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
  }

  // 5. Patient Hospital Membership
  const membership = await PatientHospitalMembership.findOne({
    patient: patient._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });

  // 6. Doctor-Patient Assignment
  const assignment = await DoctorPatientAssignment.findOne({
    doctor: doctor._id,
    patient: patient._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });

  // Policy verification
  verifyDoctorCanCreateRecord({
    user,
    doctor,
    hospital,
    affiliation,
    patient,
    membership,
    assignment,
  });

  // Select discriminator model
  const ModelClass = discriminatorModels[recordType];
  if (!ModelClass) {
    throw new BadRequestError(`Invalid record type: ${recordType}`, 'INVALID_RECORD_TYPE');
  }

  const record = await ModelClass.create({
    patient: patient._id,
    hospital: hospital._id,
    doctor: doctor._id,
    recordDate: recordDate || new Date(),
    ...content,
  });

  return await MedicalRecord.findById(record._id).populate(medicalRecordPopulation);
};

/**
 * Retrieve a single medical record by ID.
 * Enforces patient self-access, doctor active assignment & affiliation,
 * and completely excludes administrative clinical access.
 */
const getMedicalRecordById = async ({ recordId, user }) => {
  // Administrative roles do NOT have direct access to clinical record content
  assertNoAdminClinicalAccess(user);

  const record = await MedicalRecord.findById(recordId).populate(medicalRecordPopulation);
  if (!record) {
    throw new NotFoundError('Medical record not found', 'RECORD_NOT_FOUND');
  }

  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) {
      throw new ForbiddenError('Patient profile not found', 'PATIENT_PROFILE_NOT_FOUND');
    }

    verifyPatientCanReadRecord(user, patientProfile, record.patient);
    return record;
  }

  if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile) {
      throw new ForbiddenError('Doctor profile not found', 'DOCTOR_NOT_FOUND');
    }

    const hospital = await Hospital.findById(record.hospital?._id || record.hospital);

    // 1. Same-Hospital Access Check
    const affiliation = await DoctorHospitalAffiliation.findOne({
      doctor: doctorProfile._id,
      hospital: hospital?._id,
      status: 'ACTIVE',
    });

    const assignment = await DoctorPatientAssignment.findOne({
      doctor: doctorProfile._id,
      patient: record.patient?._id || record.patient,
      hospital: hospital?._id,
      status: 'ACTIVE',
    });

    if (affiliation && assignment && hospital?.status === 'APPROVED') {
      verifyDoctorCanReadRecord({
        doctor: doctorProfile,
        hospital,
        affiliation,
        assignment,
      });
      return record;
    }

    // 2. Cross-Hospital Access Path: requires active clinical assignment at some hospital and valid patient consent
    const activeAssignments = await DoctorPatientAssignment.find({
      doctor: doctorProfile._id,
      patient: record.patient?._id || record.patient,
      status: 'ACTIVE',
    });

    if (!activeAssignments || activeAssignments.length === 0) {
      throw new ForbiddenError(
        'Doctor does not possess an active clinical assignment with this patient',
        'ASSIGNMENT_NOT_ACTIVE'
      );
    }

    const consent = await Consent.findOne({
      patient: record.patient?._id || record.patient,
      requestingDoctor: doctorProfile._id,
      sourceHospital: hospital?._id,
    });

    verifyCrossHospitalRecordAccess({
      user,
      doctor: doctorProfile,
      patient: record.patient,
      record,
      consent,
    });

    return record;
  }

  throw new ForbiddenError('Unauthorized to access clinical medical records', 'ACCESS_FORBIDDEN');
};

/**
 * List medical records for a specific patient.
 * Respects patient self-access, doctor same-hospital assignments, and cross-hospital patient consents.
 */
const listPatientMedicalRecords = async ({ patientId, user, query = {} }) => {
  assertNoAdminClinicalAccess(user);

  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
  }

  const filter = { patient: patient._id };

  if (query.recordType && query.recordType !== 'ALL') {
    filter.recordType = query.recordType;
  }

  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) {
      throw new ForbiddenError('Patient profile not found', 'PATIENT_PROFILE_NOT_FOUND');
    }

    verifyPatientCanReadRecord(user, patientProfile, patient._id);

    if (query.hospitalId) {
      filter.hospital = query.hospitalId;
    }
  } else if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile || doctorProfile.status !== 'ACTIVE') {
      throw new ForbiddenError(
        'Doctor profile must be active to view medical records',
        'DOCTOR_NOT_ACTIVE'
      );
    }

    // Doctor must have an active assignment with this patient
    const assignments = await DoctorPatientAssignment.find({
      doctor: doctorProfile._id,
      patient: patient._id,
      status: 'ACTIVE',
    }).populate('hospital');

    if (!assignments || assignments.length === 0) {
      throw new ForbiddenError(
        'Doctor does not possess an active assignment with this patient',
        'ASSIGNMENT_NOT_ACTIVE'
      );
    }

    // Filter to approved hospitals where doctor also has active affiliation
    const approvedHospitalIds = assignments
      .filter((a) => a.hospital && a.hospital.status === 'APPROVED')
      .map((a) => a.hospital._id);

    const affiliations = await DoctorHospitalAffiliation.find({
      doctor: doctorProfile._id,
      hospital: { $in: approvedHospitalIds },
      status: 'ACTIVE',
    });

    const authorizedHospitalIds = affiliations.map((aff) => aff.hospital.toString());

    // Look up active non-expired non-revoked consents for cross-hospital records
    const now = new Date();
    const activeConsents = await Consent.find({
      patient: patient._id,
      requestingDoctor: doctorProfile._id,
      revokedAt: null,
      expiresAt: { $gt: now },
    });

    if (query.hospitalId) {
      const targetHospitalIdStr = query.hospitalId.toString();
      if (authorizedHospitalIds.includes(targetHospitalIdStr)) {
        // Same-hospital access
        filter.hospital = query.hospitalId;
      } else {
        // Cross-hospital access via consent
        const consent = await Consent.findOne({
          patient: patient._id,
          requestingDoctor: doctorProfile._id,
          sourceHospital: query.hospitalId,
        });

        if (!consent) {
          throw new ForbiddenError(
            'Doctor is not authorized to view records for this patient at the specified hospital without valid consent',
            'CONSENT_REQUIRED'
          );
        }
        if (consent.revokedAt) {
          throw new ForbiddenError('Patient consent has been revoked', 'CONSENT_REVOKED');
        }
        if (new Date(consent.expiresAt) <= now) {
          throw new ForbiddenError('Patient consent has expired', 'CONSENT_EXPIRED');
        }

        const allowedRecordTypes = (consent.scopes || [])
          .map((s) => SCOPE_TO_RECORD_TYPE[s])
          .filter(Boolean);

        if (query.recordType && query.recordType !== 'ALL') {
          if (!allowedRecordTypes.includes(query.recordType)) {
            throw new ForbiddenError(
              `Consent does not authorize access to '${query.recordType}' records`,
              'CONSENT_SCOPE_NOT_AUTHORIZED'
            );
          }
          filter.recordType = query.recordType;
        } else {
          filter.recordType = { $in: allowedRecordTypes };
        }
        filter.hospital = query.hospitalId;
      }
    } else {
      // Combined query across all authorized hospitals (same-hospital + consented cross-hospital)
      const orBranches = [];
      if (authorizedHospitalIds.length > 0) {
        orBranches.push({ hospital: { $in: authorizedHospitalIds } });
      }

      for (const c of activeConsents) {
        const srcHospIdStr = c.sourceHospital.toString();
        if (!authorizedHospitalIds.includes(srcHospIdStr)) {
          const allowedRecordTypes = (c.scopes || [])
            .map((s) => SCOPE_TO_RECORD_TYPE[s])
            .filter(Boolean);
          if (allowedRecordTypes.length > 0) {
            orBranches.push({
              hospital: c.sourceHospital,
              recordType: { $in: allowedRecordTypes },
            });
          }
        }
      }

      if (orBranches.length === 0) {
        throw new ForbiddenError(
          'Doctor has no active authorization or consent to view clinical records for this patient',
          'DOCTOR_NOT_AFFILIATED'
        );
      }

      filter.$or = orBranches;
    }
  } else {
    throw new ForbiddenError('Unauthorized to access clinical medical records', 'ACCESS_FORBIDDEN');
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [records, total] = await Promise.all([
    MedicalRecord.find(filter)
      .populate(medicalRecordPopulation)
      .sort({ recordDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    MedicalRecord.countDocuments(filter),
  ]);

  return {
    records,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update an existing medical record.
 * Protects core ownership fields (patient, hospital, doctor, recordType).
 * Enforces doctor active affiliation and clinical assignment.
 */
const updateMedicalRecord = async ({ recordId, user, updateData }) => {
  assertNoAdminClinicalAccess(user);

  if (!user || user.role !== 'DOCTOR') {
    throw new ForbiddenError(
      'Only authenticated doctors can update medical records',
      'DOCTOR_ROLE_REQUIRED'
    );
  }

  const doctor = await Doctor.findOne({ user: user.id });
  if (!doctor || doctor.status !== 'ACTIVE') {
    throw new ForbiddenError(
      'Doctor profile must be active to update medical records',
      'DOCTOR_NOT_ACTIVE'
    );
  }

  const record = await MedicalRecord.findById(recordId);
  if (!record) {
    throw new NotFoundError('Medical record not found', 'RECORD_NOT_FOUND');
  }

  const hospital = await Hospital.findById(record.hospital);
  if (!hospital || hospital.status !== 'APPROVED') {
    throw new ForbiddenError(
      'Records from unapproved hospitals cannot be modified',
      'HOSPITAL_NOT_APPROVED'
    );
  }

  const affiliation = await DoctorHospitalAffiliation.findOne({
    doctor: doctor._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });

  const assignment = await DoctorPatientAssignment.findOne({
    doctor: doctor._id,
    patient: record.patient,
    hospital: hospital._id,
    status: 'ACTIVE',
  });

  verifyDoctorCanUpdateRecord({
    user,
    doctor,
    hospital,
    affiliation,
    assignment,
    record,
  });

  // Block any attempt to change protected ownership/identity fields
  const forbiddenFields = [
    'patient',
    'patientId',
    'hospital',
    'hospitalId',
    'doctor',
    'doctorId',
    'recordType',
    '_id',
    'id',
  ];

  for (const field of forbiddenFields) {
    if (updateData[field] !== undefined) {
      throw new BadRequestError(
        `Field '${field}' is immutable and cannot be modified`,
        'FIELD_IMMUTABLE'
      );
    }
    if (updateData.content && updateData.content[field] !== undefined) {
      throw new BadRequestError(
        `Field '${field}' inside content is immutable and cannot be modified`,
        'FIELD_IMMUTABLE'
      );
    }
  }

  if (updateData.recordDate) {
    record.recordDate = updateData.recordDate;
  }

  if (updateData.content) {
    const validator = contentSchemasByType[record.recordType];
    if (validator) {
      const result = validator.safeParse(updateData.content);
      if (!result.success) {
        throw new ValidationError('Invalid update content for record type', result.error.errors);
      }
      Object.assign(record, result.data);
    } else {
      Object.assign(record, updateData.content);
    }
  }

  await record.save();

  return await MedicalRecord.findById(record._id).populate(medicalRecordPopulation);
};

module.exports = {
  createMedicalRecord,
  getMedicalRecordById,
  listPatientMedicalRecords,
  updateMedicalRecord,
};
