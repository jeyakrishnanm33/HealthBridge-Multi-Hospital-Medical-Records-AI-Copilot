const express = require('express');
const hospitalController = require('../controllers/hospitalController');
const patientController = require('../controllers/patientController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
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

module.exports = router;

