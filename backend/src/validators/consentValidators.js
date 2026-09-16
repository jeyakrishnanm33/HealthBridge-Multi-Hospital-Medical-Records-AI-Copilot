const { z } = require('zod');
const { commonValidators } = require('./index');

const consentIdParamSchema = z.object({
  id: commonValidators.objectId,
});

const revokeConsentSchema = z
  .object({
    reason: z.string().trim().max(500).optional().default(''),
  })
  .strict();

const listConsentsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'REVOKED', 'EXPIRED', 'ALL']).optional(),
  patientId: commonValidators.objectId.optional(),
  doctorId: commonValidators.objectId.optional(),
  hospitalId: commonValidators.objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = {
  consentIdParamSchema,
  revokeConsentSchema,
  listConsentsQuerySchema,
};
