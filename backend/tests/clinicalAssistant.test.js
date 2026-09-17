/**
 * HealthBridge Phase 13 Integration Tests
 * RAG Clinical Assistant & Grounded Answers Domain
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

describe('HealthBridge Phase 13: RAG Clinical Assistant & Grounded Answers Tests', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminUserA, hospAdminTokenA;
  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;
  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;
  let hospitalA, hospitalB;

  let recordVisit1, recordDiag1, recordMed1;
  let originalSearchMethod, originalRagMethod;

  beforeAll(async () => {
    await connectDB();

    // Clean test collections
    await User.deleteMany({ email: /@test-phase13\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P13$/ });
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
      name: 'System Admin P13',
      email: 'sysadmin@test-phase13.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    // 2. Seed Hospitals
    hospitalA = await Hospital.create({
      name: 'Hospital Alpha P13',
      hospitalCode: 'HOSP-A-P13',
      address: { street: '100 Medical Blvd', city: 'Metropolis', state: 'NY', zipCode: '10001', country: 'USA' },
      contactEmail: 'admin@hospa-p13.local',
      contactPhone: '+1-555-0101',
      status: 'APPROVED',
      registeredBy: sysAdminUser._id,
    });

    hospitalB = await Hospital.create({
      name: 'Hospital Beta P13',
      hospitalCode: 'HOSP-B-P13',
      address: { street: '200 Health Way', city: 'Metropolis', state: 'NY', zipCode: '10002', country: 'USA' },
      contactEmail: 'admin@hospb-p13.local',
      contactPhone: '+1-555-0102',
      status: 'APPROVED',
      registeredBy: sysAdminUser._id,
    });

    hospAdminUserA = await User.create({
      name: 'Hospital Admin A P13',
      email: 'hospadmina@test-phase13.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      hospital: hospitalA._id,
      status: 'ACTIVE',
    });
    hospAdminTokenA = generateToken({ sub: hospAdminUserA._id.toString(), role: 'HOSPITAL_ADMIN' });

    // 3. Seed Doctors
    doctorUserA = await User.create({
      name: 'Dr. Alice P13',
      email: 'doctora@test-phase13.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });

    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. Alice Carter',
      medicalLicenseNumber: 'LIC-DOC-A-P13',
      specialization: 'INTERNAL_MEDICINE',
      phone: '+1-555-0301',
      dateOfBirth: new Date('1982-04-15'),
      gender: 'FEMALE',
      qualifications: ['MD', 'FACP'],
      yearsOfExperience: 10,
      status: 'ACTIVE',
    });

    await DoctorHospitalAffiliation.create({
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      department: 'General Medicine',
      status: 'ACTIVE',
      approvedBy: hospAdminUserA._id,
      approvedAt: new Date(),
    });

    doctorUserB = await User.create({
      name: 'Dr. Bob P13',
      email: 'doctorb@test-phase13.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });

    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Bob Vance',
      medicalLicenseNumber: 'LIC-DOC-B-P13',
      specialization: 'CARDIOLOGY',
      phone: '+1-555-0302',
      dateOfBirth: new Date('1978-08-22'),
      gender: 'MALE',
      qualifications: ['MD', 'FACC'],
      yearsOfExperience: 14,
      status: 'ACTIVE',
    });


    await DoctorHospitalAffiliation.create({
      doctor: doctorProfileB._id,
      hospital: hospitalB._id,
      department: 'Cardiology',
      status: 'ACTIVE',
      approvedBy: sysAdminUser._id,
      approvedAt: new Date(),
    });

    // 4. Seed Patients
    patientUser1 = await User.create({
      name: 'Patient John P13',
      email: 'patient1@test-phase13.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });

    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PAT-P13-0001',
      dateOfBirth: new Date('1985-05-12'),
      gender: 'MALE',
      bloodGroup: 'O+',
      phone: '+1-555-0401',
      address: { street: '123 Main St', city: 'Metropolis', state: 'NY', zipCode: '10001', country: 'USA' },
      status: 'ACTIVE',
    });

    await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      approvedBy: hospAdminUserA._id,
    });

    await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      approvedBy: sysAdminUser._id,
    });

    patientUser2 = await User.create({
      name: 'Patient Sarah P13',
      email: 'patient2@test-phase13.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });

    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PAT-P13-0002',
      dateOfBirth: new Date('1992-09-20'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      phone: '+1-555-0402',
      address: { street: '456 Oak Ave', city: 'Metropolis', state: 'NY', zipCode: '10002', country: 'USA' },
      status: 'ACTIVE',
    });



    // 5. Seed Doctor-Patient Assignment
    await DoctorPatientAssignment.create({
      doctor: doctorProfileA._id,
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      assignedBy: hospAdminUserA._id,
      status: 'ACTIVE',
      assignedAt: new Date(),
    });

    // 6. Seed Clinical Records for Patient 1
    recordVisit1 = await VisitRecord.create({
      patient: patientProfile1._id,
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      recordDate: new Date('2026-09-01T10:00:00Z'),
      symptoms: 'Mild chest tightness, fatigue, elevated fasting glucose',
      assessment: 'Hypertension stage 1 with impaired fasting glucose',
      vitalSigns: { bloodPressure: '138/88', heartRate: 78, temperature: 36.8 },
      notes: 'Patient advised to follow low-sodium diet and exercise.',
    });

    recordDiag1 = await DiagnosisRecord.create({
      patient: patientProfile1._id,
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      recordDate: new Date('2026-09-02T11:00:00Z'),
      diagnosis: 'Essential Primary Hypertension',
      condition: 'Cardiovascular',
      icdCode: 'I10',
      status: 'CONFIRMED',
      notes: 'Monitored over 3 consecutive clinical readings.',
    });


    recordMed1 = await MedicationRecord.create({
      patient: patientProfile1._id,
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      recordDate: new Date('2026-09-02T11:30:00Z'),
      medicineName: 'Amlodipine Besylate',
      dosage: '5mg',
      frequency: 'Once daily',
      duration: '90 days',
      instructions: 'Take in morning with water',
    });


    // Mock AIServiceClient search & generateGroundedAnswer methods
    originalSearchMethod = aiServiceClient.search;
    originalRagMethod = aiServiceClient.generateGroundedAnswer;

    aiServiceClient.search = jest.fn().mockImplementation(async ({ query, patientId, recordTypes }) => {
      // Simulate vector matches
      const results = [
        {
          chunkId: `chk_${recordDiag1._id}`,
          medicalRecordId: recordDiag1._id.toString(),
          score: 0.92,
          recordType: 'DIAGNOSIS',
          patientId: patientProfile1._id.toString(),
        },
        {
          chunkId: `chk_${recordMed1._id}`,
          medicalRecordId: recordMed1._id.toString(),
          score: 0.88,
          recordType: 'MEDICATION',
          patientId: patientProfile1._id.toString(),
        },
        {
          chunkId: `chk_${recordVisit1._id}`,
          medicalRecordId: recordVisit1._id.toString(),
          score: 0.81,
          recordType: 'VISIT',
          patientId: patientProfile1._id.toString(),
        },
      ];

      return {
        query,
        total: results.length,
        results: recordTypes
          ? results.filter((r) => recordTypes.includes(r.recordType))
          : results,
      };
    });

    aiServiceClient.generateGroundedAnswer = jest.fn().mockImplementation(async ({ question, evidence }) => {
      return {
        answer: `Based on your available HealthBridge records, you have a confirmed diagnosis of Essential Primary Hypertension (ICD-10: I10) and were prescribed Amlodipine Besylate 5mg once daily.`,
        grounded: true,
        sources: evidence.map((e) => ({
          recordId: e.recordId,
          recordType: e.recordType,
          recordDate: e.recordDate,
          relevanceScore: e.score,
          hospitalName: e.hospitalName,
        })),
        metadata: {
          retrievedCount: evidence.length,
          provider: 'mock',
          model: 'mock-clinical-llm-v1',
        },
      };
    });
  });

  afterAll(async () => {
    aiServiceClient.search = originalSearchMethod;
    aiServiceClient.generateGroundedAnswer = originalRagMethod;
    await disconnectDB();
  });

  describe('1. Authentication & Input Validation', () => {
    it('1.1 should reject unauthenticated assistant queries with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .send({ question: 'What medications am I taking?' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('1.2 should reject question shorter than 3 characters with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ question: 'Hi' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('1.3 should reject invalid patientId format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ question: 'What is the patient history?', patientId: 'invalid-hex-id' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('2. Administrative Clinical Exclusion', () => {
    it('2.1 SYSTEM_ADMIN is forbidden from using clinical assistant (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({ question: 'Summarize clinical records for patient', patientId: patientProfile1._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });

    it('2.2 HOSPITAL_ADMIN is forbidden from using clinical assistant (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${hospAdminTokenA}`)
        .send({ question: 'Summarize clinical records for patient', patientId: patientProfile1._id.toString() });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });
  });

  describe('3. Patient Self-Access & Isolation', () => {
    it('3.1 Patient can ask about their own medical records (200 OK with grounded answer & citations)', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ question: 'What diagnoses and medications are in my record?' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grounded).toBe(true);
      expect(res.body.data.answer).toContain('Essential Primary Hypertension');
      expect(res.body.data.sources.length).toBeGreaterThan(0);
      expect(res.body.data.sources[0]).toHaveProperty('recordId');
      expect(res.body.data.sources[0]).toHaveProperty('recordType');
      expect(res.body.data.sources[0]).toHaveProperty('relevanceScore');
    });

    it('3.2 Patient CANNOT ask questions about another patient (403 PATIENT_ISOLATION_VIOLATION)', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          question: 'What are Sarah diagnoses?',
          patientId: patientProfile2._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PATIENT_ISOLATION_VIOLATION');
    });
  });

  describe('4. Doctor Clinical Authorization & Assignments', () => {
    it('4.1 Assigned Doctor A CAN query assigned Patient 1 (200 OK)', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          question: 'Summarize blood pressure and diagnosis',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grounded).toBe(true);
      expect(res.body.data.sources.length).toBeGreaterThan(0);
    });

    it('4.2 Doctor cannot ask assistant without specifying target patientId (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ question: 'What is happening with patients?' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PATIENT_ID_REQUIRED');
    });

    it('4.3 Doctor B CANNOT ask about unassigned, unconsented Patient 1 (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          question: 'What medications is Patient 1 taking?',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOCTOR_CLINICAL_ACCESS_RESTRICTED');
    });
  });

  describe('5. Cross-Hospital Consent Integration', () => {
    let activeConsent;

    it('5.1 Doctor B CAN query Patient 1 when active Cross-Hospital Consent exists (200 OK)', async () => {
      activeConsent = await Consent.create({
        patient: patientProfile1._id,
        requestingDoctor: doctorProfileB._id,
        requestingHospital: hospitalB._id,
        sourceHospital: hospitalA._id,
        purpose: 'TREATMENT',
        scopes: ['DIAGNOSES', 'MEDICATIONS', 'VISITS'],
        expiresAt: new Date(Date.now() + 86400000), // Valid for 24h
        grantedAt: new Date(),
        grantedBy: patientUser1._id,
      });


      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          question: 'What are the documented medications?',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grounded).toBe(true);
    });

    it('5.2 Doctor B cannot query Patient 1 after Consent is revoked (403 Forbidden)', async () => {
      activeConsent.revokedAt = new Date();
      await activeConsent.save();

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          question: 'What are the documented medications?',
          patientId: patientProfile1._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOCTOR_CLINICAL_ACCESS_RESTRICTED');
    });
  });

  describe('6. Authoritative MongoDB Hydration & Similarity Thresholds', () => {
    it('6.1 Stale/deleted vector matches are discarded during MongoDB hydration', async () => {
      // Mock vector search returning a non-existent MongoDB ID
      const fakeRecordId = '507f1f77bcf86cd799439011';
      aiServiceClient.search.mockResolvedValueOnce({
        query: 'What about surgery?',
        total: 1,
        results: [
          {
            chunkId: `chk_${fakeRecordId}`,
            medicalRecordId: fakeRecordId,
            score: 0.95,
            recordType: 'VISIT',
            patientId: patientProfile1._id.toString(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ question: 'What about surgery?' });

      expect(res.status).toBe(200);
      expect(res.body.data.grounded).toBe(false);
      expect(res.body.data.sources).toHaveLength(0);
      expect(res.body.data.answer).toContain('not enough relevant documented clinical evidence');
    });

    it('6.2 Matches below similarity threshold produce grounded fallback without LLM call', async () => {
      aiServiceClient.search.mockResolvedValueOnce({
        query: 'Unrelated query',
        total: 1,
        results: [
          {
            chunkId: `chk_${recordDiag1._id}`,
            medicalRecordId: recordDiag1._id.toString(),
            score: 0.32, // Below 0.55 threshold
            recordType: 'DIAGNOSIS',
            patientId: patientProfile1._id.toString(),
          },
        ],
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ question: 'What is my eye color?' });

      expect(res.status).toBe(200);
      expect(res.body.data.grounded).toBe(false);
      expect(res.body.data.sources).toHaveLength(0);
      expect(res.body.data.answer).toContain('not enough relevant documented clinical evidence');
    });
  });

  describe('7. Privacy & Zero-PHI Audit Trail', () => {
    it('7.1 Successful query creates CLINICAL_ASSISTANT_QUERY audit log without question or answer text', async () => {
      await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ question: 'What diagnoses do I have?' });

      const audit = await AuditLog.findOne({
        action: 'CLINICAL_ASSISTANT_QUERY',
        actor: patientUser1._id,
      }).sort({ createdAt: -1 });

      expect(audit).not.toBeNull();
      expect(audit.resourceType).toBe('CLINICAL_ASSISTANT');
      expect(audit.result).toBe('SUCCESS');
      // Verify ZERO PHI
      expect(audit.metadata).not.toHaveProperty('question');
      expect(audit.metadata).not.toHaveProperty('answer');
      expect(audit.metadata).not.toHaveProperty('symptoms');
      expect(audit.metadata).not.toHaveProperty('diagnosisTitle');
      expect(audit.metadata).toHaveProperty('retrievedCount');
    });

    it('7.2 Denied query creates CLINICAL_ASSISTANT_DENIED audit log', async () => {
      await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({ question: 'Show records', patientId: patientProfile1._id.toString() });

      const audit = await AuditLog.findOne({
        action: 'CLINICAL_ASSISTANT_DENIED',
        actor: sysAdminUser._id,
      }).sort({ createdAt: -1 });

      expect(audit).not.toBeNull();
      expect(audit.result).toBe('DENIED');
      expect(audit.reasonCode).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });
  });
});
