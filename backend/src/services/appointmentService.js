const { Appointment, VALID_TRANSITIONS } = require('../models/Appointment');
const { Doctor } = require('../models/Doctor');
const { Patient } = require('../models/Patient');
const { Hospital } = require('../models/Hospital');
const { DoctorHospitalAffiliation } = require('../models/DoctorHospitalAffiliation');
const { PatientHospitalMembership } = require('../models/PatientHospitalMembership');
const { DoctorPatientAssignment } = require('../models/DoctorPatientAssignment');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../errors/AppError');
const {
  verifyHospitalAppointmentAuthority,
  verifyAppointmentReadAccess,
  verifyAppointmentWriteAccess,
  TERMINAL_STATUSES,
} = require('../policies/appointmentPolicy');
const auditService = require('./auditService');
const { DOMAIN_EVENTS, publishDomainEvent } = require('../utils/domainEvents');

/**
 * Standard Mongoose population options for Appointment documents.
 */
const appointmentPopulation = [
  {
    path: 'doctor',
    select: 'fullName specialization medicalLicenseNumber yearsOfExperience status',
    populate: { path: 'user', select: 'name email role' },
  },
  {
    path: 'patient',
    select: 'patientId gender dateOfBirth bloodGroup status',
    populate: { path: 'user', select: 'name email' },
  },
  {
    path: 'hospital',
    select: 'name hospitalCode status address contactEmail contactPhone admin registeredBy',
  },
  { path: 'createdBy', select: 'name email role' },
  { path: 'confirmedBy', select: 'name email role' },
  { path: 'cancelledBy', select: 'name email role' },
  { path: 'completedBy', select: 'name email role' },
  { path: 'rejectedBy', select: 'name email role' },
];

/**
 * Resolves a doctor profile for the current user.
 */
const resolveDoctorProfile = async (user) => {
  if (user.role === 'DOCTOR') {
    return await Doctor.findOne({ user: user.id || user._id });
  }
  return null;
};

/**
 * Resolves a patient profile for the current user.
 */
const resolvePatientProfile = async (user) => {
  if (user.role === 'PATIENT') {
    return await Patient.findOne({ user: user.id || user._id });
  }
  return null;
};

/**
 * Check if a doctor has a time overlap with any non-terminal appointment
 * on a given date, excluding a specific appointment (for rescheduling).
 */
const checkDoctorOverlap = async (doctorId, appointmentDate, startTime, endTime, excludeId = null) => {
  const dayStart = new Date(appointmentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(appointmentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const filter = {
    doctor: doctorId,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: TERMINAL_STATUSES },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
    ],
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return await Appointment.findOne(filter);
};

/**
 * Check if a patient has a time overlap with any non-terminal appointment
 * on a given date, excluding a specific appointment (for rescheduling).
 */
const checkPatientOverlap = async (patientId, appointmentDate, startTime, endTime, excludeId = null) => {
  const dayStart = new Date(appointmentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(appointmentDate);
  dayEnd.setHours(23, 59, 59, 999);

  const filter = {
    patient: patientId,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: TERMINAL_STATUSES },
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
    ],
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  return await Appointment.findOne(filter);
};

/**
 * Create a new appointment. Enforces a 10-step precondition chain.
 *
 * Patients create with status REQUESTED. Doctors/Admins create with status CONFIRMED.
 */
const createAppointment = async ({
  doctorId,
  patientId,
  hospitalId,
  appointmentDate,
  startTime,
  endTime,
  reason,
  notes,
  user,
}) => {
  // 1. Validate Hospital exists and is APPROVED
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }
  if (hospital.status !== 'APPROVED') {
    throw new BadRequestError(
      `Cannot create appointment for a hospital with status '${hospital.status}'. Only APPROVED hospitals accept appointments`,
      'HOSPITAL_NOT_APPROVED'
    );
  }

  // 2. Validate Doctor exists and is ACTIVE
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new NotFoundError('Doctor not found', 'DOCTOR_NOT_FOUND');
  }
  if (doctor.status !== 'ACTIVE') {
    throw new BadRequestError(
      `Cannot create appointment with doctor having status '${doctor.status}'. Doctor must be ACTIVE`,
      'DOCTOR_NOT_ACTIVE'
    );
  }

  // 3. Validate Doctor has ACTIVE affiliation at this hospital
  const affiliation = await DoctorHospitalAffiliation.findOne({
    doctor: doctor._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });
  if (!affiliation) {
    throw new BadRequestError(
      'Doctor does not possess an ACTIVE affiliation with this hospital',
      'DOCTOR_AFFILIATION_REQUIRED'
    );
  }

  // 4. Validate Patient exists
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
  }

  // 5. Validate Patient has ACTIVE membership at this hospital
  const membership = await PatientHospitalMembership.findOne({
    patient: patient._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });
  if (!membership) {
    throw new BadRequestError(
      'Patient does not hold an ACTIVE membership with this hospital',
      'PATIENT_MEMBERSHIP_REQUIRED'
    );
  }

  // 6. Validate active doctor-patient assignment exists
  const assignment = await DoctorPatientAssignment.findOne({
    doctor: doctor._id,
    patient: patient._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });
  if (!assignment) {
    throw new BadRequestError(
      'An ACTIVE doctor-patient assignment is required to create an appointment',
      'ASSIGNMENT_REQUIRED'
    );
  }

  // 7. Validate appointment date is not in the past
  const appointmentDateObj = new Date(appointmentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (appointmentDateObj < today) {
    throw new BadRequestError(
      'Appointment date cannot be in the past',
      'APPOINTMENT_DATE_PAST'
    );
  }

  // 8. Validate endTime > startTime
  if (endTime <= startTime) {
    throw new BadRequestError(
      'End time must be after start time',
      'INVALID_TIME_RANGE'
    );
  }

  // 9. Check for doctor time overlap
  const doctorConflict = await checkDoctorOverlap(doctor._id, appointmentDateObj, startTime, endTime);
  if (doctorConflict) {
    throw new ConflictError(
      'Doctor has an overlapping appointment at this time',
      'DOCTOR_SCHEDULE_CONFLICT'
    );
  }

  // 10. Check for patient time overlap
  const patientConflict = await checkPatientOverlap(patient._id, appointmentDateObj, startTime, endTime);
  if (patientConflict) {
    throw new ConflictError(
      'Patient has an overlapping appointment at this time',
      'PATIENT_SCHEDULE_CONFLICT'
    );
  }

  // Determine initial status based on creator's role
  const initialStatus =
    user.role === 'DOCTOR' || user.role === 'HOSPITAL_ADMIN' || user.role === 'SYSTEM_ADMIN'
      ? 'CONFIRMED'
      : 'REQUESTED';

  const appointment = await Appointment.create({
    patient: patient._id,
    doctor: doctor._id,
    hospital: hospital._id,
    appointmentDate: appointmentDateObj,
    startTime,
    endTime,
    status: initialStatus,
    reason: reason || '',
    notes: notes || '',
    createdBy: user.id || user._id,
    confirmedBy: initialStatus === 'CONFIRMED' ? (user.id || user._id) : null,
    confirmedAt: initialStatus === 'CONFIRMED' ? new Date() : null,
  });

  const populated = await Appointment.findById(appointment._id).populate(appointmentPopulation);

  await auditService.recordSuccess('APPOINTMENT_CREATED', 'APPOINTMENT', appointment._id, {
    actor: user.id || user._id,
    actorRole: user.role,
    patient: patient._id,
    hospital: hospital._id,
    metadata: { status: initialStatus, appointmentDate: appointmentDateObj.toISOString(), startTime, endTime },
  });

  const eventName =
    initialStatus === 'CONFIRMED'
      ? DOMAIN_EVENTS.APPOINTMENT_CONFIRMED
      : DOMAIN_EVENTS.APPOINTMENT_REQUESTED;

  await publishDomainEvent(eventName, {
    appointment: populated,
    doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id || doctor.user,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id || patient.user,
    hospitalName: hospital.name,
    doctorName: populated.doctor?.fullName || doctor.fullName,
    patientId: populated.patient?.patientId || patient.patientId,
    actor: user.id || user._id,
  });

  return populated;
};

/**
 * List appointments with role-scoped tenant isolation.
 */
const listAppointments = async ({ query = {}, user }) => {
  const filter = {};

  // Status filter
  if (query.status && query.status !== 'ALL') {
    filter.status = query.status;
  }

  // Date range filters
  if (query.startDate || query.endDate) {
    filter.appointmentDate = {};
    if (query.startDate) filter.appointmentDate.$gte = new Date(query.startDate);
    if (query.endDate) filter.appointmentDate.$lte = new Date(query.endDate);
  }

  // Upcoming filter
  if (query.upcoming === 'true') {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    filter.appointmentDate = { ...(filter.appointmentDate || {}), $gte: now };
  }

  // Role-based scoping
  if (user.role === 'HOSPITAL_ADMIN') {
    let targetHospitalId = query.hospitalId;

    if (!targetHospitalId) {
      const userHosp = await Hospital.findOne({
        $or: [{ admin: user.id }, { registeredBy: user.id }],
      });
      if (!userHosp) {
        throw new ForbiddenError(
          'You are not assigned as administrator of any hospital',
          'HOSPITAL_ACCESS_FORBIDDEN'
        );
      }
      targetHospitalId = userHosp._id;
    }

    const hospital = await Hospital.findById(targetHospitalId);
    if (!hospital) {
      throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
    }

    verifyHospitalAppointmentAuthority(hospital, user);
    filter.hospital = hospital._id;

    if (query.doctorId) filter.doctor = query.doctorId;
    if (query.patientId) filter.patient = query.patientId;
  } else if (user.role === 'SYSTEM_ADMIN') {
    if (query.hospitalId) filter.hospital = query.hospitalId;
    if (query.doctorId) filter.doctor = query.doctorId;
    if (query.patientId) filter.patient = query.patientId;
  } else if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    if (!doctorProfile) {
      return { appointments: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
    filter.doctor = doctorProfile._id;
    if (query.hospitalId) filter.hospital = query.hospitalId;
    if (query.patientId) filter.patient = query.patientId;
  } else if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) {
      return { appointments: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0 } };
    }
    filter.patient = patientProfile._id;
    if (query.hospitalId) filter.hospital = query.hospitalId;
    if (query.doctorId) filter.doctor = query.doctorId;
  } else {
    throw new ForbiddenError('Unauthorized to view appointments', 'UNAUTHORIZED_ACCESS');
  }

  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .populate(appointmentPopulation)
      .sort({ appointmentDate: 1, startTime: 1 })
      .skip(skip)
      .limit(limit),
    Appointment.countDocuments(filter),
  ]);

  return {
    appointments,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Retrieve a single appointment by ID with authorization check.
 */
const getAppointmentById = async ({ appointmentId, user }) => {
  const appointment = await Appointment.findById(appointmentId).populate(appointmentPopulation);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  }

  const doctorProfile = await resolveDoctorProfile(user);
  const patientProfile = await resolvePatientProfile(user);

  verifyAppointmentReadAccess(appointment, user, { doctorProfile, patientProfile });

  return appointment;
};

/**
 * Validate a state transition.
 */
const validateTransition = (currentStatus, targetStatus) => {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new BadRequestError(
      `Cannot transition appointment from '${currentStatus}' to '${targetStatus}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }
};

/**
 * Confirm a REQUESTED appointment → CONFIRMED.
 */
const confirmAppointment = async ({ appointmentId, user }) => {
  const appointment = await Appointment.findById(appointmentId).populate(appointmentPopulation);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  }

  validateTransition(appointment.status, 'CONFIRMED');

  const doctorProfile = await resolveDoctorProfile(user);
  const patientProfile = await resolvePatientProfile(user);
  verifyAppointmentWriteAccess(appointment, user, 'confirm', { doctorProfile, patientProfile });

  // Re-check for doctor overlaps at confirmation time
  const rawDoctor = appointment.doctor?._id || appointment.doctor;
  const conflict = await checkDoctorOverlap(
    rawDoctor,
    appointment.appointmentDate,
    appointment.startTime,
    appointment.endTime,
    appointment._id
  );
  if (conflict) {
    throw new ConflictError(
      'Doctor has a conflicting appointment at this time',
      'DOCTOR_SCHEDULE_CONFLICT'
    );
  }

  appointment.status = 'CONFIRMED';
  appointment.confirmedBy = user.id || user._id;
  appointment.confirmedAt = new Date();
  await appointment.save();

  const populated = await Appointment.findById(appointment._id).populate(appointmentPopulation);

  await auditService.recordSuccess('APPOINTMENT_CONFIRMED', 'APPOINTMENT', appointment._id, {
    actor: user.id || user._id,
    actorRole: user.role,
    patient: appointment.patient?._id || appointment.patient,
    hospital: appointment.hospital?._id || appointment.hospital,
  });

  await publishDomainEvent(DOMAIN_EVENTS.APPOINTMENT_CONFIRMED, {
    appointment: populated,
    doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id,
    hospitalName: populated.hospital?.name,
    doctorName: populated.doctor?.fullName,
    patientId: populated.patient?.patientId,
    actor: user.id || user._id,
  });

  return populated;
};

/**
 * Reject a REQUESTED appointment → REJECTED.
 */
const rejectAppointment = async ({ appointmentId, rejectionReason, user }) => {
  const appointment = await Appointment.findById(appointmentId).populate(appointmentPopulation);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  }

  validateTransition(appointment.status, 'REJECTED');

  const doctorProfile = await resolveDoctorProfile(user);
  const patientProfile = await resolvePatientProfile(user);
  verifyAppointmentWriteAccess(appointment, user, 'reject', { doctorProfile, patientProfile });

  appointment.status = 'REJECTED';
  appointment.rejectedBy = user.id || user._id;
  appointment.rejectedAt = new Date();
  appointment.rejectionReason = rejectionReason || '';
  await appointment.save();

  const populated = await Appointment.findById(appointment._id).populate(appointmentPopulation);

  await auditService.recordSuccess('APPOINTMENT_REJECTED', 'APPOINTMENT', appointment._id, {
    actor: user.id || user._id,
    actorRole: user.role,
    patient: appointment.patient?._id || appointment.patient,
    hospital: appointment.hospital?._id || appointment.hospital,
  });

  await publishDomainEvent(DOMAIN_EVENTS.APPOINTMENT_REJECTED, {
    appointment: populated,
    doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id,
    hospitalName: populated.hospital?.name,
    doctorName: populated.doctor?.fullName,
    patientId: populated.patient?.patientId,
    actor: user.id || user._id,
  });

  return populated;
};

/**
 * Cancel a REQUESTED or CONFIRMED appointment → CANCELLED.
 */
const cancelAppointment = async ({ appointmentId, cancellationReason, user }) => {
  const appointment = await Appointment.findById(appointmentId).populate(appointmentPopulation);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  }

  validateTransition(appointment.status, 'CANCELLED');

  const doctorProfile = await resolveDoctorProfile(user);
  const patientProfile = await resolvePatientProfile(user);
  verifyAppointmentWriteAccess(appointment, user, 'cancel', { doctorProfile, patientProfile });

  appointment.status = 'CANCELLED';
  appointment.cancelledBy = user.id || user._id;
  appointment.cancelledAt = new Date();
  appointment.cancellationReason = cancellationReason || '';
  await appointment.save();

  const populated = await Appointment.findById(appointment._id).populate(appointmentPopulation);

  await auditService.recordSuccess('APPOINTMENT_CANCELLED', 'APPOINTMENT', appointment._id, {
    actor: user.id || user._id,
    actorRole: user.role,
    patient: appointment.patient?._id || appointment.patient,
    hospital: appointment.hospital?._id || appointment.hospital,
  });

  await publishDomainEvent(DOMAIN_EVENTS.APPOINTMENT_CANCELLED, {
    appointment: populated,
    doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id,
    hospitalName: populated.hospital?.name,
    doctorName: populated.doctor?.fullName,
    patientId: populated.patient?.patientId,
    actor: user.id || user._id,
  });

  return populated;
};

/**
 * Reschedule a CONFIRMED appointment — updates time/date on the same document.
 */
const rescheduleAppointment = async ({
  appointmentId,
  appointmentDate,
  startTime,
  endTime,
  reason,
  user,
}) => {
  const appointment = await Appointment.findById(appointmentId).populate(appointmentPopulation);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  }

  if (appointment.status !== 'CONFIRMED') {
    throw new BadRequestError(
      `Only CONFIRMED appointments can be rescheduled. Current status is '${appointment.status}'`,
      'INVALID_STATUS_TRANSITION'
    );
  }

  const doctorProfile = await resolveDoctorProfile(user);
  const patientProfile = await resolvePatientProfile(user);
  verifyAppointmentWriteAccess(appointment, user, 'reschedule', { doctorProfile, patientProfile });

  // Validate new date is not in the past
  const newDateObj = new Date(appointmentDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (newDateObj < today) {
    throw new BadRequestError(
      'Rescheduled appointment date cannot be in the past',
      'APPOINTMENT_DATE_PAST'
    );
  }

  // Validate endTime > startTime
  if (endTime <= startTime) {
    throw new BadRequestError(
      'End time must be after start time',
      'INVALID_TIME_RANGE'
    );
  }

  // Check for doctor overlap (excluding self)
  const rawDoctor = appointment.doctor?._id || appointment.doctor;
  const doctorConflict = await checkDoctorOverlap(rawDoctor, newDateObj, startTime, endTime, appointment._id);
  if (doctorConflict) {
    throw new ConflictError(
      'Doctor has a conflicting appointment at the rescheduled time',
      'DOCTOR_SCHEDULE_CONFLICT'
    );
  }

  // Check for patient overlap (excluding self)
  const rawPatient = appointment.patient?._id || appointment.patient;
  const patientConflict = await checkPatientOverlap(rawPatient, newDateObj, startTime, endTime, appointment._id);
  if (patientConflict) {
    throw new ConflictError(
      'Patient has a conflicting appointment at the rescheduled time',
      'PATIENT_SCHEDULE_CONFLICT'
    );
  }

  appointment.appointmentDate = newDateObj;
  appointment.startTime = startTime;
  appointment.endTime = endTime;
  if (reason) appointment.reason = reason;
  await appointment.save();

  const populated = await Appointment.findById(appointment._id).populate(appointmentPopulation);

  await auditService.recordSuccess('APPOINTMENT_RESCHEDULED', 'APPOINTMENT', appointment._id, {
    actor: user.id || user._id,
    actorRole: user.role,
    patient: appointment.patient?._id || appointment.patient,
    hospital: appointment.hospital?._id || appointment.hospital,
    metadata: { newDate: newDateObj.toISOString(), startTime, endTime },
  });

  await publishDomainEvent(DOMAIN_EVENTS.APPOINTMENT_RESCHEDULED, {
    appointment: populated,
    doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id,
    hospitalName: populated.hospital?.name,
    doctorName: populated.doctor?.fullName,
    patientId: populated.patient?.patientId,
    actor: user.id || user._id,
  });

  return populated;
};

/**
 * Complete a CONFIRMED appointment → COMPLETED.
 */
const completeAppointment = async ({ appointmentId, user }) => {
  const appointment = await Appointment.findById(appointmentId).populate(appointmentPopulation);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  }

  validateTransition(appointment.status, 'COMPLETED');

  const doctorProfile = await resolveDoctorProfile(user);
  const patientProfile = await resolvePatientProfile(user);
  verifyAppointmentWriteAccess(appointment, user, 'complete', { doctorProfile, patientProfile });

  appointment.status = 'COMPLETED';
  appointment.completedBy = user.id || user._id;
  appointment.completedAt = new Date();
  await appointment.save();

  const populated = await Appointment.findById(appointment._id).populate(appointmentPopulation);

  await auditService.recordSuccess('APPOINTMENT_COMPLETED', 'APPOINTMENT', appointment._id, {
    actor: user.id || user._id,
    actorRole: user.role,
    patient: appointment.patient?._id || appointment.patient,
    hospital: appointment.hospital?._id || appointment.hospital,
  });

  await publishDomainEvent(DOMAIN_EVENTS.APPOINTMENT_COMPLETED, {
    appointment: populated,
    doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id,
    hospitalName: populated.hospital?.name,
    doctorName: populated.doctor?.fullName,
    patientId: populated.patient?.patientId,
    actor: user.id || user._id,
  });

  return populated;
};

/**
 * Mark a CONFIRMED appointment as NO_SHOW.
 */
const markAppointmentNoShow = async ({ appointmentId, user }) => {
  const appointment = await Appointment.findById(appointmentId).populate(appointmentPopulation);
  if (!appointment) {
    throw new NotFoundError('Appointment not found', 'APPOINTMENT_NOT_FOUND');
  }

  validateTransition(appointment.status, 'NO_SHOW');

  const doctorProfile = await resolveDoctorProfile(user);
  const patientProfile = await resolvePatientProfile(user);
  verifyAppointmentWriteAccess(appointment, user, 'no-show', { doctorProfile, patientProfile });

  appointment.status = 'NO_SHOW';
  await appointment.save();

  const populated = await Appointment.findById(appointment._id).populate(appointmentPopulation);

  await auditService.recordSuccess('APPOINTMENT_NO_SHOW', 'APPOINTMENT', appointment._id, {
    actor: user.id || user._id,
    actorRole: user.role,
    patient: appointment.patient?._id || appointment.patient,
    hospital: appointment.hospital?._id || appointment.hospital,
  });

  await publishDomainEvent(DOMAIN_EVENTS.APPOINTMENT_NO_SHOW, {
    appointment: populated,
    doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id,
    patientUser: populated.patient?.user?._id || populated.patient?.user?.id,
    hospitalName: populated.hospital?.name,
    doctorName: populated.doctor?.fullName,
    patientId: populated.patient?.patientId,
    actor: user.id || user._id,
  });

  return populated;
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
