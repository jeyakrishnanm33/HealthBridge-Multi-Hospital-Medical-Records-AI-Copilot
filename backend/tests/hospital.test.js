const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User } = require('../src/models/User');
const { Hospital } = require('../src/models/Hospital');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Hospitals & Hospital Administration Tests (Phase 3)', () => {
  let adminToken;
  let adminUser;
  let doctorToken;
  let doctorUser;
  let patientToken;
  let patientUser;

  beforeAll(async () => {
    await connectDB();

    // Clean up any test users & hospitals from previous runs
    await User.deleteMany({ email: /@test-hospitals\.local$/ });
    await Hospital.deleteMany({ 'address.city': 'TestCity' });

    // Seed test users: SYSTEM_ADMIN, DOCTOR, PATIENT
    adminUser = await User.create({
      name: 'Test System Admin',
      email: 'admin@test-hospitals.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    adminToken = generateToken({ sub: adminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    doctorUser = await User.create({
      name: 'Test Doctor',
      email: 'doctor@test-hospitals.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorToken = generateToken({ sub: doctorUser._id.toString(), role: 'DOCTOR' });

    patientUser = await User.create({
      name: 'Test Patient',
      email: 'patient@test-hospitals.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken = generateToken({ sub: patientUser._id.toString(), role: 'PATIENT' });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-hospitals\.local$/ });
    await Hospital.deleteMany({ 'address.city': 'TestCity' });
    await disconnectDB();
  });

  beforeEach(async () => {
    await Hospital.deleteMany({ 'address.city': 'TestCity' });
  });

  const validHospitalData = {
    name: 'HealthBridge General Hospital',
    hospitalCode: 'HOSP-GEN01',
    address: {
      street: '100 Healthcare Boulevard',
      city: 'TestCity',
      state: 'Tamil Nadu',
      postalCode: '600001',
      country: 'India',
    },
    contactEmail: 'contact@gen01.test-hospitals.local',
    contactPhone: '+91 98765 43210',
  };

  describe('POST /api/hospitals (Registration)', () => {
    it('should register a hospital defaulting to PENDING status and linking registeredBy', async () => {
      const res = await request(app)
        .post('/api/hospitals')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(validHospitalData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hospital).toMatchObject({
        name: validHospitalData.name,
        hospitalCode: 'HOSP-GEN01',
        status: 'PENDING',
      });
      expect(res.body.data.hospital.registeredBy.toString()).toBe(doctorUser._id.toString());
    });

    it('should prevent client from forcing APPROVED status during registration', async () => {
      const maliciousData = {
        ...validHospitalData,
        name: 'Chennai Care Medical Center',
        hospitalCode: 'HOSP-CC01',
        status: 'APPROVED', // Malicious attempt to bypass admin approval
      };

      const res = await request(app)
        .post('/api/hospitals')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(maliciousData);

      expect(res.status).toBe(201);
      // Backend must forcibly set status to PENDING
      expect(res.body.data.hospital.status).toBe('PENDING');
    });

    it('should reject unauthenticated hospital registration with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/hospitals')
        .send(validHospitalData);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });

    it('should reject registration with duplicate hospitalCode with 409 Conflict', async () => {
      // First registration
      await request(app)
        .post('/api/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(validHospitalData);

      // Duplicate attempt
      const res = await request(app)
        .post('/api/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...validHospitalData,
          name: 'Kongu Health Institute', // Different name, same code
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('HOSPITAL_CODE_ALREADY_EXISTS');
    });

    it('should reject registration when required fields are missing with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/hospitals')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Incomplete Hospital',
          // Missing address, contactEmail, contactPhone
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/hospitals (Listing)', () => {
    beforeEach(async () => {
      // Create two hospitals: one PENDING, one APPROVED
      const h1 = await Hospital.create({
        ...validHospitalData,
        name: 'HealthBridge General Hospital',
        hospitalCode: 'HOSP-GEN01',
        status: 'PENDING',
        registeredBy: adminUser._id,
      });

      const h2 = await Hospital.create({
        ...validHospitalData,
        name: 'Chennai Care Medical Center',
        hospitalCode: 'HOSP-CC01',
        status: 'APPROVED',
        registeredBy: doctorUser._id,
      });
    });

    it('should return all registered hospitals', async () => {
      const res = await request(app).get('/api/hospitals');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.hospitals)).toBe(true);
      expect(res.body.data.hospitals.length).toBeGreaterThanOrEqual(2);
    });

    it('should support filtering hospitals by status', async () => {
      const res = await request(app).get('/api/hospitals?status=APPROVED');

      expect(res.status).toBe(200);
      expect(res.body.data.hospitals.every((h) => h.status === 'APPROVED')).toBe(true);
    });
  });

  describe('GET /api/hospitals/:id (Details)', () => {
    let testHospital;

    beforeEach(async () => {
      testHospital = await Hospital.create({
        ...validHospitalData,
        registeredBy: doctorUser._id,
      });
    });

    it('should return 200 with hospital details for a valid ID', async () => {
      const res = await request(app).get(`/api/hospitals/${testHospital._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hospital.id).toBe(testHospital._id.toString());
      expect(res.body.data.hospital.name).toBe(validHospitalData.name);
    });

    it('should return 404 for a non-existent hospital ID', async () => {
      const nonExistentId = '65f000000000000000000000';
      const res = await request(app).get(`/api/hospitals/${nonExistentId}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_FOUND');
    });

    it('should return 400 for an invalid/malformed ObjectId', async () => {
      const res = await request(app).get('/api/hospitals/not-a-valid-id');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/hospitals/:id/status (Lifecycle & Authorization)', () => {
    let pendingHospital;

    beforeEach(async () => {
      pendingHospital = await Hospital.create({
        ...validHospitalData,
        status: 'PENDING',
        registeredBy: doctorUser._id,
      });
    });

    it('should allow SYSTEM_ADMIN to transition PENDING -> APPROVED', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.hospital.status).toBe('APPROVED');
    });

    it('should allow SYSTEM_ADMIN to transition PENDING -> REJECTED', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(200);
      expect(res.body.data.hospital.status).toBe('REJECTED');
    });

    it('should allow SYSTEM_ADMIN to transition APPROVED -> SUSPENDED', async () => {
      // First approve
      await Hospital.updateOne({ _id: pendingHospital._id }, { status: 'APPROVED' });

      // Then suspend
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(200);
      expect(res.body.data.hospital.status).toBe('SUSPENDED');
    });

    it('should reject invalid transition REJECTED -> APPROVED with 400 Bad Request', async () => {
      await Hospital.updateOne({ _id: pendingHospital._id }, { status: 'REJECTED' });

      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject invalid transition SUSPENDED -> APPROVED with 400 Bad Request', async () => {
      await Hospital.updateOne({ _id: pendingHospital._id }, { status: 'SUSPENDED' });

      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject invalid transition REJECTED -> SUSPENDED with 400 Bad Request', async () => {
      await Hospital.updateOne({ _id: pendingHospital._id }, { status: 'REJECTED' });

      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('should reject status update with invalid status value with 400 Bad Request', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'UNKNOWN_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unauthenticated status update with 401 Unauthorized', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });

    it('should forbid non-admin DOCTOR from updating status with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should forbid non-admin PATIENT from updating status with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHospital._id}/status`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });
});
