/**
 * HealthBridge Phase 14 Integration Tests
 * Controlled Tool Calling & Clinical Data Tools
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
const { LabResultRecord } = require('../src/models/LabResultRecord');
const { PrescriptionRecord } = require('../src/models/PrescriptionRecord');
const { DocumentRecord } = require('../src/models/DocumentRecord');
const { Consent } = require('../src/models/Consent');
const { AuditLog } = require('../src/models/AuditLog');
const { generateToken } = require('../src/utils/jwt');
const aiServiceClient = require('../src/services/aiServiceClient');
const {
  CLINICAL_TOOLS,
  getToolDefinitions,
  executeToolCall,
  executeToolCalls,
  toolValidators,
} = require('../src/ai/tools/toolRegistry');
const { authorizeClinicalToolAccess } = require('../src/policies/clinicalToolPolicy');

describe('HealthBridge Phase 14: Controlled Tool Calling & Clinical Data Tools Tests', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminUser, hospAdminToken;
  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;
  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;
  let hospitalA;

  let visit1, diag1, med1, lab1, rx1, doc1;
  let originalSelectToolsMethod, originalRagMethod;

  beforeAll(async () => {
    await connectDB();

    // Clean test collections
    await User.deleteMany({ email: /@test-phase14\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P14$/ });
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
      name: 'System Admin P14',
      email: 'sysadmin@test-phase14.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    // 2. Seed Hospital
    hospitalA = await Hospital.create({
      name: 'Hospital Alpha P14',
      hospitalCode: 'HOSP-A-P14',
      address: { street: '100 Medical Blvd', city: 'Metropolis', state: 'NY', zipCode: '10001', country: 'USA' },
      contactEmail: 'admin@hospa-p14.local',
      contactPhone: '+1-555-0101',
      status: 'APPROVED',
      registeredBy: sysAdminUser._id,
    });

    hospAdminUser = await User.create({
      name: 'Hospital Admin P14',
      email: 'hospadmin@test-phase14.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      hospital: hospitalA._id,
      status: 'ACTIVE',
    });
    hospAdminToken = generateToken({ sub: hospAdminUser._id.toString(), role: 'HOSPITAL_ADMIN' });

    // 3. Seed Doctors
    doctorUserA = await User.create({
      name: 'Dr. Alice P14',
      email: 'doctora@test-phase14.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });

    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. Alice Smith',
      specialization: 'Cardiology',
      medicalLicenseNumber: 'LIC-P14-001',
      qualifications: ['MD', 'MBBS'],
      yearsOfExperience: 10,
      phone: '+1-555-0201',
      gender: 'FEMALE',
      dateOfBirth: new Date('1985-05-15'),
      status: 'ACTIVE',
    });

    await DoctorHospitalAffiliation.create({
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    doctorUserB = await User.create({
      name: 'Dr. Bob P14',
      email: 'doctorb@test-phase14.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });

    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Bob Jones',
      specialization: 'Neurology',
      medicalLicenseNumber: 'LIC-P14-002',
      qualifications: ['MD', 'Neurology Board'],
      yearsOfExperience: 8,
      phone: '+1-555-0202',
      gender: 'MALE',
      dateOfBirth: new Date('1988-08-20'),
      status: 'ACTIVE',
    });

    // 4. Seed Patients
    patientUser1 = await User.create({
      name: 'Patient One P14',
      email: 'patient1@test-phase14.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });

    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PT-P14-0001',
      gender: 'MALE',
      dateOfBirth: new Date('1990-01-01'),
      bloodGroup: 'O+',
      phone: '+1-555-0301',
      address: { street: '1 Main St', city: 'Metropolis', state: 'NY', zipCode: '10001', country: 'USA' },
      status: 'ACTIVE',
    });

    await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    patientUser2 = await User.create({
      name: 'Patient Two P14',
      email: 'patient2@test-phase14.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });

    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PT-P14-0002',
      gender: 'FEMALE',
      dateOfBirth: new Date('1995-02-02'),
      bloodGroup: 'A+',
      phone: '+1-555-0302',
      address: { street: '2 Main St', city: 'Metropolis', state: 'NY', zipCode: '10001', country: 'USA' },
      status: 'ACTIVE',
    });

    // 5. Active Assignment for Dr Alice -> Patient 1
    await DoctorPatientAssignment.create({
      doctor: doctorProfileA._id,
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      assignedBy: hospAdminUser._id,
    });

    // 6. Cross-Hospital Consent for Dr Bob -> Patient 1 (Scoped to MEDICATIONS only)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    await Consent.create({
      patient: patientProfile1._id,
      requestingDoctor: doctorProfileB._id,
      requestingHospital: hospitalA._id,
      sourceHospital: hospitalA._id,
      scopes: ['MEDICATIONS'],
      purpose: 'TREATMENT',
      expiresAt: futureDate,
      grantedAt: new Date(),
      grantedBy: patientUser1._id,
    });

    // 7. Seed 6 Clinical Discriminator Records for Patient 1
    visit1 = await VisitRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'VISIT',
      recordDate: new Date('2026-03-01T10:00:00Z'),
      symptoms: ['Chest tightness', 'Fatigue'],
      diagnosis: 'Hypertension Followup',
      notes: 'Patient advised to monitor blood pressure daily.',
      vitalSigns: {
        bloodPressure: '135/85',
        heartRate: 76,
        temperature: 98.6,
      },
    });

    diag1 = await DiagnosisRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'DIAGNOSIS',
      recordDate: new Date('2026-02-15T09:00:00Z'),
      diagnosis: 'Essential Hypertension',
      condition: 'Stage 1 Hypertension',
      icdCode: 'I10',
      status: 'CONFIRMED',
      notes: 'Initial diagnosis confirmed by primary care.',
    });

    med1 = await MedicationRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'MEDICATION',
      recordDate: new Date('2026-02-15T09:30:00Z'),
      medicineName: 'Amlodipine Besylate',
      dosage: '5mg',
      frequency: 'Once Daily',
      duration: '90 Days',
      instructions: 'Take in the morning with water.',
    });

    lab1 = await LabResultRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'LAB_RESULT',
      recordDate: new Date('2026-02-10T08:00:00Z'),
      testName: 'Lipid Panel - Total Cholesterol',
      value: '195',
      unit: 'mg/dL',
      referenceRange: '< 200 mg/dL',
      interpretation: 'NORMAL',
      notes: 'Fasting specimen.',
    });

    rx1 = await PrescriptionRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'PRESCRIPTION',
      recordDate: new Date('2026-02-15T10:00:00Z'),
      medications: [
        {
          medicineName: 'Amlodipine Besylate',
          dosage: '5mg',
          frequency: 'Once Daily',
          duration: '90 Days',
          instructions: 'Oral',
        },
      ],
      instructions: 'Take regularly as prescribed.',
    });

    doc1 = await DocumentRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'DOCUMENT',
      recordDate: new Date('2026-01-20T14:00:00Z'),
      documentType: 'DISCHARGE_SUMMARY',
      fileName: 'ecg_report_p1.pdf',
      mimeType: 'application/pdf',
      storageReference: 's3://healthbridge/documents/ecg_report_p1.pdf',
      fileSize: 204800,
      notes: 'Sinus rhythm, normal axis, no acute ST-T changes.',
    });

    // Mock AI service client
    originalSelectToolsMethod = aiServiceClient.selectToolsOrAnswer;
    originalRagMethod = aiServiceClient.generateGroundedAnswer;
  });

  afterAll(async () => {
    aiServiceClient.selectToolsOrAnswer = originalSelectToolsMethod;
    aiServiceClient.generateGroundedAnswer = originalRagMethod;

    await User.deleteMany({ email: /@test-phase14\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P14$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await Consent.deleteMany({});
    await AuditLog.deleteMany({});
    await disconnectDB();
  });

  describe('1. Declarative Clinical Tool Registry & Validators', () => {
    it('should declare all 6 read-only clinical data tools with JSON schemas', () => {
      const toolDefs = getToolDefinitions();
      expect(toolDefs.length).toBe(6);

      const toolNames = toolDefs.map((t) => t.name);
      expect(toolNames).toContain('get_recent_visits');
      expect(toolNames).toContain('get_diagnoses');
      expect(toolNames).toContain('get_medications');
      expect(toolNames).toContain('get_lab_results');
      expect(toolNames).toContain('get_prescriptions');
      expect(toolNames).toContain('get_clinical_timeline');

      for (const def of toolDefs) {
        expect(def.description).toBeDefined();
        expect(def.parameters.type).toBe('object');
        expect(def.parameters.properties.patientId).toBeDefined();
      }
    });

    it('should validate tool arguments using Zod schemas', () => {
      // Valid arguments
      expect(
        toolValidators.get_recent_visits.safeParse({
          patientId: patientProfile1._id.toString(),
          limit: 3,
        }).success
      ).toBe(true);

      expect(
        toolValidators.get_diagnoses.safeParse({
          patientId: patientProfile1._id.toString(),
          status: 'CONFIRMED',
        }).success
      ).toBe(true);

      // Invalid patientId format
      expect(
        toolValidators.get_recent_visits.safeParse({
          patientId: 'invalid-id-format',
        }).success
      ).toBe(false);

      // Invalid status enum
      expect(
        toolValidators.get_diagnoses.safeParse({
          patientId: patientProfile1._id.toString(),
          status: 'NOT_A_VALID_STATUS',
        }).success
      ).toBe(false);
    });
  });

  describe('2. Authorization & RBAC Enforcement for Clinical Tools', () => {
    it('should strictly deny SYSTEM_ADMIN from executing clinical tools', async () => {
      await expect(
        authorizeClinicalToolAccess({
          user: { id: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' },
          patientId: patientProfile1._id.toString(),
          requiredScope: 'VISITS',
        })
      ).rejects.toThrow('Administrative roles do not have direct access to clinical medical record content');
    });

    it('should strictly deny HOSPITAL_ADMIN from executing clinical tools', async () => {
      await expect(
        authorizeClinicalToolAccess({
          user: { id: hospAdminUser._id.toString(), role: 'HOSPITAL_ADMIN' },
          patientId: patientProfile1._id.toString(),
          requiredScope: 'MEDICATIONS',
        })
      ).rejects.toThrow('Administrative roles do not have direct access to clinical medical record content');
    });

    it('should deny Patient from executing tools on another patient', async () => {
      await expect(
        authorizeClinicalToolAccess({
          user: { id: patientUser1._id.toString(), role: 'PATIENT' },
          patientId: patientProfile2._id.toString(), // Patient 2 ID requested by Patient 1
          requiredScope: 'MEDICATIONS',
        })
      ).rejects.toThrow('Patients are strictly forbidden from executing clinical tools on other patients');
    });

    it('should allow Patient to execute tools on their own records across all scopes', async () => {
      const auth = await authorizeClinicalToolAccess({
        user: { id: patientUser1._id.toString(), role: 'PATIENT' },
        patientId: patientProfile1._id.toString(),
        requiredScope: 'MEDICATIONS',
      });
      expect(auth.authorized).toBe(true);
      expect(auth.role).toBe('PATIENT');
    });

    it('should allow Doctor with active assignment full access to clinical tools', async () => {
      const auth = await authorizeClinicalToolAccess({
        user: { id: doctorUserA._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
        requiredScope: 'LAB_RESULTS',
      });
      expect(auth.authorized).toBe(true);
      expect(auth.role).toBe('DOCTOR');
    });

    it('should allow Doctor with scoped consent to access matching tool scope', async () => {
      const auth = await authorizeClinicalToolAccess({
        user: { id: doctorUserB._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
        requiredScope: 'MEDICATIONS',
      });
      expect(auth.authorized).toBe(true);
      expect(auth.role).toBe('DOCTOR');
      expect(auth.allowedScopes).toContain('MEDICATIONS');
    });

    it('should deny Doctor with scoped consent when accessing unpermitted tool scope', async () => {
      await expect(
        authorizeClinicalToolAccess({
          user: { id: doctorUserB._id.toString(), role: 'DOCTOR' },
          patientId: patientProfile1._id.toString(),
          requiredScope: 'LAB_RESULTS', // Dr Bob only has MEDICATIONS scope
        })
      ).rejects.toThrow('Doctor consent does not cover required clinical scope: LAB_RESULTS');
    });
  });

  describe('3. Clinical Data Tool Query Implementations', () => {
    it('get_recent_visits should retrieve visit records with populated details', async () => {
      const result = await executeToolCall({
        toolCall: {
          name: 'get_recent_visits',
          arguments: { patientId: patientProfile1._id.toString(), limit: 5 },
        },
        user: { id: doctorUserA._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].diagnosis).toBe('Hypertension Followup');
      expect(result.data[0].vitalSigns.bloodPressure).toBe('135/85');
      expect(result.data[0].doctor.fullName).toBe('Dr. Alice Smith');
      expect(result.data[0].hospital.name).toBe('Hospital Alpha P14');
    });

    it('get_diagnoses should retrieve diagnoses and support status filtering', async () => {
      const result = await executeToolCall({
        toolCall: {
          name: 'get_diagnoses',
          arguments: { patientId: patientProfile1._id.toString(), status: 'CONFIRMED' },
        },
        user: { id: doctorUserA._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].diagnosis).toBe('Essential Hypertension');
      expect(result.data[0].icdCode).toBe('I10');
      expect(result.data[0].status).toBe('CONFIRMED');
    });

    it('get_medications should retrieve medication records', async () => {
      const result = await executeToolCall({
        toolCall: {
          name: 'get_medications',
          arguments: { patientId: patientProfile1._id.toString() },
        },
        user: { id: patientUser1._id.toString(), role: 'PATIENT' },
        patientId: patientProfile1._id.toString(),
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].medicineName).toBe('Amlodipine Besylate');
      expect(result.data[0].dosage).toBe('5mg');
    });

    it('get_lab_results should retrieve lab results and support testName substring filter', async () => {
      const result = await executeToolCall({
        toolCall: {
          name: 'get_lab_results',
          arguments: { patientId: patientProfile1._id.toString(), testName: 'cholesterol' },
        },
        user: { id: doctorUserA._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].testName).toBe('Lipid Panel - Total Cholesterol');
      expect(result.data[0].value).toBe('195');
      expect(result.data[0].interpretation).toBe('NORMAL');
    });

    it('get_prescriptions should retrieve prescriptions', async () => {
      const result = await executeToolCall({
        toolCall: {
          name: 'get_prescriptions',
          arguments: { patientId: patientProfile1._id.toString() },
        },
        user: { id: doctorUserA._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.data[0].medications[0].medicineName).toBe('Amlodipine Besylate');
    });

    it('get_clinical_timeline should retrieve cross-record chronological events', async () => {
      const result = await executeToolCall({
        toolCall: {
          name: 'get_clinical_timeline',
          arguments: { patientId: patientProfile1._id.toString(), limit: 10 },
        },
        user: { id: patientUser1._id.toString(), role: 'PATIENT' },
        patientId: patientProfile1._id.toString(),
      });

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThanOrEqual(5);
      // Timeline is sorted descending by recordDate
      expect(result.data[0].recordType).toBe('VISIT');
    });
  });

  describe('4. Tool Call Execution Limits & Audit Logging', () => {
    it('executeToolCalls should enforce max 2 calls limit', async () => {
      const calls = [
        { name: 'get_recent_visits', arguments: { patientId: patientProfile1._id.toString() } },
        { name: 'get_medications', arguments: { patientId: patientProfile1._id.toString() } },
        { name: 'get_diagnoses', arguments: { patientId: patientProfile1._id.toString() } },
      ];

      const results = await executeToolCalls({
        toolCalls: calls,
        user: { id: doctorUserA._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
      });

      // Bounded by AI_TOOL_CALL_MAX (2)
      expect(results.length).toBe(2);
      expect(results[0].toolName).toBe('get_recent_visits');
      expect(results[1].toolName).toBe('get_medications');
    });

    it('should create zero-PHI audit trail for tool execution', async () => {
      const auditCountBefore = await AuditLog.countDocuments({ action: 'CLINICAL_TOOL_EXECUTED' });

      await executeToolCall({
        toolCall: {
          name: 'get_medications',
          arguments: { patientId: patientProfile1._id.toString() },
        },
        user: { id: doctorUserA._id.toString(), role: 'DOCTOR' },
        patientId: patientProfile1._id.toString(),
      });

      const auditCountAfter = await AuditLog.countDocuments({ action: 'CLINICAL_TOOL_EXECUTED' });
      expect(auditCountAfter).toBe(auditCountBefore + 1);

      const latestLog = await AuditLog.findOne({ action: 'CLINICAL_TOOL_EXECUTED' }).sort({ createdAt: -1 });
      expect(latestLog.resourceType).toBe('CLINICAL_TOOL');
      expect(latestLog.metadata.toolName).toBe('get_medications');
      expect(latestLog.metadata.resultCount).toBe(1);
      // Zero-PHI check: ensure no medication names or dosages are logged in audit details
      expect(JSON.stringify(latestLog.metadata)).not.toContain('Amlodipine');
      expect(JSON.stringify(latestLog.metadata)).not.toContain('5mg');
    });
  });

  describe('5. End-to-End Clinical Assistant Tool Calling Flow', () => {
    it('should execute selected tool and generate grounded answer via /api/assistant/ask', async () => {
      // Mock AI microservice responses
      aiServiceClient.selectToolsOrAnswer = jest.fn().mockResolvedValue({
        directAnswer: null,
        toolCalls: [
          {
            name: 'get_medications',
            arguments: { patientId: patientProfile1._id.toString() },
          },
        ],
        metadata: { provider: 'mock', selectedTools: ['get_medications'] },
      });

      aiServiceClient.generateGroundedAnswer = jest.fn().mockResolvedValue({
        answer: 'Patient is currently prescribed Amlodipine Besylate 5mg once daily.',
        grounded: true,
        sources: [
          {
            recordId: med1._id.toString(),
            recordType: 'MEDICATION',
            recordDate: med1.recordDate.toISOString(),
            hospitalName: 'Hospital Alpha P14',
            doctorName: 'Dr. Alice Smith',
            relevanceScore: 1.0,
          },
        ],
        metadata: { provider: 'mock', evidenceCount: 1 },
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          question: 'What medications is the patient taking?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grounded).toBe(true);
      expect(res.body.data.answer).toContain('Amlodipine Besylate 5mg');
      expect(res.body.data.sources.length).toBe(1);
      expect(res.body.data.metadata.toolsUsed).toContain('get_medications');
    });

    it('should return direct answer without tool execution for greetings or prompt injection', async () => {
      aiServiceClient.selectToolsOrAnswer = jest.fn().mockResolvedValue({
        directAnswer: 'Hello! I am your HealthBridge Clinical Assistant. How can I help you review patient records today?',
        toolCalls: [],
        metadata: { provider: 'mock', intent: 'GREETING' },
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          question: 'Hello assistant!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grounded).toBe(false);
      expect(res.body.data.answer).toContain('Hello! I am your HealthBridge Clinical Assistant');
      expect(res.body.data.sources).toEqual([]);
    });
  });
});
