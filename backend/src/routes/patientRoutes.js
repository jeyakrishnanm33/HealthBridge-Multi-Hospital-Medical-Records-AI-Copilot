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

const router = express.Router();

// All patient endpoints require authentication and PATIENT role
router.use(authenticate);
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
