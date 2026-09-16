/**
 * HealthBridge Phase 12 Integration Tests
 * Embeddings & Semantic Clinical Search Domain
 */
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
const { DiagnosisRecord } = require('../src/models/DiagnosisRecord');
const { MedicationRecord } = require('../src/models/MedicationRecord');
const { Consent } = require('../src/models/Consent');
const { AuditLog } = require('../src/models/AuditLog');
const { generateToken } = require('../src/utils/jwt');
const aiServiceClient = require('../src/services/aiServiceClient');

describe('HealthBridge Embeddings & Semantic Clinical Search Tests (Phase 12)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminUserA, hospAdminTokenA;
  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;
  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;
  let hospitalA, hospitalB;

  let recordVisit1, recordDiag1, recordMed1;
  let originalSearchMethod;

  beforeAll(async () => {
    await connectDB();

    // Clean test collections
    await User.deleteMany({ email: /@test-phase12\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P12$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await Consent.deleteMany({});
    await AuditLog.deleteMany({});

    // 1. Seed Admins
    sysAdminUser = await User.create({
      name: 'System Admin P12',
      email: 'sysadmin@test-phase12.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminUserA = await User.create({
      name: 'Hosp Admin A P12',
      email: 'hospadmina@test-phase12.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminTokenA = generateToken({ sub: hospAdminUserA._id.toString(), role: 'HOSPITAL_ADMIN' });

    // 2. Seed Hospitals
    hospitalA = await Hospital.create({
      name: 'General Hospital Alpha P12',
      hospitalCode: 'GHA-P12',
      status: 'APPROVED',
      registeredBy: sysAdminUser._id,
      address: { street: '100 Medical Plaza', city: 'Metro', state: 'CA', country: 'USA', zipCode: '90001' },
      contactEmail: 'contact@alpha-p12.local',
      contactPhone: '+1-555-0101',
    });

    hospitalB = await Hospital.create({
      name: 'Memorial Hospital Beta P12',
      hospitalCode: 'MHB-P12',
      status: 'APPROVED',
      registeredBy: sysAdminUser._id,
      address: { street: '200 Health Way', city: 'Metro', state: 'CA', country: 'USA', zipCode: '90002' },
      contactEmail: 'contact@beta-p12.local',
      contactPhone: '+1-555-0202',
    });

    // 3. Seed Doctors
    doctorUserA = await User.create({
      name: 'Dr. Alice Carter P12',
      email: 'dr.alice@test-phase12.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });

    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. Alice Carter',
      specialization: 'CARDIOLOGY',
      medicalLicenseNumber: 'MD-P12-001',
      yearsOfExperience: 12,
      phone: '+1-555-0301',
      dateOfBirth: new Date('1982-04-15'),
      gender: 'FEMALE',
      qualifications: ['MD', 'FACC'],
      status: 'ACTIVE',
    });

    doctorUserB = await User.create({
      name: 'Dr. Bob Vance P12',
      email: 'dr.bob@test-phase12.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });

    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Bob Vance',
      specialization: 'NEUROLOGY',
      medicalLicenseNumber: 'MD-P12-002',
      yearsOfExperience: 8,
      phone: '+1-555-0302',
      dateOfBirth: new Date('1985-08-20'),
      gender: 'MALE',
      qualifications: ['MD'],
      status: 'ACTIVE',
    });

    // Doctor A affiliated with Hospital A; Doctor B with Hospital B
    await DoctorHospitalAffiliation.create({
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      department: 'Cardiology',
      startDate: new Date('2024-01-01'),
    });

    await DoctorHospitalAffiliation.create({
      doctor: doctorProfileB._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
      department: 'Neurology',
      startDate: new Date('2024-01-01'),
    });

    // 4. Seed Patients
    patientUser1 = await User.create({
      name: 'John Doe P12',
      email: 'john.doe@test-phase12.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });

    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PAT-P12-0001',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'MALE',
      bloodGroup: 'O+',
      phone: '+1-555-0401',
      address: { city: 'Metro City', state: 'CA' },
      status: 'ACTIVE',
    });

    patientUser2 = await User.create({
      name: 'Jane Smith P12',
      email: 'jane.smith@test-phase12.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });

    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PAT-P12-0002',
      dateOfBirth: new Date('1992-05-15'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      phone: '+1-555-0402',
      address: { city: 'Metro City', state: 'CA' },
      status: 'ACTIVE',
    });

    // Patient 1 has membership at Hospital A; Assigned to Doctor A
    await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
    });

    await DoctorPatientAssignment.create({
      doctor: doctorProfileA._id,
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      assignedBy: sysAdminUser._id,
    });

    // Patient 2 has membership at Hospital B
    await PatientHospitalMembership.create({
      patient: patientProfile2._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
    });

    // 5. Seed Medical Records for Patient 1
    recordVisit1 = await VisitRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordDate: new Date('2026-02-10'),
      reasonForVisit: 'Hypertension evaluation and chest discomfort',
      symptoms: ['Elevated blood pressure', 'Shortness of breath'],
      diagnosis: 'Essential Hypertension Stage 1',
      vitalSigns: { bloodPressure: '145/95', heartRate: 82, temperature: 98.4 },
      notes: 'Patient advised dietary changes and lifestyle management.',
    });

    recordDiag1 = await DiagnosisRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordDate: new Date('2026-02-15'),
      diagnosis: 'Primary Essential Hypertension',
      condition: 'Cardiovascular Hypertension',
      icdCode: 'I10',
      status: 'CONFIRMED',
      notes: 'Ongoing monitoring required.',
    });

    recordMed1 = await MedicationRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordDate: new Date('2026-02-20'),
      medicineName: 'Amlodipine Besylate',
      dosage: '5mg',
      frequency: 'Once daily',
      duration: '30 days',
      instructions: 'Take in the morning',
    });

    // Mock AI service client search method for isolated, deterministic unit tests
    originalSearchMethod = aiServiceClient.search;
    aiServiceClient.search = jest.fn().mockImplementation(async ({ query, patientId, recordTypes }) => {
      let candidateIds = [
        { medicalRecordId: recordVisit1._id.toString(), chunkId: `${recordVisit1._id}_chunk_0`, recordType: 'VISIT', recordDate: '2026-02-10', score: 0.94 },
        { medicalRecordId: recordDiag1._id.toString(), chunkId: `${recordDiag1._id}_chunk_0`, recordType: 'DIAGNOSIS', recordDate: '2026-02-15', score: 0.88 },
        { medicalRecordId: recordMed1._id.toString(), chunkId: `${recordMed1._id}_chunk_0`, recordType: 'MEDICATION', recordDate: '2026-02-20', score: 0.81 },
      ];

      if (recordTypes && recordTypes.length > 0) {
        candidateIds = candidateIds.filter((c) => recordTypes.includes(c.recordType));
      }

      return {
        query,
        totalResults: candidateIds.length,
        results: candidateIds,
      };
    });
  });

  afterAll(async () => {
    aiServiceClient.search = originalSearchMethod;
    await disconnectDB();
  });

  describe('1. Authentication & Input Validation', () => {
    it('1.1 should reject unauthenticated clinical search with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .send({ query: 'hypertension' });

      expect(res.status).toBe(401);
    });

    it('1.2 should reject search with empty query string with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ query: '', patientId: patientProfile1._id.toString() });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('1.3 should reject search with invalid patientId format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ query: 'blood pressure', patientId: 'invalid-id-format' });

      expect(res.status).toBe(400);
    });

    it('1.4 should reject limit greater than 50 with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ query: 'blood pressure', patientId: patientProfile1._id.toString(), limit: 100 });

      expect(res.status).toBe(400);
    });
  });

  describe('2. Administrative Clinical Search Restrictions', () => {
    it('2.1 SYSTEM_ADMIN is forbidden from executing clinical searches (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({ query: 'hypertension', patientId: patientProfile1._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });

    it('2.2 HOSPITAL_ADMIN is forbidden from executing clinical searches (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${hospAdminTokenA}`)
        .send({ query: 'hypertension', patientId: patientProfile1._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });
  });

  describe('3. Patient Self-Search & Cross-Patient Isolation', () => {
    it('3.1 Patient can search their own clinical records (200 OK with similarity scores)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ query: 'hypertension treatment' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results.length).toBeGreaterThan(0);
      expect(res.body.data.results[0].score).toBeDefined();
      expect(res.body.data.results[0].patient.patientId).toBe('PAT-P12-0001');
    });

    it('3.2 Patient cannot search another patient records (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          query: 'hypertension',
          patientId: patientProfile2._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PATIENT_ISOLATION_VIOLATION');
    });
  });

  describe('4. Doctor Clinical Authorization & Record Filtering', () => {
    it('4.1 Assigned Doctor A CAN search assigned Patient 1 records (200 OK)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          query: 'hypertension blood pressure',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results.length).toBe(3);
      expect(res.body.data.results[0]).toHaveProperty('score');
      expect(res.body.data.results[0]).toHaveProperty('chunkId');
    });

    it('4.2 Doctor can filter search by specific record types (e.g. VISIT only)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          query: 'hypertension',
          patientId: patientProfile1._id.toString(),
          recordTypes: ['VISIT'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results.every((r) => r.recordType === 'VISIT')).toBe(true);
    });

    it('4.3 Doctor B CANNOT search unassigned, unconsented Patient 1 (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          query: 'hypertension',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOCTOR_CLINICAL_ACCESS_RESTRICTED');
    });

    it('4.4 Doctor cannot execute unscoped search without patientId or affiliated hospitalId (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ query: 'general medical records' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('UNSCOPED_SEARCH_FORBIDDEN');
    });
  });

  describe('5. Cross-Hospital Consent-based Search', () => {
    let consent;

    beforeEach(async () => {
      await Consent.deleteMany({});
    });

    it('5.1 Doctor B CAN search Patient 1 records when active Cross-Hospital Consent exists (200 OK)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      consent = await Consent.create({
        patient: patientProfile1._id,
        requestingDoctor: doctorProfileB._id,
        requestingHospital: hospitalB._id,
        sourceHospital: hospitalA._id,
        scopes: ['VISITS', 'DIAGNOSES'],
        purpose: 'TREATMENT',
        grantedBy: patientUser1._id,
        expiresAt: futureDate,
      });

      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          query: 'chest discomfort',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('5.2 Doctor B cannot search Patient 1 records when Consent has expired (403 Forbidden)', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await Consent.create({
        patient: patientProfile1._id,
        requestingDoctor: doctorProfileB._id,
        requestingHospital: hospitalB._id,
        sourceHospital: hospitalA._id,
        scopes: ['VISITS'],
        purpose: 'TREATMENT',
        grantedBy: patientUser1._id,
        expiresAt: pastDate,
      });

      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          query: 'chest discomfort',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOCTOR_CLINICAL_ACCESS_RESTRICTED');
    });

    it('5.3 Doctor B cannot search Patient 1 records when Consent has been revoked (403 Forbidden)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      await Consent.create({
        patient: patientProfile1._id,
        requestingDoctor: doctorProfileB._id,
        requestingHospital: hospitalB._id,
        sourceHospital: hospitalA._id,
        scopes: ['VISITS'],
        purpose: 'TREATMENT',
        grantedBy: patientUser1._id,
        expiresAt: futureDate,
        revokedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          query: 'chest discomfort',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOCTOR_CLINICAL_ACCESS_RESTRICTED');
    });
  });

  describe('6. Privacy & Security Audit Verification', () => {
    it('6.1 Authorized search creates SEMANTIC_SEARCH_PERFORMED audit log without PHI or query text', async () => {
      const auditBeforeCount = await AuditLog.countDocuments({ action: 'SEMANTIC_SEARCH_PERFORMED' });

      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          query: 'sensitive confidential diagnosis symptoms',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(200);

      const latestAudit = await AuditLog.findOne({ action: 'SEMANTIC_SEARCH_PERFORMED' }).sort({ createdAt: -1 });
      expect(latestAudit).toBeDefined();
      expect(latestAudit.actorRole).toBe('DOCTOR');
      expect(latestAudit.result).toBe('SUCCESS');

      // CRITICAL PRIVACY GUARANTEE: Search queries, symptoms, diagnoses, or clinical text are NEVER stored in audit logs
      const auditStr = JSON.stringify(latestAudit);
      expect(auditStr).not.toContain('sensitive confidential diagnosis symptoms');
      expect(auditStr).not.toContain('Amlodipine');
      expect(auditStr).not.toContain('Hypertension');
    });

    it('6.2 Unauthorized search attempts create SEMANTIC_SEARCH_DENIED audit log without leaking data', async () => {
      const res = await request(app)
        .post('/api/search/clinical')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          query: 'unauthorized query on patient 1',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(403);

      const denialAudit = await AuditLog.findOne({ action: 'SEMANTIC_SEARCH_DENIED' }).sort({ createdAt: -1 });
      expect(denialAudit).toBeDefined();
      expect(denialAudit.result).toBe('DENIED');
      expect(denialAudit.reasonCode).toBe('DOCTOR_CLINICAL_ACCESS_RESTRICTED');

      // Privacy check on denial
      const denialStr = JSON.stringify(denialAudit);
      expect(denialStr).not.toContain('unauthorized query on patient 1');
    });
  });
});
