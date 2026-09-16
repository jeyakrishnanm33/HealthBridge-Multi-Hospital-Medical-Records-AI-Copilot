const { z } = require('zod');
const { commonValidators } = require('./index');

const createAssignmentSchema = z
  .object({
    doctorId: commonValidators.objectId,
    patientId: commonValidators.objectId,
    hospitalId: commonValidators.objectId,
    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

const assignmentIdParamSchema = z.object({
  id: commonValidators.objectId,
});

const listAssignmentsQuerySchema = z.object({
  hospitalId: commonValidators.objectId.optional(),
  doctorId: commonValidators.objectId.optional(),
  patientId: commonValidators.objectId.optional(),
  status: z.enum(['ACTIVE', 'ENDED', 'ALL']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

module.exports = {
  createAssignmentSchema,
  assignmentIdParamSchema,
  listAssignmentsQuerySchema,
};
