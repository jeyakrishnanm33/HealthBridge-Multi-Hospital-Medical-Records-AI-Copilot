const medicalRecordService = require('../services/medicalRecordService');

/**
 * Controller: Create a medical record.
 * POST /api/records
 */
const createMedicalRecord = async (req, res, next) => {
  try {
    const record = await medicalRecordService.createMedicalRecord({
      user: req.user,
      patientId: req.body.patientId,
      hospitalId: req.body.hospitalId,
      recordType: req.body.recordType,
      recordDate: req.body.recordDate,
      content: req.body.content,
    });

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: { record },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get a single medical record by ID.
 * GET /api/records/:id
 */
const getMedicalRecordById = async (req, res, next) => {
  try {
    const record = await medicalRecordService.getMedicalRecordById({
      recordId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: { record },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: List medical records for a patient.
 * GET /api/patients/:id/records or GET /api/records/patient/:patientId
 */
const listPatientMedicalRecords = async (req, res, next) => {
  try {
    const patientId = req.params.patientId || req.params.id;
    const result = await medicalRecordService.listPatientMedicalRecords({
      patientId,
      user: req.user,
      query: req.query,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Update an existing medical record.
 * PATCH /api/records/:id
 */
const updateMedicalRecord = async (req, res, next) => {
  try {
    const record = await medicalRecordService.updateMedicalRecord({
      recordId: req.params.id,
      user: req.user,
      updateData: req.body,
    });

    res.status(200).json({
      success: true,
      message: 'Medical record updated successfully',
      data: { record },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMedicalRecord,
  getMedicalRecordById,
  listPatientMedicalRecords,
  updateMedicalRecord,
};
