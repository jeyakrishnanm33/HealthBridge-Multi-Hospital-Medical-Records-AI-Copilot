const { z } = require('zod');

// Public self-registration allowed roles (prevents administrative privilege escalation)
const ALLOWED_SELF_REGISTRATION_ROLES = ['PATIENT', 'DOCTOR'];

const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  role: z
    .enum(['PATIENT', 'DOCTOR', 'SYSTEM_ADMIN', 'HOSPITAL_ADMIN'], {
      errorMap: () => ({ message: 'Invalid role specified' }),
    })
    .optional()
    .default('PATIENT')
    .refine((val) => ALLOWED_SELF_REGISTRATION_ROLES.includes(val), {
      message: 'Administrative roles (SYSTEM_ADMIN, HOSPITAL_ADMIN) cannot be self-registered publicly',
    }),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
  ALLOWED_SELF_REGISTRATION_ROLES,
};
