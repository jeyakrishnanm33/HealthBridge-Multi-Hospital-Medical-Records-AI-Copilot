const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User } = require('../src/models/User');
const { Hospital } = require('../src/models/Hospital');
const { Doctor } = require('../src/models/Doctor');
const { DoctorHospitalAffiliation } = require('../src/models/DoctorHospitalAffiliation');
const { Patient } = require('../src/models/Patient');
const { PatientHospitalMembership } = require('../src/models/PatientHospitalMembership');
const { DoctorPatientAssignment } = require('../src/models/DoctorPatientAssignment');
const { Appointment } = require('../src/models/Appointment');
const { AuditLog } = require('../src/models/AuditLog');
const { Notification } = require('../src/models/Notification');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Appointment & Scheduling Domain Tests (Phase 11)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;

  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;
  let doctorUserSuspended, doctorTokenSuspended, doctorProfileSuspended;
  let doctorUserUnaffiliated, doctorTokenUnaffiliated, doctorProfileUnaffiliated;

  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;
  let patientUserUnassigned, patientTokenUnassigned, patientProfileUnassigned;

  let hospitalA, hospitalB, hospitalPending;
  let affiliationA_DocA, affiliationB_DocB;
  let membershipA_Pat1, membershipB_Pat1, membershipA_Pat2;
  let assignmentA_DocA_Pat1, assignmentA_DocA_Pat2;

  beforeAll(async () => {
    await connectDB();

    // Clean up collections
    await User.deleteMany({ email: /test-phase11\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P11$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await Appointment.deleteMany({});
    await Notification.deleteMany({});
    await AuditLog.deleteMany({});

    // Seed Admins
    sysAdminUser = await User.create({
      name: 'System Admin P11',
      email: 'sysadmin@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminA = await User.create({
      name: 'Admin Hosp A P11',
      email: 'adminA@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: 'HOSPITAL_ADMIN' });

    hospAdminB = await User.create({
      name: 'Admin Hosp B P11',
      email: 'adminB@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: 'HOSPITAL_ADMIN' });

    // Seed Hospitals
    hospitalA = await Hospital.create({
      name: 'Apollo Hospital P11',
      hospitalCode: 'APOLLO-P11',
      address: { street: '12 Health Way', city: 'Chennai', state: 'TN', zipCode: '600001', country: 'India' },
      contactEmail: 'contact@apollo-p11.local',
      contactPhone: '+914428290001',
      licenseNumber: 'HOSP-LIC-P11-01',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    hospitalB = await Hospital.create({
      name: 'Fortis Hospital P11',
      hospitalCode: 'FORTIS-P11',
      address: { street: '45 Care Ave', city: 'Bangalore', state: 'KA', zipCode: '560001', country: 'India' },
      contactEmail: 'contact@fortis-p11.local',
      contactPhone: '+918028290002',
      licenseNumber: 'HOSP-LIC-P11-02',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
    });

    hospitalPending = await Hospital.create({
      name: 'City Clinic Pending P11',
      hospitalCode: 'CITY-PEND-P11',
      address: { street: '78 Med Lane', city: 'Delhi', state: 'DL', zipCode: '110001', country: 'India' },
      contactEmail: 'pending@clinic-p11.local',
      contactPhone: '+911128290003',
      licenseNumber: 'HOSP-LIC-P11-03',
      status: 'PENDING',
      registeredBy: sysAdminUser._id,
    });

    // Seed Doctors
    doctorUserA = await User.create({
      name: 'Dr. John Watson P11',
      email: 'dr.watson@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });
    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. John Watson',
      gender: 'MALE',
      dateOfBirth: new Date('1980-05-15'),
      phone: '+919876543210',
      specialization: 'CARDIOLOGY',
      qualifications: ['MBBS', 'MD'],
      medicalLicenseNumber: 'MED-LIC-P11-01',
      yearsOfExperience: 10,
      status: 'ACTIVE',
    });

    doctorUserB = await User.create({
      name: 'Dr. Gregory House P11',
      email: 'dr.house@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });
    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Gregory House',
      gender: 'MALE',
      dateOfBirth: new Date('1975-06-11'),
      phone: '+919876543211',
      specialization: 'NEUROLOGY',
      qualifications: ['MBBS', 'DM'],
      medicalLicenseNumber: 'MED-LIC-P11-02',
      yearsOfExperience: 15,
      status: 'ACTIVE',
    });

    doctorUserSuspended = await User.create({
      name: 'Dr. Suspended P11',
      email: 'dr.suspended@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenSuspended = generateToken({ sub: doctorUserSuspended._id.toString(), role: 'DOCTOR' });
    doctorProfileSuspended = await Doctor.create({
      user: doctorUserSuspended._id,
      fullName: 'Dr. Suspended User',
      gender: 'MALE',
      dateOfBirth: new Date('1988-03-21'),
      phone: '+919876543212',
      specialization: 'GENERAL_MEDICINE',
      qualifications: ['MBBS'],
      medicalLicenseNumber: 'MED-LIC-P11-SUSP',
      yearsOfExperience: 5,
      status: 'SUSPENDED',
    });

    doctorUserUnaffiliated = await User.create({
      name: 'Dr. Unaffiliated P11',
      email: 'dr.unaffiliated@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenUnaffiliated = generateToken({ sub: doctorUserUnaffiliated._id.toString(), role: 'DOCTOR' });
    doctorProfileUnaffiliated = await Doctor.create({
      user: doctorUserUnaffiliated._id,
      fullName: 'Dr. Unaffiliated Doc',
      gender: 'MALE',
      dateOfBirth: new Date('1992-11-08'),
      phone: '+919876543213',
      specialization: 'PEDIATRICS',
      qualifications: ['MBBS', 'DCH'],
      medicalLicenseNumber: 'MED-LIC-P11-UNAFF',
      yearsOfExperience: 3,
      status: 'ACTIVE',
    });

    // Seed Doctor Affiliations
    affiliationA_DocA = await DoctorHospitalAffiliation.create({
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      department: 'Cardiology',
      status: 'ACTIVE',
    });

    affiliationB_DocB = await DoctorHospitalAffiliation.create({
      doctor: doctorProfileB._id,
      hospital: hospitalB._id,
      department: 'Neurology',
      status: 'ACTIVE',
    });

    // Seed Patients
    patientUser1 = await User.create({
      name: 'Patient Alice P11',
      email: 'alice@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });
    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PAT-P11-0001',
      dateOfBirth: new Date('1990-01-15'),
      gender: 'FEMALE',
      bloodGroup: 'O+',
      phone: '+919811111111',
      address: { street: '10 River St', city: 'Chennai', state: 'TN', postalCode: '600002', country: 'India' },
      status: 'ACTIVE',
    });

    patientUser2 = await User.create({
      name: 'Patient Bob P11',
      email: 'bob@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });
    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PAT-P11-0002',
      dateOfBirth: new Date('1985-05-20'),
      gender: 'MALE',
      bloodGroup: 'A+',
      phone: '+919822222222',
      address: { street: '20 Mountain St', city: 'Bangalore', state: 'KA', postalCode: '560002', country: 'India' },
      status: 'ACTIVE',
    });

    patientUserUnassigned = await User.create({
      name: 'Patient Unassigned P11',
      email: 'unassigned@test-phase11.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientTokenUnassigned = generateToken({ sub: patientUserUnassigned._id.toString(), role: 'PATIENT' });
    patientProfileUnassigned = await Patient.create({
      user: patientUserUnassigned._id,
      patientId: 'PAT-P11-0003',
      dateOfBirth: new Date('1995-08-10'),
      gender: 'MALE',
      bloodGroup: 'B+',
      phone: '+919833333333',
      address: { street: '30 Hill St', city: 'Chennai', state: 'TN', postalCode: '600003', country: 'India' },
      status: 'ACTIVE',
    });

    // Seed Patient Memberships
    membershipA_Pat1 = await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
    });

    membershipA_Pat2 = await PatientHospitalMembership.create({
      patient: patientProfile2._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
    });

    membershipB_Pat1 = await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
    });

    // Seed Doctor-Patient Assignments
    assignmentA_DocA_Pat1 = await DoctorPatientAssignment.create({
      doctor: doctorProfileA._id,
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      department: 'Cardiology',
      assignedBy: hospAdminA._id,
      status: 'ACTIVE',
      assignedAt: new Date(),
    });

    assignmentA_DocA_Pat2 = await DoctorPatientAssignment.create({
      doctor: doctorProfileA._id,
      patient: patientProfile2._id,
      hospital: hospitalA._id,
      department: 'Cardiology',
      assignedBy: hospAdminA._id,
      status: 'ACTIVE',
      assignedAt: new Date(),
    });
  });

  afterAll(async () => {
    await disconnectDB();
  });

  // Future appointment date helper
  const getFutureDate = (daysAhead = 5) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  describe('1. 10-Step Precondition Validation on Appointment Creation', () => {
    it('1.1 Fails if Hospital does not exist (404)', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: fakeId,
          appointmentDate: getFutureDate(1),
          startTime: '09:00',
          endTime: '09:30',
          reason: 'Routine checkup',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_FOUND');
    });

    it('1.2 Fails if Hospital is not APPROVED (400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalPending._id.toString(),
          appointmentDate: getFutureDate(1),
          startTime: '09:00',
          endTime: '09:30',
          reason: 'Routine checkup',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('1.3 Fails if Doctor is not ACTIVE (400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileSuspended._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: getFutureDate(1),
          startTime: '09:00',
          endTime: '09:30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCTOR_NOT_ACTIVE');
    });

    it('1.4 Fails if Doctor has no ACTIVE affiliation at the hospital (400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileUnaffiliated._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: getFutureDate(1),
          startTime: '09:00',
          endTime: '09:30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('DOCTOR_AFFILIATION_REQUIRED');
    });

    it('1.5 Fails if Patient has no ACTIVE membership at the hospital (400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientTokenUnassigned}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfileUnassigned._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: getFutureDate(1),
          startTime: '09:00',
          endTime: '09:30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PATIENT_MEMBERSHIP_REQUIRED');
    });

    it('1.6 Fails if no ACTIVE doctor-patient assignment exists (400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileB._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalB._id.toString(),
          appointmentDate: getFutureDate(1),
          startTime: '09:00',
          endTime: '09:30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ASSIGNMENT_REQUIRED');
    });

    it('1.7 Fails if appointment date is in the past (400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: '2020-01-01',
          startTime: '09:00',
          endTime: '09:30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('APPOINTMENT_DATE_PAST');
    });

    it('1.8 Fails if endTime <= startTime (400)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: getFutureDate(2),
          startTime: '10:00',
          endTime: '09:30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_TIME_RANGE');
    });
  });

  describe('2. Appointment Creation, Status Lifecycle, and Overlap Detection', () => {
    let createdAppointmentId;
    const testDate = getFutureDate(7);

    it('2.1 Patient creates appointment -> status is REQUESTED', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '10:00',
          endTime: '10:30',
          reason: 'Initial consultation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.appointment).toBeDefined();
      expect(res.body.data.appointment.status).toBe('REQUESTED');
      expect(res.body.data.appointment.startTime).toBe('10:00');
      expect(res.body.data.appointment.endTime).toBe('10:30');
      createdAppointmentId = res.body.data.appointment.id;

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'APPOINTMENT_CREATED',
        resourceId: createdAppointmentId,
      });
      expect(audit).not.toBeNull();
      expect(audit.result).toBe('SUCCESS');

      // Verify notification created for doctor
      const notif = await Notification.findOne({
        recipient: doctorUserA._id,
        type: 'APPOINTMENT_REQUESTED',
        resourceId: createdAppointmentId,
      });
      expect(notif).not.toBeNull();
    });

    it('2.2 Doctor overlap: second appointment for same doctor at overlapping time is rejected (409)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken2}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '10:15',
          endTime: '10:45',
          reason: 'Conflict consultation',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DOCTOR_SCHEDULE_CONFLICT');
    });

    it('2.3 Patient overlap: second appointment for same patient at overlapping time is rejected (409)', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '10:00',
          endTime: '10:30',
          reason: 'Duplicate slot',
        });

      expect(res.status).toBe(409);
    });

    it('2.4 Doctor/Admin creation -> status is CONFIRMED immediately', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '11:00',
          endTime: '11:30',
          reason: 'Doctor scheduled visit',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.appointment.status).toBe('CONFIRMED');
      expect(res.body.data.appointment.confirmedBy).toBeDefined();

      // Verify notification for patient
      const notif = await Notification.findOne({
        recipient: patientUser2._id,
        type: 'APPOINTMENT_CONFIRMED',
        resourceId: res.body.data.appointment.id,
      });
      expect(notif).not.toBeNull();
    });

    it('2.5 Doctor confirms REQUESTED appointment -> status becomes CONFIRMED', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${createdAppointmentId}/confirm`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('CONFIRMED');
      expect(res.body.data.appointment.confirmedAt).toBeDefined();

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'APPOINTMENT_CONFIRMED',
        resourceId: createdAppointmentId,
      });
      expect(audit).not.toBeNull();
    });

    it('2.6 Doctor reschedules CONFIRMED appointment -> updates date/time and audits', async () => {
      const newDate = getFutureDate(10);
      const res = await request(app)
        .patch(`/api/appointments/${createdAppointmentId}/reschedule`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          appointmentDate: newDate,
          startTime: '14:00',
          endTime: '14:30',
          reason: 'Doctor surgery delay',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.startTime).toBe('14:00');
      expect(res.body.data.appointment.endTime).toBe('14:30');

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'APPOINTMENT_RESCHEDULED',
        resourceId: createdAppointmentId,
      });
      expect(audit).not.toBeNull();
    });

    it('2.7 Doctor completes CONFIRMED appointment -> status becomes COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${createdAppointmentId}/complete`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('COMPLETED');
      expect(res.body.data.appointment.completedBy).toBeDefined();

      // Verify audit log
      const audit = await AuditLog.findOne({
        action: 'APPOINTMENT_COMPLETED',
        resourceId: createdAppointmentId,
      });
      expect(audit).not.toBeNull();
    });

    it('2.8 Terminal state enforcement: cannot cancel or modify COMPLETED appointment (400)', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${createdAppointmentId}/cancel`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ cancellationReason: 'Too late' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });
  });

  describe('3. Rejection, Cancellation, and No-Show Lifecycles', () => {
    let reqApptId, confApptId;
    const testDate = getFutureDate(12);

    beforeAll(async () => {
      // Create REQUESTED appt for rejection test
      const res1 = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '15:00',
          endTime: '15:30',
          reason: 'To be rejected',
        });
      reqApptId = res1.body.data.appointment.id;

      // Create CONFIRMED appt for no-show test
      const res2 = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '16:00',
          endTime: '16:30',
          reason: 'To be marked no-show',
        });
      confApptId = res2.body.data.appointment.id;
    });

    it('3.1 Doctor rejects REQUESTED appointment with reason -> REJECTED', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${reqApptId}/reject`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ rejectionReason: 'Doctor out of office' });

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('REJECTED');
      expect(res.body.data.appointment.rejectionReason).toBe('Doctor out of office');

      // Verify notification sent to patient
      const notif = await Notification.findOne({
        recipient: patientUser1._id,
        type: 'APPOINTMENT_REJECTED',
        resourceId: reqApptId,
      });
      expect(notif).not.toBeNull();
    });

    it('3.2 Doctor marks CONFIRMED appointment as NO_SHOW -> NO_SHOW', async () => {
      const res = await request(app)
        .patch(`/api/appointments/${confApptId}/no-show`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.status).toBe('NO_SHOW');

      // Verify notification sent to patient
      const notif = await Notification.findOne({
        recipient: patientUser1._id,
        type: 'APPOINTMENT_NO_SHOW',
        resourceId: confApptId,
      });
      expect(notif).not.toBeNull();
    });

    it('3.3 Patient cancels a CONFIRMED appointment -> CANCELLED', async () => {
      // Create new CONFIRMED appt
      const resNew = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '17:00',
          endTime: '17:30',
        });

      const apptId = resNew.body.data.appointment.id;

      const resCancel = await request(app)
        .patch(`/api/appointments/${apptId}/cancel`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ cancellationReason: 'Family emergency' });

      expect(resCancel.status).toBe(200);
      expect(resCancel.body.data.appointment.status).toBe('CANCELLED');
      expect(resCancel.body.data.appointment.cancellationReason).toBe('Family emergency');
    });
  });

  describe('4. RBAC, Tenant Isolation & Authorization Enforcement', () => {
    let isolatedApptId;
    const testDate = getFutureDate(15);

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          doctorId: doctorProfileA._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          appointmentDate: testDate,
          startTime: '08:00',
          endTime: '08:30',
        });
      isolatedApptId = res.body.data.appointment.id;
    });

    it('4.1 Uninvolved Doctor B cannot view Doctor A appointment by ID (403)', async () => {
      const res = await request(app)
        .get(`/api/appointments/${isolatedApptId}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('APPOINTMENT_ACCESS_FORBIDDEN');
    });

    it('4.2 Uninvolved Patient 2 cannot view Patient 1 appointment by ID (403)', async () => {
      const res = await request(app)
        .get(`/api/appointments/${isolatedApptId}`)
        .set('Authorization', `Bearer ${patientToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('APPOINTMENT_ACCESS_FORBIDDEN');
    });

    it('4.3 Hospital Admin B cannot view Hospital A appointment by ID (403)', async () => {
      const res = await request(app)
        .get(`/api/appointments/${isolatedApptId}`)
        .set('Authorization', `Bearer ${hospAdminBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('APPOINTMENT_ACCESS_FORBIDDEN');
    });

    it('4.4 Hospital Admin A CAN view Hospital A appointment by ID (200)', async () => {
      const res = await request(app)
        .get(`/api/appointments/${isolatedApptId}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.id).toBe(isolatedApptId);
    });

    it('4.5 System Admin CAN view any appointment by ID (200)', async () => {
      const res = await request(app)
        .get(`/api/appointments/${isolatedApptId}`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.appointment.id).toBe(isolatedApptId);
    });

    it('4.6 List appointments: Doctor sees only their own appointments', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.appointments)).toBe(true);
      res.body.data.appointments.forEach((appt) => {
        expect(appt.doctor._id || appt.doctor.id).toBe(doctorProfileA._id.toString());
      });
    });

    it('4.7 List appointments: Patient sees only their own appointments', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.appointments)).toBe(true);
      res.body.data.appointments.forEach((appt) => {
        expect(appt.patient._id || appt.patient.id).toBe(patientProfile1._id.toString());
      });
    });

    it('4.8 List appointments: Hospital Admin A sees only Hospital A appointments', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.appointments)).toBe(true);
      res.body.data.appointments.forEach((appt) => {
        expect(appt.hospital._id || appt.hospital.id).toBe(hospitalA._id.toString());
      });
    });
  });
});
