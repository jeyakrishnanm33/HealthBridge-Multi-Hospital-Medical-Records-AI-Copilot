const express = require('express');
const medicalRecordController = require('../controllers/medicalRecordController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createRecordSchema,
  updateRecordSchema,
  recordIdParamSchema,
  patientRecordsQuerySchema,
} = require('../validators/medicalRecordValidators');
const { commonValidators } = require('../validators');
const { z } = require('zod');

const patientIdParamSchema = z.object({
  patientId: commonValidators.objectId,
});

const router = express.Router();

// All medical record endpoints require authentication
router.use(authenticate);

// Create Medical Record (Active Doctors only)
router.post(
  '/',
  requireRoles('DOCTOR'),
  validate({ body: createRecordSchema }),
  medicalRecordController.createMedicalRecord
);

// Get Medical Record by ID (Patient self or authorized Doctor)
router.get(
  '/:id',
  validate({ params: recordIdParamSchema }),
  medicalRecordController.getMedicalRecordById
);

// List Medical Records for a Patient (Patient self or assigned Doctor)
router.get(
  '/patient/:patientId',
  validate({ params: patientIdParamSchema, query: patientRecordsQuerySchema }),
  medicalRecordController.listPatientMedicalRecords
);

// Update Medical Record (Authorized Doctor only)
router.patch(
  '/:id',
  requireRoles('DOCTOR'),
  validate({ params: recordIdParamSchema, body: updateRecordSchema }),
  medicalRecordController.updateMedicalRecord
);

module.exports = router;
