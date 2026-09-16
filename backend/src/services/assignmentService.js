const { DoctorPatientAssignment } = require('../models/DoctorPatientAssignment');
const { Doctor } = require('../models/Doctor');
const { DoctorHospitalAffiliation } = require('../models/DoctorHospitalAffiliation');
const { Patient } = require('../models/Patient');
const { PatientHospitalMembership } = require('../models/PatientHospitalMembership');
const { Hospital } = require('../models/Hospital');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../errors/AppError');
const {
  verifyHospitalAdminAssignmentAuthority,
  verifyDoctorAssignmentAccess,
} = require('../policies/assignmentPolicy');
const auditService = require('./auditService');
const { DOMAIN_EVENTS, publishDomainEvent } = require('../utils/domainEvents');

/**
 * Standard Mongoose population options for DoctorPatientAssignment records.
 */
const assignmentPopulation = [
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
  {
    path: 'assignedBy',
    select: 'name email role',
  },
  {
    path: 'endedBy',
    select: 'name email role',
  },
];

/**
 * Create a new Doctor-Patient assignment within a hospital facility.
 * Enforces hospital admin governance, doctor active credentialing, hospital approval,
 * doctor affiliation, and patient membership.
 */
const createAssignment = async ({ doctorId, patientId, hospitalId, notes, adminUser }) => {
  if (adminUser.role !== 'HOSPITAL_ADMIN' && adminUser.role !== 'SYSTEM_ADMIN') {
    throw new ForbiddenError(
      'Only hospital administrators and system administrators may create doctor-patient assignments',
      'FORBIDDEN_ASSIGNMENT_CREATION'
    );
  }

  // 1. Verify Hospital
  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  if (hospital.status !== 'APPROVED') {
    throw new BadRequestError(
      `Cannot create assignment for a hospital with status '${hospital.status}'. Only APPROVED hospitals accept assignments`,
      'HOSPITAL_NOT_APPROVED'
    );
  }

  // Tenant Authority Gate
  verifyHospitalAdminAssignmentAuthority(hospital, adminUser);

  // 2. Verify Doctor
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) {
    throw new NotFoundError('Doctor not found', 'DOCTOR_NOT_FOUND');
  }

  if (doctor.status !== 'ACTIVE') {
    throw new BadRequestError(
      `Cannot assign doctor with status '${doctor.status}'. Doctor profile must be ACTIVE`,
      'DOCTOR_NOT_ACTIVE'
    );
  }

  // 3. Verify Doctor Affiliation with this Hospital
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

  // 4. Verify Patient
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new NotFoundError('Patient not found', 'PATIENT_NOT_FOUND');
  }

  // 5. Verify Patient Membership with this Hospital
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

  // 6. Check for Existing Active Assignment (Domain rule & partial index safeguard)
  const existingActive = await DoctorPatientAssignment.findOne({
    doctor: doctor._id,
    patient: patient._id,
    hospital: hospital._id,
    status: 'ACTIVE',
  });

  if (existingActive) {
    throw new ConflictError(
      'An active assignment already exists for this doctor and patient at this hospital',
      'ACTIVE_ASSIGNMENT_EXISTS'
    );
  }

  try {
    const assignment = await DoctorPatientAssignment.create({
      doctor: doctor._id,
      patient: patient._id,
      hospital: hospital._id,
      status: 'ACTIVE',
      assignedAt: new Date(),
      assignedBy: adminUser.id || adminUser._id,
      notes: notes || '',
    });

    const populated = await DoctorPatientAssignment.findById(assignment._id).populate(
      assignmentPopulation
    );

    await auditService.recordSuccess('ASSIGNMENT_CREATED', 'ASSIGNMENT', assignment._id, {
      actor: adminUser.id || adminUser._id,
      actorRole: adminUser.role,
      patient: patient._id,
      hospital: hospital._id,
    });

    await publishDomainEvent(DOMAIN_EVENTS.ASSIGNMENT_CREATED, {
      assignment: populated,
      doctorUser: populated.doctor?.user?._id || populated.doctor?.user?.id || doctor.user,
      patientUser: populated.patient?.user?._id || populated.patient?.user?.id || patient.user,
      hospitalName: hospital.name,
      doctorName: populated.doctor?.fullName || doctor.fullName,
      patientId: populated.patient?.patientId || patient.patientId,
      actor: adminUser.id || adminUser._id,
    });

    return populated;
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError(
        'An active assignment already exists for this doctor and patient at this hospital',
        'ACTIVE_ASSIGNMENT_EXISTS'
      );
    }
    throw err;
  }
};

/**
 * List assignments with role-scoped tenant isolation.
 */
const listAssignments = async ({ query = {}, user }) => {
  const filter = {};

  if (query.status && query.status !== 'ALL') {
    filter.status = query.status;
  }

  // Role Scoping & Tenant Governance
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

    verifyHospitalAdminAssignmentAuthority(hospital, user);
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
      return [];
    }

    filter.doctor = doctorProfile._id;
    if (query.hospitalId) filter.hospital = query.hospitalId;
    if (query.patientId) filter.patient = query.patientId;
  } else if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    if (!patientProfile) {
      return [];
    }

    filter.patient = patientProfile._id;
    if (query.hospitalId) filter.hospital = query.hospitalId;
    if (query.doctorId) filter.doctor = query.doctorId;
  } else {
    throw new ForbiddenError('Unauthorized to view assignments', 'UNAUTHORIZED_ACCESS');
  }

  const assignments = await DoctorPatientAssignment.find(filter)
    .populate(assignmentPopulation)
    .sort({ assignedAt: -1 });

  return assignments;
};

/**
 * Retrieve a single assignment by ID with tenant isolation verification.
 */
const getAssignmentById = async ({ assignmentId, user }) => {
  const assignment = await DoctorPatientAssignment.findById(assignmentId).populate(
    assignmentPopulation
  );

  if (!assignment) {
    throw new NotFoundError('Doctor-patient assignment not found', 'ASSIGNMENT_NOT_FOUND');
  }

  // Authorization Check
  if (user.role === 'SYSTEM_ADMIN') {
    return assignment;
  }

  if (user.role === 'HOSPITAL_ADMIN') {
    verifyHospitalAdminAssignmentAuthority(assignment.hospital, user);
    return assignment;
  }

  if (user.role === 'DOCTOR') {
    const doctorProfile = await Doctor.findOne({ user: user.id });
    const docIdStr = doctorProfile ? doctorProfile._id.toString() : '';
    const assignmentDocIdStr = (assignment.doctor?.id || assignment.doctor?._id || '').toString();

    if (docIdStr && docIdStr === assignmentDocIdStr) {
      return assignment;
    }

    throw new ForbiddenError(
      'You are not authorized to access assignments for another doctor',
      'ASSIGNMENT_ACCESS_FORBIDDEN'
    );
  }

  if (user.role === 'PATIENT') {
    const patientProfile = await Patient.findOne({ user: user.id });
    const patientIdStr = patientProfile ? patientProfile._id.toString() : '';
    const assignmentPatientIdStr = (
      assignment.patient?.id ||
      assignment.patient?._id ||
      ''
    ).toString();

    if (patientIdStr && patientIdStr === assignmentPatientIdStr) {
      return assignment;
    }

    throw new ForbiddenError(
      'You are not authorized to access assignments for another patient',
      'ASSIGNMENT_ACCESS_FORBIDDEN'
    );
  }

  throw new ForbiddenError('Unauthorized to access this assignment', 'ASSIGNMENT_ACCESS_FORBIDDEN');
};

/**
 * End an active doctor-patient assignment.
 * Enforces state machine (ACTIVE -> ENDED) and hospital admin governance.
 */
const endAssignment = async ({ assignmentId, adminUser }) => {
  if (adminUser.role !== 'HOSPITAL_ADMIN' && adminUser.role !== 'SYSTEM_ADMIN') {
    throw new ForbiddenError(
      'Only hospital administrators and system administrators may end assignments',
      'FORBIDDEN_ASSIGNMENT_MANAGEMENT'
    );
  }

  const assignment = await DoctorPatientAssignment.findById(assignmentId);
  if (!assignment) {
    throw new NotFoundError('Doctor-patient assignment not found', 'ASSIGNMENT_NOT_FOUND');
  }

  const hospital = await Hospital.findById(assignment.hospital);
  if (!hospital) {
    throw new NotFoundError('Hospital not found', 'HOSPITAL_NOT_FOUND');
  }

  // Tenant Authority Gate
  verifyHospitalAdminAssignmentAuthority(hospital, adminUser);

  // State Machine Validation
  if (assignment.status === 'ENDED') {
    throw new BadRequestError(
      'Assignment has already been ended and cannot be ended again',
      'ASSIGNMENT_ALREADY_ENDED'
    );
  }

  assignment.status = 'ENDED';
  assignment.endedAt = new Date();
  assignment.endedBy = adminUser.id || adminUser._id;

  await assignment.save();

  const updated = await DoctorPatientAssignment.findById(assignment._id).populate(
    assignmentPopulation
  );

  await auditService.recordSuccess('ASSIGNMENT_ENDED', 'ASSIGNMENT', assignment._id, {
    actor: adminUser.id || adminUser._id,
    actorRole: adminUser.role,
    patient: assignment.patient,
    hospital: hospital._id,
  });

  await publishDomainEvent(DOMAIN_EVENTS.ASSIGNMENT_ENDED, {
    assignment: updated,
    doctorUser: updated.doctor?.user?._id || updated.doctor?.user?.id || updated.doctor?.user,
    patientUser: updated.patient?.user?._id || updated.patient?.user?.id || updated.patient?.user,
    hospitalName: hospital.name,
    doctorName: updated.doctor?.fullName,
    patientId: updated.patient?.patientId,
    actor: adminUser.id || adminUser._id,
  });

  return updated;
};

module.exports = {
  createAssignment,
  listAssignments,
  getAssignmentById,
  endAssignment,
};
