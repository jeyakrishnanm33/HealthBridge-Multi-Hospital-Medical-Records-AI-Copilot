const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User } = require('../src/models/User');
const { Hospital } = require('../src/models/Hospital');
const { Patient } = require('../src/models/Patient');
const { PatientHospitalMembership } = require('../src/models/PatientHospitalMembership');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Patients & Patient-Hospital Memberships Tests (Phase 4)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;
  let doctorUser, doctorToken;
  let patient1User, patient1Token;
  let patient2User, patient2Token;
  let patientNoProfileUser, patientNoProfileToken;

  let hospitalA;
  let hospitalB;
  let pendingHospital;
  let rejectedHospital;
  let suspendedHospital;

  beforeAll(async () => {
    await connectDB();

    // Clean up test collections
    await User.deleteMany({ email: /@test-phase4\.local$/ });
    await Hospital.deleteMany({ contactEmail: /@test-phase4\.local$/ });
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});

    // 1. Seed users
    sysAdminUser = await User.create({
      name: 'System Admin 4',
      email: 'sysadmin@test-phase4.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminA = await User.create({
      name: 'Hospital Admin A',
      email: 'adminA@test-phase4.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: 'HOSPITAL_ADMIN' });

    hospAdminB = await User.create({
      name: 'Hospital Admin B',
      email: 'adminB@test-phase4.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: 'HOSPITAL_ADMIN' });

    doctorUser = await User.create({
      name: 'Doctor Phase 4',
      email: 'doctor@test-phase4.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorToken = generateToken({ sub: doctorUser._id.toString(), role: 'DOCTOR' });

    patient1User = await User.create({
      name: 'Patient One',
      email: 'patient1@test-phase4.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patient1Token = generateToken({ sub: patient1User._id.toString(), role: 'PATIENT' });

    patient2User = await User.create({
      name: 'Patient Two',
      email: 'patient2@test-phase4.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patient2Token = generateToken({ sub: patient2User._id.toString(), role: 'PATIENT' });

    patientNoProfileUser = await User.create({
      name: 'Patient No Profile',
      email: 'patientnoprofile@test-phase4.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientNoProfileToken = generateToken({
      sub: patientNoProfileUser._id.toString(),
      role: 'PATIENT',
    });

    // 2. Seed hospitals
    hospitalA = await Hospital.create({
      name: 'Apollo Hospital Phase4',
      hospitalCode: 'HOSP-APL04',
      address: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
      contactEmail: 'contactA@test-phase4.local',
      contactPhone: '9876543210',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    hospitalB = await Hospital.create({
      name: 'Fortis Hospital Phase4',
      hospitalCode: 'HOSP-FOR04',
      address: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
      contactEmail: 'contactB@test-phase4.local',
      contactPhone: '9876543220',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
    });

    pendingHospital = await Hospital.create({
      name: 'Pending Hospital Phase4',
      hospitalCode: 'HOSP-PND04',
      address: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
      contactEmail: 'contactPnd@test-phase4.local',
      contactPhone: '9876543230',
      status: 'PENDING',
      registeredBy: hospAdminA._id,
    });

    rejectedHospital = await Hospital.create({
      name: 'Rejected Hospital Phase4',
      hospitalCode: 'HOSP-REJ04',
      address: { city: 'Kochi', state: 'Kerala', country: 'India' },
      contactEmail: 'contactRej@test-phase4.local',
      contactPhone: '9876543240',
      status: 'REJECTED',
      registeredBy: hospAdminA._id,
    });

    suspendedHospital = await Hospital.create({
      name: 'Suspended Hospital Phase4',
      hospitalCode: 'HOSP-SUS04',
      address: { city: 'Pune', state: 'Maharashtra', country: 'India' },
      contactEmail: 'contactSus@test-phase4.local',
      contactPhone: '9876543250',
      status: 'SUSPENDED',
      registeredBy: hospAdminA._id,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-phase4\.local$/ });
    await Hospital.deleteMany({ contactEmail: /@test-phase4\.local$/ });
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await disconnectDB();
  });

  const validProfileData = {
    dateOfBirth: '2001-05-15',
    gender: 'MALE',
    bloodGroup: 'O+',
    phone: '9876543210',
    address: {
      street: '123 Cross Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India',
    },
    emergencyContact: {
      name: 'John Doe',
      relationship: 'Brother',
      phone: '9876543211',
    },
  };

  // ==========================================
  // 1. Patient Profile Creation
  // ==========================================
  describe('POST /api/patients/profile — Create Patient Profile', () => {
    it('allows PATIENT to create profile and returns 201 with generated patientId', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send(validProfileData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient).toBeDefined();

      const patient = res.body.data.patient;
      expect(patient.patientId).toMatch(/^PAT-[0-9A-F]{6}$/);
      expect(patient.status).toBe('ACTIVE');
      expect(patient.gender).toBe('MALE');
      expect(patient.bloodGroup).toBe('O+');
      expect(patient.user.id).toBe(patient1User._id.toString());
      expect(patient.user.email).toBe(patient1User.email);
      expect(patient.user.passwordHash).toBeUndefined();
    });

    it('rejects duplicate profile creation for same user with 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send(validProfileData);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PATIENT_PROFILE_EXISTS');
    });

    it('rejects client attempting to force patientId, status, or user via request body', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          ...validProfileData,
          patientId: 'PAT-HACKED',
          status: 'INACTIVE',
          user: sysAdminUser._id.toString(),
        });

      // Zod schema is strict so extra fields produce 400 validation error
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('creates patient2 profile properly', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${patient2Token}`)
        .send({
          ...validProfileData,
          gender: 'FEMALE',
          bloodGroup: 'B+',
          phone: '9876543299',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.patient.patientId).toMatch(/^PAT-[0-9A-F]{6}$/);
      // Verify unique patientId
      const p1 = await Patient.findOne({ user: patient1User._id });
      const p2 = await Patient.findOne({ user: patient2User._id });
      expect(p1.patientId).not.toBe(p2.patientId);
    });

    it('forbids DOCTOR role from creating patient profile (403)', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(validProfileData);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('forbids HOSPITAL_ADMIN from creating patient profile (403)', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send(validProfileData);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('forbids SYSTEM_ADMIN from creating patient profile (403)', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send(validProfileData);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/patients/profile').send(validProfileData);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });

    it('rejects malformed date of birth with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/patients/profile')
        .set('Authorization', `Bearer ${patientNoProfileToken}`)
        .send({
          ...validProfileData,
          dateOfBirth: 'not-a-valid-date',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // 2. Profile Retrieval
  // ==========================================
  describe('GET /api/patients/me — Get Current Patient Profile', () => {
    it('retrieves authenticated patient profile without exposing sensitive fields', async () => {
      const res = await request(app)
        .get('/api/patients/me')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const patient = res.body.data.patient;
      expect(patient.patientId).toBeDefined();
      expect(patient.phone).toBe('9876543210');
      expect(patient.user.email).toBe('patient1@test-phase4.local');
      expect(patient.user.passwordHash).toBeUndefined();
    });

    it('returns 404 when user has no patient profile created yet', async () => {
      const res = await request(app)
        .get('/api/patients/me')
        .set('Authorization', `Bearer ${patientNoProfileToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PATIENT_PROFILE_NOT_FOUND');
    });

    it('returns 401 for unauthenticated request', async () => {
      const res = await request(app).get('/api/patients/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });
  });

  // ==========================================
  // 3. Profile Update
  // ==========================================
  describe('PATCH /api/patients/me — Update Current Patient Profile', () => {
    it('allows patient to update allowed fields (phone, address, emergencyContact, bloodGroup)', async () => {
      const updateData = {
        phone: '9988776655',
        bloodGroup: 'AB+',
        address: {
          city: 'Coimbatore',
          state: 'Tamil Nadu',
        },
        emergencyContact: {
          name: 'Jane Doe',
          relationship: 'Sister',
          phone: '9988776644',
        },
      };

      const res = await request(app)
        .patch('/api/patients/me')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patient.phone).toBe('9988776655');
      expect(res.body.data.patient.bloodGroup).toBe('AB+');
      expect(res.body.data.patient.address.city).toBe('Coimbatore');
      expect(res.body.data.patient.emergencyContact.name).toBe('Jane Doe');
    });

    it('rejects attempt to modify patientId, user, or status with 400', async () => {
      const res = await request(app)
        .patch('/api/patients/me')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({
          patientId: 'PAT-CHANGED',
          status: 'INACTIVE',
          user: sysAdminUser._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      // Verify DB was not modified
      const p1 = await Patient.findOne({ user: patient1User._id });
      expect(p1.patientId).not.toBe('PAT-CHANGED');
      expect(p1.status).toBe('ACTIVE');
    });
  });

  // ==========================================
  // 4. Membership Creation
  // ==========================================
  describe('POST /api/patients/me/hospitals/:hospitalId/membership', () => {
    let createdMembershipId;

    it('allows patient to request membership to an APPROVED hospital with status PENDING', async () => {
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${hospitalA._id}/membership`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.membership.status).toBe('PENDING');
      expect(res.body.data.membership.hospital.name).toBe('Apollo Hospital Phase4');

      createdMembershipId = res.body.data.membership.id;
    });

    it('rejects duplicate membership request to the same hospital with 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${hospitalA._id}/membership`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MEMBERSHIP_EXISTS');
    });

    it('rejects membership request to a PENDING hospital with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${pendingHospital._id}/membership`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('rejects membership request to a REJECTED hospital with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${rejectedHospital._id}/membership`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('rejects membership request to a SUSPENDED hospital with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${suspendedHospital._id}/membership`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('returns 404 for non-existent hospital ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${fakeId}/membership`)
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_FOUND');
    });

    it('rejects malformed hospital ID with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/patients/me/hospitals/not-valid-object-id/membership')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('forbids DOCTOR from requesting hospital membership (403)', async () => {
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${hospitalA._id}/membership`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('forbids HOSPITAL_ADMIN from requesting hospital membership (403)', async () => {
      const res = await request(app)
        .post(`/api/patients/me/hospitals/${hospitalA._id}/membership`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated membership request with 401', async () => {
      const res = await request(app).post(
        `/api/patients/me/hospitals/${hospitalA._id}/membership`
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });
  });

  // ==========================================
  // 5. Membership Retrieval
  // ==========================================
  describe('GET Memberships (Patient & Hospital Admin)', () => {
    beforeAll(async () => {
      // Create membership for Patient 2 in Hospital B
      await request(app)
        .post(`/api/patients/me/hospitals/${hospitalB._id}/membership`)
        .set('Authorization', `Bearer ${patient2Token}`);
    });

    it('allows patient to retrieve only their own memberships', async () => {
      const res = await request(app)
        .get('/api/patients/me/hospitals')
        .set('Authorization', `Bearer ${patient1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.memberships)).toBe(true);
      expect(res.body.data.memberships.length).toBe(1);
      expect(res.body.data.memberships[0].hospital.hospitalCode).toBe('HOSP-APL04');
    });

    it('allows Hospital Admin A to retrieve memberships for Hospital A', async () => {
      const res = await request(app)
        .get(`/api/hospitals/${hospitalA._id}/memberships`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.memberships.length).toBe(1);
      expect(res.body.data.memberships[0].patient.patientId).toBeDefined();
      expect(res.body.data.memberships[0].patient.user.name).toBe('Patient One');
    });

    it('allows SYSTEM_ADMIN to retrieve memberships for any hospital', async () => {
      const res = await request(app)
        .get(`/api/hospitals/${hospitalA._id}/memberships`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.memberships.length).toBe(1);
    });

    it('enforces tenant isolation: Hospital Admin A cannot retrieve Hospital B memberships (403)', async () => {
      const res = await request(app)
        .get(`/api/hospitals/${hospitalB._id}/memberships`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('forbids DOCTOR and PATIENT from accessing hospital memberships endpoint (403)', async () => {
      const resDoctor = await request(app)
        .get(`/api/hospitals/${hospitalA._id}/memberships`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(resDoctor.status).toBe(403);

      const resPatient = await request(app)
        .get(`/api/hospitals/${hospitalA._id}/memberships`)
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(resPatient.status).toBe(403);
    });
  });

  // ==========================================
  // 6. Membership State Machine Lifecycle
  // ==========================================
  describe('PATCH /api/hospitals/:hospitalId/memberships/:membershipId/status — State Machine', () => {
    let testMembership;

    beforeEach(async () => {
      // Re-create a clean PENDING membership for testing state transitions
      await PatientHospitalMembership.deleteMany({});
      const patient1 = await Patient.findOne({ user: patient1User._id });
      testMembership = await PatientHospitalMembership.create({
        patient: patient1._id,
        hospital: hospitalA._id,
        status: 'PENDING',
      });
    });

    it('transitions PENDING -> ACTIVE and populates approvedAt, joinedAt, approvedBy', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.membership.status).toBe('ACTIVE');
      expect(res.body.data.membership.approvedAt).toBeDefined();
      expect(res.body.data.membership.joinedAt).toBeDefined();
      expect(res.body.data.membership.approvedBy.id).toBe(hospAdminA._id.toString());
    });

    it('transitions PENDING -> REJECTED and populates approvedAt, approvedBy', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(200);
      expect(res.body.data.membership.status).toBe('REJECTED');
      expect(res.body.data.membership.approvedAt).toBeDefined();
      expect(res.body.data.membership.joinedAt).toBeNull();
      expect(res.body.data.membership.approvedBy.id).toBe(hospAdminA._id.toString());
    });

    it('transitions ACTIVE -> INACTIVE without overwriting historical approvedAt', async () => {
      // First move to ACTIVE
      testMembership.status = 'ACTIVE';
      testMembership.joinedAt = new Date('2026-01-01');
      testMembership.approvedAt = new Date('2026-01-01');
      testMembership.approvedBy = hospAdminA._id;
      await testMembership.save();

      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.membership.status).toBe('INACTIVE');
      expect(new Date(res.body.data.membership.approvedAt).toISOString()).toBe(
        new Date('2026-01-01').toISOString()
      );
    });

    it('forbids invalid transitions: REJECTED -> ACTIVE (400)', async () => {
      testMembership.status = 'REJECTED';
      await testMembership.save();

      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MEMBERSHIP_STATUS_TRANSITION');
    });

    it('forbids invalid transitions: REJECTED -> INACTIVE (400)', async () => {
      testMembership.status = 'REJECTED';
      await testMembership.save();

      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MEMBERSHIP_STATUS_TRANSITION');
    });

    it('forbids invalid transitions: INACTIVE -> ACTIVE (400)', async () => {
      testMembership.status = 'INACTIVE';
      await testMembership.save();

      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MEMBERSHIP_STATUS_TRANSITION');
    });

    it('forbids invalid transitions: INACTIVE -> REJECTED (400)', async () => {
      testMembership.status = 'INACTIVE';
      await testMembership.save();

      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MEMBERSHIP_STATUS_TRANSITION');
    });

    it('forbids invalid transitions: ACTIVE -> REJECTED (400)', async () => {
      testMembership.status = 'ACTIVE';
      await testMembership.save();

      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MEMBERSHIP_STATUS_TRANSITION');
    });

    it('rejects setting status back to PENDING (400 validation)', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${testMembership._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'PENDING' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================
  // 7. Cross-Hospital Isolation & Tenant Security
  // ==========================================
  describe('Tenant & Isolation Security Tests', () => {
    let membershipInHospitalB;

    beforeAll(async () => {
      const patient2 = await Patient.findOne({ user: patient2User._id });
      membershipInHospitalB = await PatientHospitalMembership.create({
        patient: patient2._id,
        hospital: hospitalB._id,
        status: 'PENDING',
      });
    });

    it('Admin A cannot PATCH status of membership belonging to Hospital B (403)', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/memberships/${membershipInHospitalB._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('Admin A cannot use Hospital A route to modify membership belonging to Hospital B (404)', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/memberships/${membershipInHospitalB._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MEMBERSHIP_NOT_FOUND');
    });

    it('Admin B can update membership belonging to Hospital B', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/memberships/${membershipInHospitalB._id}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.membership.status).toBe('ACTIVE');
    });
  });
});
