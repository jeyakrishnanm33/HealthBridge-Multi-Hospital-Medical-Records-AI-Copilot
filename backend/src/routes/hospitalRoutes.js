const express = require('express');
const hospitalController = require('../controllers/hospitalController');
const patientController = require('../controllers/patientController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const doctorController = require('../controllers/doctorController');
const {
  createHospitalSchema,
  updateHospitalStatusSchema,
  hospitalIdParamSchema,
} = require('../validators/hospitalValidators');
const {
  hospitalIdParamSchema: membershipHospitalIdParamSchema,
  membershipStatusParamsSchema,
  updateMembershipStatusSchema,
} = require('../validators/patientValidators');
const {
  hospitalIdParamSchema: doctorHospitalIdParamSchema,
  affiliationStatusParamsSchema,
  updateAffiliationStatusSchema,
} = require('../validators/doctorValidators');

const router = express.Router();

router.post(
  '/',
  authenticate,
  validate({ body: createHospitalSchema }),
  hospitalController.createHospital
);

router.get('/', hospitalController.getHospitals);

router.get(
  '/:id',
  validate({ params: hospitalIdParamSchema }),
  hospitalController.getHospitalById
);

router.patch(
  '/:id/status',
  authenticate,
  requireRoles('SYSTEM_ADMIN'),
  validate({ params: hospitalIdParamSchema, body: updateHospitalStatusSchema }),
  hospitalController.updateHospitalStatus
);

// Hospital Memberships Management (Hospital Admin & System Admin)
router.get(
  '/:hospitalId/memberships',
  authenticate,
  requireRoles('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: membershipHospitalIdParamSchema }),
  patientController.getHospitalMemberships
);

router.patch(
  '/:hospitalId/memberships/:membershipId/status',
  authenticate,
  requireRoles('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({
    params: membershipStatusParamsSchema,
    body: updateMembershipStatusSchema,
  }),
  patientController.updateMembershipStatus
);

// Hospital Doctor Affiliations Management (Hospital Admin & System Admin)
router.get(
  '/:hospitalId/doctors',
  authenticate,
  requireRoles('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: doctorHospitalIdParamSchema }),
  doctorController.getHospitalDoctors
);

router.patch(
  '/:hospitalId/doctors/:affiliationId/status',
  authenticate,
  requireRoles('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({
    params: affiliationStatusParamsSchema,
    body: updateAffiliationStatusSchema,
  }),
  doctorController.updateDoctorAffiliationStatus
);

module.exports = router;


