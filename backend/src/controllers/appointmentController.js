const appointmentService = require('../services/appointmentService');

const createAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.createAppointment({
      doctorId: req.body.doctorId,
      patientId: req.body.patientId,
      hospitalId: req.body.hospitalId,
      appointmentDate: req.body.appointmentDate,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      reason: req.body.reason,
      notes: req.body.notes,
      user: req.user,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

const listAppointments = async (req, res, next) => {
  try {
    const result = await appointmentService.listAppointments({
      query: req.query,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await appointmentService.getAppointmentById({
      appointmentId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

const confirmAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.confirmAppointment({
      appointmentId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment confirmed successfully',
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

const rejectAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.rejectAppointment({
      appointmentId: req.params.id,
      rejectionReason: req.body.rejectionReason,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rejected',
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.cancelAppointment({
      appointmentId: req.params.id,
      cancellationReason: req.body.cancellationReason,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

const rescheduleAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.rescheduleAppointment({
      appointmentId: req.params.id,
      appointmentDate: req.body.appointmentDate,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      reason: req.body.reason,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

const completeAppointment = async (req, res, next) => {
  try {
    const appointment = await appointmentService.completeAppointment({
      appointmentId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment completed successfully',
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

const markAppointmentNoShow = async (req, res, next) => {
  try {
    const appointment = await appointmentService.markAppointmentNoShow({
      appointmentId: req.params.id,
      user: req.user,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment marked as no-show',
      data: { appointment },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAppointment,
  listAppointments,
  getAppointmentById,
  confirmAppointment,
  rejectAppointment,
  cancelAppointment,
  rescheduleAppointment,
  completeAppointment,
  markAppointmentNoShow,
};
