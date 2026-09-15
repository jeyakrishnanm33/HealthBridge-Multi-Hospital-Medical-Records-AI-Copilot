const { z } = require('zod');
const { commonValidators } = require('./index');

const createHospitalSchema = z.object({
  name: z
    .string({ required_error: 'Hospital name is required' })
    .trim()
    .min(2, 'Hospital name must be at least 2 characters')
    .max(150, 'Hospital name cannot exceed 150 characters'),
  hospitalCode: z
    .string()
    .trim()
    .min(3, 'Hospital code must be at least 3 characters')
    .max(20, 'Hospital code cannot exceed 20 characters')
    .regex(/^[A-Za-z0-9_-]+$/, 'Hospital code must only contain alphanumeric characters, underscores, or hyphens')
    .transform((val) => val.toUpperCase())
    .optional(),
  address: z.object({
    street: z.string().trim().optional().default(''),
    city: z.string({ required_error: 'City is required' }).trim().min(2, 'City is required'),
    state: z.string({ required_error: 'State is required' }).trim().min(2, 'State is required'),
    postalCode: z.string().trim().optional().default(''),
    country: z.string().trim().default('India'),
  }),
  contactEmail: z
    .string({ required_error: 'Contact email is required' })
    .trim()
    .email('Invalid contact email format')
    .toLowerCase(),
  contactPhone: z
    .string({ required_error: 'Contact phone is required' })
    .trim()
    .min(7, 'Contact phone must be at least 7 digits')
    .max(20, 'Contact phone cannot exceed 20 characters'),
});

const updateHospitalStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED'], {
    errorMap: () => ({ message: 'Status must be one of: APPROVED, REJECTED, SUSPENDED' }),
  }),
});

const hospitalIdParamSchema = z.object({
  id: commonValidators.objectId,
});

module.exports = {
  createHospitalSchema,
  updateHospitalStatusSchema,
  hospitalIdParamSchema,
};
