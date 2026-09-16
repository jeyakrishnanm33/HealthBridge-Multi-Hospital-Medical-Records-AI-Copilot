const { z } = require('zod');
const { commonValidators } = require('./index');
const {
  ACCESS_REQUEST_SCOPES,
  ACCESS_REQUEST_PURPOSES,
  ACCESS_REQUEST_STATUSES,
} = require('../models/AccessRequest');

const createAccessRequestSchema = z
  .object({
    patientId: commonValidators.objectId,
    sourceHospitalId: commonValidators.objectId,
    requestingHospitalId: commonValidators.objectId,
    requestedScopes: z
      .array(z.enum(ACCESS_REQUEST_SCOPES, {
        errorMap: () => ({ message: 'Invalid requested scope' }),
      }))
      .min(1, 'At least one clinical scope must be requested')
      .max(6, 'Maximum 6 scopes permitted'),
    purpose: z.enum(ACCESS_REQUEST_PURPOSES).optional().default('TREATMENT'),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

const approveAccessRequestSchema = z
  .object({
    expiresAt: z
      .coerce
      .date()
      .refine((date) => date.getTime() > Date.now(), {
        message: 'Consent expiration must be a future timestamp',
      }),
    scopes: z
      .array(z.enum(ACCESS_REQUEST_SCOPES))
      .min(1, 'At least one clinical scope must be granted')
      .optional(),
  })
  .strict();

const denyAccessRequestSchema = z
  .object({
    reason: z.string().trim().max(500).optional().default(''),
  })
  .strict();

const cancelAccessRequestSchema = z
  .object({
    reason: z.string().trim().max(500).optional().default(''),
  })
  .strict();

const accessRequestIdParamSchema = z.object({
  id: commonValidators.objectId,
});

const listAccessRequestsQuerySchema = z.object({
  status: z.enum([...ACCESS_REQUEST_STATUSES, 'ALL']).optional(),
  hospitalId: commonValidators.objectId.optional(),
  doctorId: commonValidators.objectId.optional(),
  patientId: commonValidators.objectId.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = {
  createAccessRequestSchema,
  approveAccessRequestSchema,
  denyAccessRequestSchema,
  cancelAccessRequestSchema,
  accessRequestIdParamSchema,
  listAccessRequestsQuerySchema,
};
