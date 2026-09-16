const express = require('express');
const accessRequestController = require('../controllers/accessRequestController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createAccessRequestSchema,
  approveAccessRequestSchema,
  denyAccessRequestSchema,
  cancelAccessRequestSchema,
  accessRequestIdParamSchema,
  listAccessRequestsQuerySchema,
} = require('../validators/accessRequestValidators');

const router = express.Router();

router.use(authenticate);

// Create Access Request (Doctors only)
router.post(
  '/',
  requireRoles('DOCTOR'),
  validate({ body: createAccessRequestSchema }),
  accessRequestController.createAccessRequest
);

// List Access Requests (Doctor, Patient, Hospital Admin, System Admin)
router.get(
  '/',
  requireRoles('DOCTOR', 'PATIENT', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ query: listAccessRequestsQuerySchema }),
  accessRequestController.listAccessRequests
);

// Get Access Request by ID
router.get(
  '/:id',
  requireRoles('DOCTOR', 'PATIENT', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: accessRequestIdParamSchema }),
  accessRequestController.getAccessRequestById
);

// Approve Access Request (Patients only)
router.patch(
  '/:id/approve',
  requireRoles('PATIENT'),
  validate({ params: accessRequestIdParamSchema, body: approveAccessRequestSchema }),
  accessRequestController.approveAccessRequest
);

// Deny Access Request (Patients only)
router.patch(
  '/:id/deny',
  requireRoles('PATIENT'),
  validate({ params: accessRequestIdParamSchema, body: denyAccessRequestSchema }),
  accessRequestController.denyAccessRequest
);

// Cancel Access Request (Doctors only)
router.patch(
  '/:id/cancel',
  requireRoles('DOCTOR'),
  validate({ params: accessRequestIdParamSchema, body: cancelAccessRequestSchema }),
  accessRequestController.cancelAccessRequest
);

module.exports = router;
