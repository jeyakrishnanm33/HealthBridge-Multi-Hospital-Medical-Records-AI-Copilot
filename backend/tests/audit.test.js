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
const { MedicalRecord } = require('../src/models/MedicalRecord');
const { VisitRecord } = require('../src/models/VisitRecord');
const { AccessRequest } = require('../src/models/AccessRequest');
const { Consent } = require('../src/models/Consent');
const { AuditLog } = require('../src/models/AuditLog');
const auditService = require('../src/services/auditService');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Audit Logging & Security Audit Trail Tests (Phase 9)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;
  let doctorUser, doctorToken, doctorProfile;
  let patientUser, patientToken, patientProfile;

  let hospitalA, hospitalB;
  let affiliationA;
  let membershipA;
  let assignmentA;

  let testAuditLogA, testAuditLogB;

  beforeAll(async () => {
    await connectDB();

    // Clean up
    await User.deleteMany({ email: /test-p9-audit\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P9AUD$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Create System Admin
    sysAdminUser = await User.create({
      name: 'System Auditor',
      email: 'sysadmin@test-p9-audit.local',
      passwordHash: 'dummyhash',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: sysAdminUser.role });

    // 2. Create Hospital Admin A & Hospital A
    hospAdminA = await User.create({
      name: 'Hospital A Admin',
      email: 'admina@test-p9-audit.local',
      passwordHash: 'dummyhash',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: hospAdminA.role });

    hospitalA = await Hospital.create({
      name: 'Apollo Audit Hospital',
      hospitalCode: 'APO-P9AUD',
      address: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
      contactEmail: 'admin@apollo-audit.local',
      contactPhone: '+91 9999999901',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    // 3. Create Hospital Admin B & Hospital B
    hospAdminB = await User.create({
      name: 'Hospital B Admin',
      email: 'adminb@test-p9-audit.local',
      passwordHash: 'dummyhash',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: hospAdminB.role });

    hospitalB = await Hospital.create({
      name: 'Fortis Audit Hospital',
      hospitalCode: 'FOR-P9AUD',
      address: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
      contactEmail: 'admin@fortis-audit.local',
      contactPhone: '+91 9999999902',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
    });

    // 4. Create Doctor
    doctorUser = await User.create({
      name: 'Dr. Audit Physician',
      email: 'dr.audit@test-p9-audit.local',
      passwordHash: 'dummyhash',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorToken = generateToken({ sub: doctorUser._id.toString(), role: doctorUser.role });

    doctorProfile = await Doctor.create({
      user: doctorUser._id,
      fullName: 'Dr. Audit Physician',
      phone: '+91 9876543210',
      gender: 'MALE',
      dateOfBirth: new Date('1982-03-15'),
      medicalLicenseNumber: 'MCI-P9-9999',
      specialization: 'Internal Medicine',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 14,
      status: 'ACTIVE',
    });

    affiliationA = await DoctorHospitalAffiliation.create({
      doctor: doctorProfile._id,
      hospital: hospitalA._id,
      department: 'Medicine',
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    // 5. Create Patient
    patientUser = await User.create({
      name: 'Audit Patient',
      email: 'patient@test-p9-audit.local',
      passwordHash: 'dummyhash',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken = generateToken({ sub: patientUser._id.toString(), role: patientUser.role });

    patientProfile = await Patient.create({
      user: patientUser._id,
      patientId: 'PAT-AUD001',
      gender: 'FEMALE',
      dateOfBirth: new Date('1990-08-20'),
      bloodGroup: 'B+',
      phone: '+91 9888888801',
      address: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
      emergencyContact: { name: 'Emergency Contact', phone: '+91 9998887776', relationship: 'Spouse' },
      status: 'ACTIVE',
    });

    membershipA = await PatientHospitalMembership.create({
      patient: patientProfile._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    assignmentA = await DoctorPatientAssignment.create({
      doctor: doctorProfile._id,
      patient: patientProfile._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      assignedAt: new Date(),
      assignedBy: hospAdminA._id,
    });

    // Seed baseline test audit entries for Hospital A and Hospital B
    testAuditLogA = await AuditLog.create({
      actor: doctorUser._id,
      actorRole: 'DOCTOR',
      action: 'MEDICAL_RECORD_CREATED',
      resourceType: 'MEDICAL_RECORD',
      resourceId: 'rec-test-001',
      patient: patientProfile._id,
      hospital: hospitalA._id,
      result: 'SUCCESS',
      metadata: { recordType: 'VISIT' },
      requestId: 'req-corp-001',
    });

    testAuditLogB = await AuditLog.create({
      actor: hospAdminB._id,
      actorRole: 'HOSPITAL_ADMIN',
      action: 'HOSPITAL_STATUS_CHANGED',
      resourceType: 'HOSPITAL',
      resourceId: hospitalB._id.toString(),
      hospital: hospitalB._id,
      result: 'SUCCESS',
      metadata: { newStatus: 'APPROVED' },
      requestId: 'req-corp-002',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-p9-audit\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P9AUD$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});
    await AuditLog.deleteMany({});
    await disconnectDB();
  });

  describe('1. Audit Service & Model Integrity', () => {
    it('Creates an audit event successfully with all context fields', async () => {
      const log = await auditService.recordSuccess(
        'DOCTOR_PROFILE_CREATED',
        'DOCTOR',
        doctorProfile._id,
        {
          actor: doctorUser._id,
          actorRole: 'DOCTOR',
          hospital: hospitalA._id,
          patient: patientProfile._id,
          metadata: { specialization: 'Cardiology' },
          requestId: 'test-req-12345',
          ipAddress: '192.168.1.10',
          userAgent: 'Jest-Agent/1.0',
        }
      );

      expect(log).toBeDefined();
      expect(log.action).toBe('DOCTOR_PROFILE_CREATED');
      expect(log.resourceType).toBe('DOCTOR');
      expect(log.result).toBe('SUCCESS');
      expect(log.requestId).toBe('test-req-12345');
      expect(log.createdAt).toBeInstanceOf(Date);
      expect(log.metadata.specialization).toBe('Cardiology');
    });

    it('Records denied and failure events with reason codes', async () => {
      const deniedLog = await auditService.recordDenied(
        'ADMIN_CLINICAL_ACCESS_DENIED',
        'MEDICAL_RECORD',
        'rec-403',
        'ADMIN_CLINICAL_ACCESS_RESTRICTED',
        {
          actor: hospAdminA._id,
          actorRole: 'HOSPITAL_ADMIN',
        }
      );

      expect(deniedLog.result).toBe('DENIED');
      expect(deniedLog.reasonCode).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');

      const failedLog = await auditService.recordFailure(
        'LOGIN_FAILURE',
        'AUTHENTICATION',
        null,
        'INVALID_CREDENTIALS',
        {
          metadata: { attemptedEmail: 'hacker@test.com' },
        }
      );

      expect(failedLog.result).toBe('FAILURE');
      expect(failedLog.reasonCode).toBe('INVALID_CREDENTIALS');
    });

    it('Deeply sanitizes sensitive metadata (passwords, tokens, clinical secrets)', () => {
      const sensitiveInput = {
        email: 'doctor@hospital.com',
        password: 'SuperSecretPassword123',
        passwordHash: '$2b$10$abcdef...',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        authorization: 'Bearer secret_token',
        symptoms: ['Fever', 'Chest pain'],
        vitalSigns: { bloodPressure: '120/80' },
        normalInfo: {
          hospitalCode: 'APO-01',
          secretKey: 'should-be-redacted',
        },
      };

      const sanitized = auditService.sanitizeMetadata(sensitiveInput);

      expect(sanitized.email).toBe('doctor@hospital.com');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.symptoms).toBe('[REDACTED]');
      expect(sanitized.vitalSigns).toBe('[REDACTED]');
      expect(sanitized.normalInfo.hospitalCode).toBe('APO-01');
      expect(sanitized.normalInfo.secretKey).toBe('[REDACTED]');
    });

    it('Enforces immutability: pre-save hook blocks update to existing audit log', async () => {
      const log = await AuditLog.create({
        actor: sysAdminUser._id,
        actorRole: 'SYSTEM_ADMIN',
        action: 'SYSTEM',
        resourceType: 'SYSTEM',
        result: 'SUCCESS',
        action: 'USER_CREATED',
      });

      log.result = 'FAILURE';
      await expect(log.save()).rejects.toThrow(
        /Audit logs are immutable and cannot be modified/
      );
    });
  });

  describe('2. Role-Based Retrieval & Tenant Isolation', () => {
    it('SYSTEM_ADMIN can view platform-wide audit logs (200)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.auditLogs)).toBe(true);
      expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('HOSPITAL_ADMIN A lists only audit logs for Hospital A (200)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const logs = res.body.data.auditLogs;
      // All returned logs must be associated with Hospital A
      for (const log of logs) {
        if (log.hospital) {
          const hospId = log.hospital.id || log.hospital._id || log.hospital;
          expect(hospId.toString()).toBe(hospitalA._id.toString());
        }
      }

      // Must not contain Hospital B's test event
      const containsHospitalB = logs.some(
        (l) => (l.hospital?.id || l.hospital?._id || l.hospital) === hospitalB._id.toString()
      );
      expect(containsHospitalB).toBe(false);
    });

    it('Anti-Tampering: Hospital Admin A querying ?hospitalId=HospitalB is forced to Hospital A', async () => {
      const res = await request(app)
        .get(`/api/audit-logs?hospitalId=${hospitalB._id}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      const logs = res.body.data.auditLogs;

      // Cannot retrieve Hospital B events
      const containsHospitalB = logs.some(
        (l) => (l.hospital?.id || l.hospital?._id || l.hospital) === hospitalB._id.toString()
      );
      expect(containsHospitalB).toBe(false);
    });

    it('Hospital Admin A cannot retrieve Hospital B audit event by ID (403 HOSPITAL_ACCESS_FORBIDDEN)', async () => {
      const res = await request(app)
        .get(`/api/audit-logs/${testAuditLogB._id}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('System Admin CAN retrieve Hospital B audit event by ID (200)', async () => {
      const res = await request(app)
        .get(`/api/audit-logs/${testAuditLogB._id}`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.auditLog.id || res.body.data.auditLog._id).toBe(testAuditLogB._id.toString());
    });

    it('DOCTOR is forbidden from accessing audit logs (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('PATIENT is forbidden from accessing audit logs (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('Unauthenticated caller is rejected (401 TOKEN_MISSING)', async () => {
      const res = await request(app).get('/api/audit-logs');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });
  });

  describe('3. Filtering & Pagination', () => {
    it('Filters audit logs by action enum', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=MEDICAL_RECORD_CREATED')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      for (const log of res.body.data.auditLogs) {
        expect(log.action).toBe('MEDICAL_RECORD_CREATED');
      }
    });

    it('Filters audit logs by resourceType', async () => {
      const res = await request(app)
        .get('/api/audit-logs?resourceType=HOSPITAL')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      for (const log of res.body.data.auditLogs) {
        expect(log.resourceType).toBe('HOSPITAL');
      }
    });

    it('Filters audit logs by result (SUCCESS / DENIED)', async () => {
      const res = await request(app)
        .get('/api/audit-logs?result=DENIED')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      for (const log of res.body.data.auditLogs) {
        expect(log.result).toBe('DENIED');
      }
    });

    it('Rejects invalid action or resourceType filter with 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/audit-logs?action=INVALID_UNKNOWN_ACTION')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(400);
    });

    it('Supports pagination: page and limit parameters', async () => {
      const res = await request(app)
        .get('/api/audit-logs?page=1&limit=2')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.auditLogs.length).toBeLessThanOrEqual(2);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(2);
      expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('Rejects malformed ObjectId in URL parameter (400)', async () => {
      const res = await request(app)
        .get('/api/audit-logs/invalid-not-an-objectid')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('4. Security & Safety Invariants', () => {
    it('Rejects POST /api/audit-logs with 404 (clients cannot forge audit logs)', async () => {
      const res = await request(app)
        .post('/api/audit-logs')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({ action: 'LOGIN_SUCCESS' });

      expect(res.status).toBe(404);
    });

    it('Rejects PATCH /api/audit-logs/:id with 404', async () => {
      const res = await request(app)
        .patch(`/api/audit-logs/${testAuditLogA._id}`)
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({ result: 'DENIED' });

      expect(res.status).toBe(404);
    });

    it('Rejects DELETE /api/audit-logs/:id with 404', async () => {
      const res = await request(app)
        .delete(`/api/audit-logs/${testAuditLogA._id}`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('5. Request Correlation ID Propagation', () => {
    it('Preserves safe client-provided x-request-id in response header', async () => {
      const customRequestId = 'client-trace-abc-12345';
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .set('x-request-id', customRequestId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customRequestId);
    });

    it('Generates a new UUID correlation ID if x-request-id is missing', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(res.headers['x-request-id'].length).toBeGreaterThanOrEqual(16);
    });
  });

  describe('6. Domain Integration Events', () => {
    it('Authentication: successful login records LOGIN_SUCCESS', async () => {
      const loginEmail = 'audit-login-test@test-p9-audit.local';
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Login Test User',
          email: loginEmail,
          password: 'Password123!',
          role: 'PATIENT',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginEmail,
          password: 'Password123!',
        });

      expect(res.status).toBe(200);

      // Verify audit event exists
      const loginEvent = await AuditLog.findOne({
        action: 'LOGIN_SUCCESS',
        'metadata.email': loginEmail,
      });

      expect(loginEvent).toBeDefined();
      expect(loginEvent.result).toBe('SUCCESS');
      expect(loginEvent.resourceType).toBe('AUTHENTICATION');
    });

    it('Authentication: failed login with wrong password records LOGIN_FAILURE', async () => {
      const failEmail = 'audit-fail-test@test-p9-audit.local';
      await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Fail Test User',
          email: failEmail,
          password: 'Password123!',
          role: 'PATIENT',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: failEmail,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);

      // Verify audit failure event exists
      const failEvent = await AuditLog.findOne({
        action: 'LOGIN_FAILURE',
        'metadata.attemptedEmail': failEmail,
      });

      expect(failEvent).toBeDefined();
      expect(failEvent.result).toBe('DENIED');
      expect(failEvent.reasonCode).toBe('INVALID_CREDENTIALS');
    });

    it('Medical Records: creation records MEDICAL_RECORD_CREATED', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: patientProfile._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          content: {
            symptoms: ['Headache', 'Dizziness'],
            diagnosis: 'Tension headache',
            notes: 'Rest recommended',
          },
        });

      expect(res.status).toBe(201);
      const recordId = res.body.data.record.id || res.body.data.record._id;

      const recordEvent = await AuditLog.findOne({
        action: 'MEDICAL_RECORD_CREATED',
        resourceId: recordId,
      });

      expect(recordEvent).toBeDefined();
      expect(recordEvent.result).toBe('SUCCESS');
      expect(recordEvent.metadata.recordType).toBe('VISIT');
      // Verify clinical notes/symptoms were NOT leaked into audit metadata
      expect(recordEvent.metadata.notes).toBeUndefined();
      expect(recordEvent.metadata.symptoms).toBeUndefined();
    });

    it('Medical Records: admin clinical access restriction records ADMIN_CLINICAL_ACCESS_DENIED', async () => {
      const res = await request(app)
        .get(`/api/records/patient/${patientProfile._id}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);

      const deniedEvent = await AuditLog.findOne({
        action: 'ADMIN_CLINICAL_ACCESS_DENIED',
        actor: hospAdminA._id,
      });

      expect(deniedEvent).toBeDefined();
      expect(deniedEvent.result).toBe('DENIED');
      expect(deniedEvent.reasonCode).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });
  });
});
