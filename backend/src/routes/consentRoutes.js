const express = require('express');
const consentController = require('../controllers/consentController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  consentIdParamSchema,
  revokeConsentSchema,
  listConsentsQuerySchema,
} = require('../validators/consentValidators');

const router = express.Router();

router.use(authenticate);

// List Consents
router.get(
  '/',
  requireRoles('PATIENT', 'DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ query: listConsentsQuerySchema }),
  consentController.listConsents
);

// Get Consent by ID
router.get(
  '/:id',
  requireRoles('PATIENT', 'DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: consentIdParamSchema }),
  consentController.getConsentById
);

// Revoke Consent (Patients only)
router.patch(
  '/:id/revoke',
  requireRoles('PATIENT'),
  validate({ params: consentIdParamSchema, body: revokeConsentSchema }),
  consentController.revokeConsent
);

module.exports = router;
