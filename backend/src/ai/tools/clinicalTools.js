/**
 * Clinical Data Retrieval Tools
 * Read-only Mongoose queries for structured clinical data
 */
const { MedicalRecord } = require('../../models/MedicalRecord');
const { VisitRecord } = require('../../models/VisitRecord');
const { DiagnosisRecord } = require('../../models/DiagnosisRecord');
const { MedicationRecord } = require('../../models/MedicationRecord');
const { LabResultRecord } = require('../../models/LabResultRecord');
const { PrescriptionRecord } = require('../../models/PrescriptionRecord');
const { DocumentRecord } = require('../../models/DocumentRecord');
const { TOOL_SCOPE_MAP } = require('../../policies/clinicalToolPolicy');

const standardPopulate = [
  {
    path: 'doctor',
    select: 'fullName specialization medicalLicenseNumber status',
  },
  {
    path: 'patient',
    select: 'patientId gender dateOfBirth bloodGroup status',
  },
  {
    path: 'hospital',
    select: 'name hospitalCode status address contactEmail contactPhone',
  },
];

/**
 * Clean and normalize record output
 */
const sanitizeRecord = (doc) => {
  if (!doc) return null;
  const raw = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, ...rest } = raw;
  return {
    id: _id ? _id.toString() : raw.id,
    ...rest,
  };
};

/**
 * Retrieve recent visits for a patient
 */
const getRecentVisits = async ({ patientId, limit = 5 }, authContext = {}) => {
  const query = { patient: patientId, recordType: 'VISIT' };
  const records = await VisitRecord.find(query)
    .sort({ recordDate: -1 })
    .limit(limit)
    .populate(standardPopulate)
    .lean();

  return records.map(sanitizeRecord);
};

/**
 * Retrieve diagnoses for a patient
 */
const getDiagnoses = async ({ patientId, status, limit = 10 }, authContext = {}) => {
  const query = { patient: patientId, recordType: 'DIAGNOSIS' };
  if (status) {
    query.status = status;
  }

  const records = await DiagnosisRecord.find(query)
    .sort({ recordDate: -1 })
    .limit(limit)
    .populate(standardPopulate)
    .lean();

  return records.map(sanitizeRecord);
};

/**
 * Retrieve medications for a patient
 */
const getMedications = async ({ patientId, status, limit = 10 }, authContext = {}) => {
  const query = { patient: patientId, recordType: 'MEDICATION' };
  if (status) {
    query.status = status;
  }

  const records = await MedicationRecord.find(query)
    .sort({ recordDate: -1 })
    .limit(limit)
    .populate(standardPopulate)
    .lean();

  return records.map(sanitizeRecord);
};

/**
 * Retrieve lab results for a patient
 */
const getLabResults = async ({ patientId, testName, interpretation, limit = 10 }, authContext = {}) => {
  const query = { patient: patientId, recordType: 'LAB_RESULT' };
  if (testName) {
    query.testName = { $regex: testName, $options: 'i' };
  }
  if (interpretation) {
    query.interpretation = interpretation;
  }

  const records = await LabResultRecord.find(query)
    .sort({ recordDate: -1 })
    .limit(limit)
    .populate(standardPopulate)
    .lean();

  return records.map(sanitizeRecord);
};

/**
 * Retrieve prescriptions for a patient
 */
const getPrescriptions = async ({ patientId, status, limit = 10 }, authContext = {}) => {
  const query = { patient: patientId, recordType: 'PRESCRIPTION' };
  if (status) {
    query.status = status;
  }

  const records = await PrescriptionRecord.find(query)
    .sort({ recordDate: -1 })
    .limit(limit)
    .populate(standardPopulate)
    .lean();

  return records.map(sanitizeRecord);
};

/**
 * Retrieve chronological clinical timeline for a patient
 */
const getClinicalTimeline = async (
  { patientId, startDate, endDate, recordTypes, limit = 20 },
  authContext = {}
) => {
  const query = { patient: patientId };

  if (startDate || endDate) {
    query.recordDate = {};
    if (startDate) query.recordDate.$gte = new Date(startDate);
    if (endDate) query.recordDate.$lte = new Date(endDate);
  }

  // Determine allowed record types from user request and consent boundaries
  let effectiveTypes = recordTypes;
  if (authContext.allowedScopes && authContext.allowedScopes.length > 0) {
    const consentAllowedTypes = authContext.allowedScopes.map((s) => TOOL_SCOPE_MAP[s]).filter(Boolean);
    if (effectiveTypes && effectiveTypes.length > 0) {
      effectiveTypes = effectiveTypes.filter((t) => consentAllowedTypes.includes(t));
    } else {
      effectiveTypes = consentAllowedTypes;
    }
  }

  if (effectiveTypes && effectiveTypes.length > 0) {
    query.recordType = { $in: effectiveTypes };
  }

  const records = await MedicalRecord.find(query)
    .sort({ recordDate: -1 })
    .limit(limit)
    .populate(standardPopulate)
    .lean();

  return records.map(sanitizeRecord);
};

module.exports = {
  getRecentVisits,
  getDiagnoses,
  getMedications,
  getLabResults,
  getPrescriptions,
  getClinicalTimeline,
};
