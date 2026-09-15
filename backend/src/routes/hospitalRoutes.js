const express = require('express');
const hospitalController = require('../controllers/hospitalController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createHospitalSchema,
  updateHospitalStatusSchema,
  hospitalIdParamSchema,
} = require('../validators/hospitalValidators');

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

module.exports = router;
