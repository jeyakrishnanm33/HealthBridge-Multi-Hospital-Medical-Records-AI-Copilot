/**
 * Validation schemas for semantic clinical search endpoints.
 */
const { z } = require('zod');
const { RECORD_TYPES } = require('../models/MedicalRecord');

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const searchClinicalSchema = z.object({
  query: z
    .string({ required_error: 'Search query is required' })
    .trim()
    .min(1, 'Search query cannot be empty')
    .max(500, 'Search query cannot exceed 500 characters'),
  patientId: z
    .string()
    .regex(objectIdRegex, 'Invalid patientId format')
    .optional(),
  hospitalId: z
    .string()
    .regex(objectIdRegex, 'Invalid hospitalId format')
    .optional(),
  recordTypes: z
    .array(z.enum(RECORD_TYPES, { errorMap: () => ({ message: 'Invalid record type in filter' }) }))
    .optional(),
  fromDate: z
    .string()
    .datetime({ offset: true, message: 'fromDate must be a valid ISO-8601 date string' })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fromDate must be YYYY-MM-DD or ISO-8601').optional()),
  toDate: z
    .string()
    .datetime({ offset: true, message: 'toDate must be a valid ISO-8601 date string' })
    .optional()
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD or ISO-8601').optional()),
  limit: z
    .coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10),
});

module.exports = {
  searchClinicalSchema,
};
