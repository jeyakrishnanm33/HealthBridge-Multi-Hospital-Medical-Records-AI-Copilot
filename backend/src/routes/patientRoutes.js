const express = require('express');
const patientController = require('../controllers/patientController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createPatientProfileSchema,
  updatePatientProfileSchema,
  hospitalIdParamSchema,
} = require('../validators/patientValidators');

const medicalRecordController = require('../controllers/medicalRecordController');
const { patientRecordsQuerySchema } = require('../validators/medicalRecordValidators');
const { commonValidators } = require('../validators');
const { z } = require('zod');

const patientIdParamSchema = z.object({
  id: commonValidators.objectId,
});

const router = express.Router();

// All patient endpoints require authentication
router.use(authenticate);

// Patient Medical Records (accessible by authorized DOCTOR or patient themselves)
router.get(
  '/:id/records',
  validate({ params: patientIdParamSchema, query: patientRecordsQuerySchema }),
  medicalRecordController.listPatientMedicalRecords
);

// Patient-only profile & hospital membership routes
router.use(requireRoles('PATIENT'));

// Patient Profile
router.post(
  '/profile',
  validate({ body: createPatientProfileSchema }),
  patientController.createProfile
);

router.get('/me', patientController.getMyProfile);

router.patch(
  '/me',
  validate({ body: updatePatientProfileSchema }),
  patientController.updateMyProfile
);

// Patient Hospital Memberships
router.get('/me/hospitals', patientController.getMyHospitalMemberships);

router.post(
  '/me/hospitals/:hospitalId/membership',
  validate({ params: hospitalIdParamSchema }),
  patientController.requestHospitalMembership
);

module.exports = router;
