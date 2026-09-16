const { z } = require('zod');
const { commonValidators } = require('./index');

const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']);

const createDoctorProfileSchema = z
  .object({
    fullName: z
      .string({ required_error: 'Full name is required' })
      .trim()
      .min(1, 'Full name is required')
      .max(100, 'Full name cannot exceed 100 characters'),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .min(7, 'Phone number must be at least 7 characters')
      .max(20, 'Phone number cannot exceed 20 characters'),
    gender: genderEnum,
    dateOfBirth: z
      .string({ required_error: 'Date of birth is required' })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for dateOfBirth',
      }),
    medicalLicenseNumber: z
      .string({ required_error: 'Medical license number is required' })
      .trim()
      .min(3, 'Medical license number must be at least 3 characters')
      .max(50, 'Medical license number cannot exceed 50 characters')
      .transform((val) => val.toUpperCase()),
    specialization: z
      .string({ required_error: 'Specialization is required' })
      .trim()
      .min(1, 'Specialization is required')
      .max(100, 'Specialization cannot exceed 100 characters'),
    qualifications: z
      .array(z.string().trim().min(1, 'Qualification cannot be empty'), {
        required_error: 'Qualifications are required',
      })
      .min(1, 'At least one qualification is required'),
    yearsOfExperience: z
      .number({ invalid_type_error: 'Years of experience must be a number' })
      .int('Years of experience must be an integer')
      .min(0, 'Years of experience cannot be negative')
      .optional()
      .default(0),
  })
  .strict();

const updateDoctorProfileSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .min(7, 'Phone number must be at least 7 characters')
      .max(20, 'Phone number cannot exceed 20 characters')
      .optional(),
    specialization: z
      .string()
      .trim()
      .min(1, 'Specialization cannot be empty')
      .max(100, 'Specialization cannot exceed 100 characters')
      .optional(),
    qualifications: z
      .array(z.string().trim().min(1, 'Qualification cannot be empty'))
      .min(1, 'At least one qualification is required')
      .optional(),
    yearsOfExperience: z
      .number({ invalid_type_error: 'Years of experience must be a number' })
      .int('Years of experience must be an integer')
      .min(0, 'Years of experience cannot be negative')
      .optional(),
  })
  .strict();

const requestAffiliationSchema = z
  .object({
    department: z.string().trim().max(100).optional().default(''),
  })
  .strict()
  .optional();

const updateAffiliationStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'REJECTED', 'SUSPENDED'], {
      errorMap: () => ({ message: 'Status must be one of: ACTIVE, REJECTED, SUSPENDED' }),
    }),
  })
  .strict();

const hospitalIdParamSchema = z.object({
  hospitalId: commonValidators.objectId,
});

const affiliationStatusParamsSchema = z.object({
  hospitalId: commonValidators.objectId,
  affiliationId: commonValidators.objectId,
});

module.exports = {
  createDoctorProfileSchema,
  updateDoctorProfileSchema,
  requestAffiliationSchema,
  updateAffiliationStatusSchema,
  hospitalIdParamSchema,
  affiliationStatusParamsSchema,
};
