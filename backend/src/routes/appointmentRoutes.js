const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const authenticate = require('../middleware/authenticate');
const { requireRoles } = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  createAppointmentSchema,
  appointmentIdParamSchema,
  listAppointmentsQuerySchema,
  cancelAppointmentSchema,
  rejectAppointmentSchema,
  rescheduleAppointmentSchema,
} = require('../validators/appointmentValidators');

const router = express.Router();

// All appointment endpoints require authentication
router.use(authenticate);

// Create Appointment (all authenticated roles)
router.post(
  '/',
  validate({ body: createAppointmentSchema }),
  appointmentController.createAppointment
);

// List Appointments (role-scoped internally)
router.get(
  '/',
  validate({ query: listAppointmentsQuerySchema }),
  appointmentController.listAppointments
);

// Get Appointment by ID
router.get(
  '/:id',
  validate({ params: appointmentIdParamSchema }),
  appointmentController.getAppointmentById
);

// Confirm Appointment (Doctor, Hospital Admin, System Admin)
router.patch(
  '/:id/confirm',
  requireRoles('DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: appointmentIdParamSchema }),
  appointmentController.confirmAppointment
);

// Reject Appointment (Doctor, Hospital Admin, System Admin)
router.patch(
  '/:id/reject',
  requireRoles('DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: appointmentIdParamSchema, body: rejectAppointmentSchema }),
  appointmentController.rejectAppointment
);

// Cancel Appointment (all authenticated roles)
router.patch(
  '/:id/cancel',
  validate({ params: appointmentIdParamSchema, body: cancelAppointmentSchema }),
  appointmentController.cancelAppointment
);

// Reschedule Appointment (all authenticated roles)
router.patch(
  '/:id/reschedule',
  validate({ params: appointmentIdParamSchema, body: rescheduleAppointmentSchema }),
  appointmentController.rescheduleAppointment
);

// Complete Appointment (Doctor, Hospital Admin, System Admin)
router.patch(
  '/:id/complete',
  requireRoles('DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: appointmentIdParamSchema }),
  appointmentController.completeAppointment
);

// Mark Appointment as No-Show (Doctor, Hospital Admin, System Admin)
router.patch(
  '/:id/no-show',
  requireRoles('DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  validate({ params: appointmentIdParamSchema }),
  appointmentController.markAppointmentNoShow
);

module.exports = router;
