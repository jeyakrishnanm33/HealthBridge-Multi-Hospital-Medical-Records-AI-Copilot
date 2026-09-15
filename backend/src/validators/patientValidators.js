const { z } = require('zod');
const { commonValidators } = require('./index');

const bloodGroupEnum = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER']);

const addressSchema = z.object({
  street: z.string().trim().optional().default(''),
  city: z.string({ required_error: 'City is required' }).trim().min(1, 'City is required'),
  state: z.string({ required_error: 'State is required' }).trim().min(1, 'State is required'),
  postalCode: z.string().trim().optional().default(''),
  country: z.string().trim().optional().default('India'),
});

const emergencyContactSchema = z.object({
  name: z.string().trim().optional().default(''),
  relationship: z.string().trim().optional().default(''),
  phone: z.string().trim().optional().default(''),
});

const createPatientProfileSchema = z
  .object({
    dateOfBirth: z
      .string({ required_error: 'Date of birth is required' })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for dateOfBirth',
      }),
    gender: genderEnum,
    bloodGroup: bloodGroupEnum.optional().nullable(),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .min(7, 'Phone number must be at least 7 characters')
      .max(20, 'Phone number cannot exceed 20 characters'),
    address: addressSchema,
    emergencyContact: emergencyContactSchema.optional(),
  })
  .strict();

const updatePatientProfileSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .min(7, 'Phone number must be at least 7 characters')
      .max(20, 'Phone number cannot exceed 20 characters')
      .optional(),
    bloodGroup: bloodGroupEnum.optional().nullable(),
    address: addressSchema.partial().optional(),
    emergencyContact: emergencyContactSchema.partial().optional(),
  })
  .strict();

const updateMembershipStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED', 'INACTIVE'], {
    errorMap: () => ({ message: 'Status must be one of: ACTIVE, REJECTED, INACTIVE' }),
  }),
});

const hospitalIdParamSchema = z.object({
  hospitalId: commonValidators.objectId,
});

const membershipStatusParamsSchema = z.object({
  hospitalId: commonValidators.objectId,
  membershipId: commonValidators.objectId,
});

module.exports = {
  createPatientProfileSchema,
  updatePatientProfileSchema,
  updateMembershipStatusSchema,
  hospitalIdParamSchema,
  membershipStatusParamsSchema,
};
