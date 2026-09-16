const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User } = require('../src/models/User');
const { Hospital } = require('../src/models/Hospital');
const { Doctor } = require('../src/models/Doctor');
const { DoctorHospitalAffiliation } = require('../src/models/DoctorHospitalAffiliation');
const { generateToken } = require('../src/utils/jwt');
const {
  isDoctor,
  hasActiveDoctorProfile,
  hasActiveHospitalAffiliation,
} = require('../src/policies/doctorPolicy');

describe('HealthBridge Doctors & Clinical Roles Tests (Phase 5)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;
  let doctor1User, doctor1Token;
  let doctor2User, doctor2Token;
  let doctorNoProfileUser, doctorNoProfileToken;
  let patientUser, patientToken;

  let hospitalA;
  let hospitalB;
  let pendingHospital;
  let rejectedHospital;
  let suspendedHospital;

  beforeAll(async () => {
    await connectDB();

    // Clean up test collections
    await User.deleteMany({ email: /test-phase5\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P5$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});

    // 1. Seed users
    sysAdminUser = await User.create({
      name: 'System Admin 5',
      email: 'sysadmin@test-phase5.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminA = await User.create({
      name: 'Hospital Admin A5',
      email: 'adminA@test-phase5.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: 'HOSPITAL_ADMIN' });

    hospAdminB = await User.create({
      name: 'Hospital Admin B5',
      email: 'adminB@test-phase5.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: 'HOSPITAL_ADMIN' });

    doctor1User = await User.create({
      name: 'Dr. John Watson',
      email: 'dr.watson@test-phase5.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctor1Token = generateToken({ sub: doctor1User._id.toString(), role: 'DOCTOR' });

    doctor2User = await User.create({
      name: 'Dr. Gregory House',
      email: 'dr.house@test-phase5.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctor2Token = generateToken({ sub: doctor2User._id.toString(), role: 'DOCTOR' });

    doctorNoProfileUser = await User.create({
      name: 'Dr. Newbie',
      email: 'dr.newbie@test-phase5.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorNoProfileToken = generateToken({ sub: doctorNoProfileUser._id.toString(), role: 'DOCTOR' });

    patientUser = await User.create({
      name: 'Patient Phase 5',
      email: 'patient@test-phase5.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken = generateToken({ sub: patientUser._id.toString(), role: 'PATIENT' });

    // 2. Seed hospitals
    hospitalA = await Hospital.create({
      name: 'Metro City Hospital Phase 5',
      hospitalCode: 'MCH-P5',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
      address: { street: '123 Health Ave', city: 'Metro', state: 'State', postalCode: '12345' },
      contactEmail: 'contact@mch-p5.test-phase5.local',
      contactPhone: '+919876543210',
    });

    hospitalB = await Hospital.create({
      name: 'Apex Care Hospital Phase 5',
      hospitalCode: 'ACH-P5',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
      address: { street: '456 Wellness Blvd', city: 'Apex City', state: 'State', postalCode: '54321' },
      contactEmail: 'contact@ach-p5.test-phase5.local',
      contactPhone: '+919876543211',
    });

    pendingHospital = await Hospital.create({
      name: 'Pending General Hospital Phase 5',
      hospitalCode: 'PGH-P5',
      status: 'PENDING',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
      address: { street: '789 Clinic Rd', city: 'Pending Town', state: 'State', postalCode: '99999' },
      contactEmail: 'contact@pgh-p5.test-phase5.local',
      contactPhone: '+919876543212',
    });

    rejectedHospital = await Hospital.create({
      name: 'Rejected Hospital Phase 5',
      hospitalCode: 'RJH-P5',
      status: 'REJECTED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
      address: { street: '321 Denied Way', city: 'Denied City', state: 'State', postalCode: '88888' },
      contactEmail: 'contact@rjh-p5.test-phase5.local',
      contactPhone: '+919876543213',
    });

    suspendedHospital = await Hospital.create({
      name: 'Suspended Hospital Phase 5',
      hospitalCode: 'SPH-P5',
      status: 'SUSPENDED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
      address: { street: '654 Hold St', city: 'Hold City', state: 'State', postalCode: '77777' },
      contactEmail: 'contact@sph-p5.test-phase5.local',
      contactPhone: '+919876543214',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-phase5\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P5$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await disconnectDB();
  });

  // ==========================================
  // DOCTOR PROFILE TESTS (1 - 10)
  // ==========================================
  describe('Doctor Profile Management', () => {
    const validDoctorData = {
      fullName: 'Dr. John Watson',
      phone: '+919876543220',
      gender: 'MALE',
      dateOfBirth: '1982-07-15',
      medicalLicenseNumber: 'MCI-88291',
      specialization: 'General Medicine',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 12,
    };

    it('1. Doctor can create profile with valid credentials', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send(validDoctorData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctor).toBeDefined();
      expect(res.body.data.doctor.fullName).toBe('Dr. John Watson');
      expect(res.body.data.doctor.medicalLicenseNumber).toBe('MCI-88291');
      expect(res.body.data.doctor.specialization).toBe('General Medicine');
      expect(res.body.data.doctor.qualifications).toEqual(['MBBS', 'MD']);
      expect(res.body.data.doctor.yearsOfExperience).toBe(12);
      expect(res.body.data.doctor.status).toBe('PENDING');
      expect(res.body.data.doctor.user).toBeDefined();
      expect(res.body.data.doctor.user.email).toBe('dr.watson@test-phase5.local');
    });

    it('2. Duplicate profile for same user returns 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          ...validDoctorData,
          medicalLicenseNumber: 'MCI-99999',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_PROFILE_EXISTS');
    });

    it('2b. Duplicate medical license number for another doctor returns 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${doctor2Token}`)
        .send({
          ...validDoctorData,
          fullName: 'Dr. Gregory House',
          medicalLicenseNumber: 'MCI-88291', // Same license as Doctor 1
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_PROFILE_EXISTS');
    });

    it('3. Non-doctor (PATIENT) cannot create doctor profile (403)', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          ...validDoctorData,
          medicalLicenseNumber: 'MCI-77777',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('3b. Non-doctor (HOSPITAL_ADMIN) cannot create doctor profile (403)', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          ...validDoctorData,
          medicalLicenseNumber: 'MCI-66666',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('4. Unauthenticated request rejected (401)', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .send(validDoctorData);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('5. Doctor can retrieve own profile via GET /api/doctors/me', async () => {
      const res = await request(app)
        .get('/api/doctors/me')
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctor.fullName).toBe('Dr. John Watson');
      expect(res.body.data.doctor.medicalLicenseNumber).toBe('MCI-88291');
    });

    it('6. Doctor without profile receives 404 on GET /api/doctors/me', async () => {
      const res = await request(app)
        .get('/api/doctors/me')
        .set('Authorization', `Bearer ${doctorNoProfileToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_PROFILE_NOT_FOUND');
    });

    it('7. Allowed profile updates succeed (PATCH /api/doctors/me)', async () => {
      const res = await request(app)
        .patch('/api/doctors/me')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          phone: '+919876543999',
          specialization: 'Internal Medicine & Cardiology',
          qualifications: ['MBBS', 'MD', 'MRCP'],
          yearsOfExperience: 14,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.doctor.phone).toBe('+919876543999');
      expect(res.body.data.doctor.specialization).toBe('Internal Medicine & Cardiology');
      expect(res.body.data.doctor.qualifications).toEqual(['MBBS', 'MD', 'MRCP']);
      expect(res.body.data.doctor.yearsOfExperience).toBe(14);
    });

    it('8. Attempt to modify user reference is rejected (400 strict)', async () => {
      const res = await request(app)
        .patch('/api/doctors/me')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          user: doctor2User._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('9. Attempt to modify status directly is rejected (400 strict)', async () => {
      const res = await request(app)
        .patch('/api/doctors/me')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          status: 'ACTIVE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('10. Attempt to modify protected medicalLicenseNumber is rejected (400 strict)', async () => {
      const res = await request(app)
        .patch('/api/doctors/me')
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({
          medicalLicenseNumber: 'MCI-ALTERED',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================
  // HOSPITAL AFFILIATION TESTS (11 - 17)
  // ==========================================
  describe('Doctor Hospital Affiliation Requests', () => {
    let affiliation1Id;

    it('11. Doctor can request affiliation with an APPROVED hospital', async () => {
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${hospitalA._id}/affiliation`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({ department: 'Cardiology' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affiliation).toBeDefined();
      expect(res.body.data.affiliation.status).toBe('PENDING');
      expect(res.body.data.affiliation.department).toBe('Cardiology');
      expect(res.body.data.affiliation.hospital.name).toBe('Metro City Hospital Phase 5');

      affiliation1Id = res.body.data.affiliation.id;
    });

    it('12. Duplicate affiliation request returns 409 Conflict', async () => {
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${hospitalA._id}/affiliation`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({ department: 'General' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_AFFILIATION_EXISTS');
    });

    it('13. Unauthenticated affiliation request rejected (401)', async () => {
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${hospitalA._id}/affiliation`)
        .send({ department: 'Cardiology' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('14. Non-doctor (PATIENT) affiliation request rejected (403)', async () => {
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${hospitalA._id}/affiliation`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ department: 'Cardiology' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('15. Affiliation request to non-existent hospital returns 404', async () => {
      const fakeHospitalId = '654321654321654321654321';
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${fakeHospitalId}/affiliation`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({});

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_FOUND');
    });

    it('16. Affiliation request to PENDING hospital returns 400 HOSPITAL_NOT_APPROVED', async () => {
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${pendingHospital._id}/affiliation`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('16b. Affiliation request to REJECTED hospital returns 400 HOSPITAL_NOT_APPROVED', async () => {
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${rejectedHospital._id}/affiliation`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('16c. Affiliation request to SUSPENDED hospital returns 400 HOSPITAL_NOT_APPROVED', async () => {
      const res = await request(app)
        .post(`/api/doctors/me/hospitals/${suspendedHospital._id}/affiliation`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('17. Doctor can list own affiliations via GET /api/doctors/me/hospitals', async () => {
      const res = await request(app)
        .get('/api/doctors/me/hospitals')
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.affiliations)).toBe(true);
      expect(res.body.data.affiliations.length).toBe(1);
      expect(res.body.data.affiliations[0].hospital.hospitalCode).toBe('MCH-P5');
    });
  });

  // ==========================================
  // HOSPITAL ADMIN MANAGEMENT & STATE MACHINE (18 - 32)
  // ==========================================
  describe('Hospital Admin Doctor Affiliation Management & State Machine', () => {
    let affiliationAId;
    let affiliationBId;

    beforeAll(async () => {
      // Create profile for Doctor 2
      await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${doctor2Token}`)
        .send({
          fullName: 'Dr. Gregory House',
          phone: '+919876543221',
          gender: 'MALE',
          dateOfBirth: '1975-05-15',
          medicalLicenseNumber: 'MCI-77382',
          specialization: 'Diagnostic Medicine',
          qualifications: ['MBBS', 'MD', 'PhD'],
          yearsOfExperience: 20,
        });

      // Doctor 1 requests affiliation with Hospital B
      const resB = await request(app)
        .post(`/api/doctors/me/hospitals/${hospitalB._id}/affiliation`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({ department: 'ICU' });
      affiliationBId = resB.body.data.affiliation.id;

      // Doctor 2 requests affiliation with Hospital A
      const resA = await request(app)
        .post(`/api/doctors/me/hospitals/${hospitalA._id}/affiliation`)
        .set('Authorization', `Bearer ${doctor2Token}`)
        .send({ department: 'Diagnostics' });
      affiliationAId = resA.body.data.affiliation.id;
    });

    it('18. Hospital Admin A can list doctors affiliated with Hospital A', async () => {
      const res = await request(app)
        .get(`/api/hospitals/${hospitalA._id}/doctors`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.affiliations)).toBe(true);
      expect(res.body.data.affiliations.length).toBe(2); // Watson & House
    });

    it('19. Hospital Admin A can approve pending affiliation (PENDING -> ACTIVE)', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/doctors/${affiliationAId}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affiliation.status).toBe('ACTIVE');
      expect(res.body.data.affiliation.approvedAt).toBeDefined();
      expect(res.body.data.affiliation.approvedBy.email).toBe('admina@test-phase5.local');

      // Verify doctor profile was activated from PENDING to ACTIVE
      const doctorProfile = await Doctor.findOne({ user: doctor2User._id });
      expect(doctorProfile.status).toBe('ACTIVE');
    });

    it('20. Hospital Admin B can reject pending affiliation (PENDING -> REJECTED)', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${affiliationBId}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affiliation.status).toBe('REJECTED');
      expect(res.body.data.affiliation.approvedAt).toBeDefined();
      expect(res.body.data.affiliation.approvedBy.email).toBe('adminb@test-phase5.local');
    });

    it('21. Hospital Admin A can suspend active affiliation (ACTIVE -> SUSPENDED)', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/doctors/${affiliationAId}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affiliation.status).toBe('SUSPENDED');
      // Preserves historical approval metadata
      expect(res.body.data.affiliation.approvedAt).toBeDefined();
      expect(res.body.data.affiliation.approvedBy.email).toBe('admina@test-phase5.local');
    });

    it('22. Hospital Admin A cannot manage Hospital B doctors (403 HOSPITAL_ACCESS_FORBIDDEN)', async () => {
      const res = await request(app)
        .get(`/api/hospitals/${hospitalB._id}/doctors`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('22b. Hospital Admin A cannot PATCH Hospital B doctor status (403 HOSPITAL_ACCESS_FORBIDDEN)', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${affiliationBId}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('23. System Admin can view and manage affiliations across any hospital', async () => {
      const res = await request(app)
        .get(`/api/hospitals/${hospitalA._id}/doctors`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    // Invalid state machine transitions
    it('27. State machine: REJECTED -> ACTIVE rejected with 400', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${affiliationBId}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION');
    });

    it('28. State machine: REJECTED -> SUSPENDED rejected with 400', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${affiliationBId}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'SUSPENDED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION');
    });

    it('29. State machine: SUSPENDED -> ACTIVE rejected with 400', async () => {
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/doctors/${affiliationAId}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION');
    });

    it('30. State machine: ACTIVE -> REJECTED rejected with 400', async () => {
      // Create a fresh affiliation for Doctor 2 with Hospital B
      const doc2 = await Doctor.findOne({ user: doctor2User._id });
      const freshAffiliation = await DoctorHospitalAffiliation.create({
        doctor: doc2._id,
        hospital: hospitalB._id,
        status: 'PENDING',
      });

      // PENDING -> ACTIVE
      await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${freshAffiliation._id}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'ACTIVE' });

      // ACTIVE -> REJECTED (Forbidden)
      const res = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${freshAffiliation._id}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'REJECTED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION');
    });


    it('31. Doctor cannot become ACTIVE under an unapproved or suspended hospital', async () => {
      const doc1 = await Doctor.findOne({ user: doctor1User._id });
      // Create a test affiliation directly in suspended hospital
      const suspendedAffiliation = await DoctorHospitalAffiliation.create({
        doctor: doc1._id,
        hospital: suspendedHospital._id,
        status: 'PENDING',
      });

      const res = await request(app)
        .patch(`/api/hospitals/${suspendedHospital._id}/doctors/${suspendedAffiliation._id}/status`)
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('32. Clinical policy tests: hasActiveHospitalAffiliation returns false for suspended hospital', () => {
      const activeAffiliation = { status: 'ACTIVE' };
      const approvedHospital = { status: 'APPROVED' };
      const suspendedHosp = { status: 'SUSPENDED' };

      expect(hasActiveHospitalAffiliation(activeAffiliation, approvedHospital)).toBe(true);
      expect(hasActiveHospitalAffiliation(activeAffiliation, suspendedHosp)).toBe(false);
      expect(hasActiveHospitalAffiliation({ status: 'PENDING' }, approvedHospital)).toBe(false);
      expect(isDoctor({ role: 'DOCTOR' })).toBe(true);
      expect(isDoctor({ role: 'PATIENT' })).toBe(false);
      expect(hasActiveDoctorProfile({ status: 'ACTIVE' })).toBe(true);
      expect(hasActiveDoctorProfile({ status: 'PENDING' })).toBe(false);
    });
  });

  // ==========================================
  // SECURITY & IDENTITY INTEGRITY (33 - 37)
  // ==========================================
  describe('Security & Identity Integrity Tests', () => {
    it('33. Password hashes never appear in Doctor responses', async () => {
      const res = await request(app)
        .get('/api/doctors/me')
        .set('Authorization', `Bearer ${doctor1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.doctor.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('fakesalt');
    });

    it('34. Client cannot assign Doctor profile to another user during creation', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${doctorNoProfileToken}`)
        .send({
          fullName: 'Dr. Hijacker',
          phone: '+919876543233',
          gender: 'OTHER',
          dateOfBirth: '1990-01-01',
          medicalLicenseNumber: 'MCI-HIJACK',
          specialization: 'Neurology',
          qualifications: ['MBBS'],
          user: sysAdminUser._id.toString(), // Attempting to hijack
        });

      // Strict validation forbids extra `user` field
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('35. Client cannot self-activate Doctor profile status on creation', async () => {
      const res = await request(app)
        .post('/api/doctors/profile')
        .set('Authorization', `Bearer ${doctorNoProfileToken}`)
        .send({
          fullName: 'Dr. Newbie Verified',
          phone: '+919876543244',
          gender: 'FEMALE',
          dateOfBirth: '1991-02-02',
          medicalLicenseNumber: 'MCI-NEWBIE-1',
          specialization: 'Pediatrics',
          qualifications: ['MBBS', 'DCH'],
          status: 'ACTIVE', // Attempting to self-activate
        });

      // Strict validation forbids `status` field on creation
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('36. Doctor cannot self-approve or change own affiliation status (403)', async () => {
      const affiliations = await DoctorHospitalAffiliation.find({});
      const targetAffiliation = affiliations[0];

      const res = await request(app)
        .patch(`/api/hospitals/${targetAffiliation.hospital}/doctors/${targetAffiliation._id}/status`)
        .set('Authorization', `Bearer ${doctor1Token}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('37. Cross-hospital tampering: Admin A cannot use Hospital A route with Hospital B affiliation ID (404)', async () => {
      const affiliationB = await DoctorHospitalAffiliation.findOne({ hospital: hospitalB._id });

      const res = await request(app)
        .patch(`/api/hospitals/${hospitalA._id}/doctors/${affiliationB._id}/status`)
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_AFFILIATION_NOT_FOUND');
    });
  });
});
