const { z } = require('zod');
const { commonValidators } = require('./index');
const { AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES, AUDIT_RESULTS } = require('../models/AuditLog');

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.enum(AUDIT_ACTIONS).optional(),
  resourceType: z.enum(AUDIT_RESOURCE_TYPES).optional(),
  result: z.enum(AUDIT_RESULTS).optional(),
  hospitalId: commonValidators.objectId.optional(),
  patientId: commonValidators.objectId.optional(),
  actorId: commonValidators.objectId.optional(),
  resourceId: z.string().max(100).optional(),
  requestId: z.string().max(100).optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

const auditIdParamSchema = z.object({
  id: commonValidators.objectId,
});

module.exports = {
  auditQuerySchema,
  auditIdParamSchema,
};
