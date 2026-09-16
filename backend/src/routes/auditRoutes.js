const express = require('express');
const auditController = require('../controllers/auditController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { auditQuerySchema, auditIdParamSchema } = require('../validators/auditValidators');

const router = express.Router();

// Read-only audit access restricted to authenticated administrators
router.use(authenticate);
router.use(requireRoles('SYSTEM_ADMIN', 'HOSPITAL_ADMIN'));

// GET /api/audit-logs - List audit logs (tenant-scoped)
router.get('/', validate({ query: auditQuerySchema }), auditController.listAuditLogs);

// GET /api/audit-logs/:id - Get audit log by ID
router.get('/:id', validate({ params: auditIdParamSchema }), auditController.getAuditLogById);

module.exports = router;
