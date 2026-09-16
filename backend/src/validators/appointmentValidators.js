const { z } = require('zod');
const { commonValidators } = require('./index');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const createAppointmentSchema = z
  .object({
    doctorId: commonValidators.objectId,
    patientId: commonValidators.objectId,
    hospitalId: commonValidators.objectId,
    appointmentDate: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'Invalid appointment date format' }
    ),
    startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm format (24-hour)'),
    endTime: z.string().regex(timeRegex, 'End time must be in HH:mm format (24-hour)'),
    reason: z
      .string()
      .trim()
      .max(500, 'Reason cannot exceed 500 characters')
      .optional()
      .default(''),
    notes: z
      .string()
      .trim()
      .max(500, 'Notes cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

const appointmentIdParamSchema = z.object({
  id: commonValidators.objectId,
});

const listAppointmentsQuerySchema = z.object({
  hospitalId: commonValidators.objectId.optional(),
  doctorId: commonValidators.objectId.optional(),
  patientId: commonValidators.objectId.optional(),
  status: z
    .enum([
      'REQUESTED',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED',
      'REJECTED',
      'NO_SHOW',
      'ALL',
    ])
    .optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  upcoming: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const cancelAppointmentSchema = z
  .object({
    cancellationReason: z
      .string()
      .trim()
      .max(500, 'Cancellation reason cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

const rejectAppointmentSchema = z
  .object({
    rejectionReason: z
      .string()
      .trim()
      .max(500, 'Rejection reason cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

const rescheduleAppointmentSchema = z
  .object({
    appointmentDate: z.string().refine(
      (val) => !isNaN(Date.parse(val)),
      { message: 'Invalid appointment date format' }
    ),
    startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm format (24-hour)'),
    endTime: z.string().regex(timeRegex, 'End time must be in HH:mm format (24-hour)'),
    reason: z
      .string()
      .trim()
      .max(500, 'Reason cannot exceed 500 characters')
      .optional()
      .default(''),
  })
  .strict();

module.exports = {
  createAppointmentSchema,
  appointmentIdParamSchema,
  listAppointmentsQuerySchema,
  cancelAppointmentSchema,
  rejectAppointmentSchema,
  rescheduleAppointmentSchema,
};
