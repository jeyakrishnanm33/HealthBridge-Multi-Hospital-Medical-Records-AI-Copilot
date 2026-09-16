const express = require('express');
const doctorController = require('../controllers/doctorController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createDoctorProfileSchema,
  updateDoctorProfileSchema,
  requestAffiliationSchema,
  hospitalIdParamSchema,
} = require('../validators/doctorValidators');

const router = express.Router();

// All doctor endpoints require authentication and DOCTOR role
router.use(authenticate);
router.use(requireRoles('DOCTOR'));

// Doctor Profile
router.post(
  '/profile',
  validate({ body: createDoctorProfileSchema }),
  doctorController.createProfile
);

router.get('/me', doctorController.getMyProfile);

router.patch(
  '/me',
  validate({ body: updateDoctorProfileSchema }),
  doctorController.updateMyProfile
);

// Doctor Hospital Affiliations
router.get('/me/hospitals', doctorController.getMyHospitalAffiliations);

router.post(
  '/me/hospitals/:hospitalId/affiliation',
  validate({ params: hospitalIdParamSchema, body: requestAffiliationSchema }),
  doctorController.requestHospitalAffiliation
);

module.exports = router;
