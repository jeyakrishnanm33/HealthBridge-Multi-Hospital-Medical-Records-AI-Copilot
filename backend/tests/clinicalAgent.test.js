/**
 * HealthBridge Phase 15 Integration Tests
 * Controlled Agent Orchestration & Multi-Step Clinical Workflows
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
const { Consent } = require('../src/models/Consent');
const { AuditLog } = require('../src/models/AuditLog');
const { generateToken } = require('../src/utils/jwt');
const aiServiceClient = require('../src/services/aiServiceClient');
const { runAgentWorkflow } = require('../src/ai/agent/agentOrchestrator');
const { AgentStateMachine, AGENT_STATES } = require('../src/ai/agent/agentState');

describe('HealthBridge Phase 15: Controlled Agent Orchestration & Multi-Step Workflows Tests', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminUser, hospAdminToken;
  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;
  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;
  let hospitalA;

  let visit1, diag1, med1, lab1, rx1;
  let originalPlanStepMethod, originalRagMethod;

  beforeAll(async () => {
    await connectDB();

    // Clean test collections
    await User.deleteMany({ email: /@test-phase15\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P15$/ });
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
      name: 'System Admin P15',
      email: 'sysadmin@test-phase15.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    // 2. Seed Hospital
    hospitalA = await Hospital.create({
      name: 'Hospital Alpha P15',
      hospitalCode: 'HOSP-A-P15',
      address: { street: '100 Medical Blvd', city: 'Metropolis', state: 'NY', zipCode: '10001', country: 'USA' },
      contactEmail: 'admin@hospa-p15.local',
      contactPhone: '+1-555-0101',
      status: 'APPROVED',
      registeredBy: sysAdminUser._id,
    });

    hospAdminUser = await User.create({
      name: 'Hospital Admin P15',
      email: 'hospadmin@test-phase15.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      hospital: hospitalA._id,
      status: 'ACTIVE',
    });
    hospAdminToken = generateToken({ sub: hospAdminUser._id.toString(), role: 'HOSPITAL_ADMIN' });

    // 3. Seed Doctors
    doctorUserA = await User.create({
      name: 'Dr. Alice P15',
      email: 'doctora@test-phase15.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });

    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. Alice Smith',
      specialization: 'Cardiology',
      medicalLicenseNumber: 'LIC-P15-001',
      qualifications: ['MD', 'Cardiology Fellow'],
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
      name: 'Dr. Bob P15',
      email: 'doctorb@test-phase15.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });

    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Bob Jones',
      specialization: 'Neurology',
      medicalLicenseNumber: 'LIC-P15-002',
      qualifications: ['MD', 'Neurology Board'],
      yearsOfExperience: 8,
      phone: '+1-555-0202',
      gender: 'MALE',
      dateOfBirth: new Date('1988-08-20'),
      status: 'ACTIVE',
    });

    // 4. Seed Patients
    patientUser1 = await User.create({
      name: 'Patient One P15',
      email: 'patient1@test-phase15.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });

    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PT-P15-0001',
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
      name: 'Patient Two P15',
      email: 'patient2@test-phase15.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });

    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PT-P15-0002',
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

    // 7. Seed Records for Patient 1
    visit1 = await VisitRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'VISIT',
      recordDate: new Date('2026-03-01T10:00:00Z'),
      symptoms: ['Chest tightness'],
      diagnosis: 'Hypertension Followup',
      notes: 'Blood pressure slightly elevated.',
      vitalSigns: { bloodPressure: '138/88', heartRate: 78 },
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
    });

    originalPlanStepMethod = aiServiceClient.planAgentStep;
    originalRagMethod = aiServiceClient.generateGroundedAnswer;
  });

  afterAll(async () => {
    aiServiceClient.planAgentStep = originalPlanStepMethod;
    aiServiceClient.generateGroundedAnswer = originalRagMethod;

    await User.deleteMany({ email: /@test-phase15\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P15$/ });
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

  describe('1. Agent State Machine Transitions', () => {
    it('should govern legal transitions and block illegal transitions', () => {
      const sm = new AgentStateMachine();
      expect(sm.getState()).toBe(AGENT_STATES.INITIALIZING);

      sm.transitionTo(AGENT_STATES.PLANNING);
      expect(sm.getState()).toBe(AGENT_STATES.PLANNING);

      sm.transitionTo(AGENT_STATES.WAITING_FOR_TOOL);
      expect(sm.getState()).toBe(AGENT_STATES.WAITING_FOR_TOOL);

      sm.transitionTo(AGENT_STATES.EXECUTING_TOOL);
      sm.transitionTo(AGENT_STATES.EVALUATING_RESULT);
      sm.transitionTo(AGENT_STATES.FINALIZING);
      sm.transitionTo(AGENT_STATES.COMPLETED);
      expect(sm.isTerminal()).toBe(true);

      // Illegal transition from terminal state COMPLETED
      expect(() => sm.transitionTo(AGENT_STATES.EXECUTING_TOOL)).toThrow(/Invalid agent state transition/);
    });
  });

  describe('2. Multi-Step Agent Execution Flow', () => {
    it('should execute a 2-step clinical workflow (visits -> labs -> final grounded answer)', async () => {
      let callCount = 0;
      aiServiceClient.planAgentStep = jest.fn().mockImplementation(async ({ stepNumber }) => {
        callCount++;
        if (stepNumber === 1) {
          return {
            decision: {
              action: 'TOOL_CALL',
              tool: 'get_recent_visits',
              arguments: { patientId: patientProfile1._id.toString() },
              thoughtSummary: 'Retrieving visit records',
            },
          };
        } else if (stepNumber === 2) {
          return {
            decision: {
              action: 'TOOL_CALL',
              tool: 'get_lab_results',
              arguments: { patientId: patientProfile1._id.toString() },
              thoughtSummary: 'Retrieving lab results',
            },
          };
        } else {
          return {
            decision: {
              action: 'FINAL',
              answer: 'Patient had a visit on 2026-03-01 for Hypertension and total cholesterol was 195 mg/dL on 2026-02-10.',
              citations: [
                { recordId: visit1._id.toString(), recordType: 'VISIT' },
                { recordId: lab1._id.toString(), recordType: 'LAB_RESULT' },
              ],
              thoughtSummary: 'Final synthesis completed',
            },
          };
        }
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          question: 'Summarize the recent visits and lab results for this patient.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grounded).toBe(true);
      expect(res.body.data.sources.length).toBe(2);
      expect(res.body.data.metadata.toolsUsed).toContain('get_recent_visits');
      expect(res.body.data.metadata.toolsUsed).toContain('get_lab_results');
      expect(callCount).toBe(3);
    });

    it('should return direct answer without tool calls for greetings', async () => {
      aiServiceClient.planAgentStep = jest.fn().mockResolvedValue({
        decision: {
          action: 'FINAL',
          answer: 'Hello! I am your HealthBridge Clinical Assistant. How can I assist you?',
          citations: [],
          thoughtSummary: 'Greeting handled directly',
        },
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          question: 'Hi there assistant',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.grounded).toBe(false);
      expect(res.body.data.answer).toContain('Hello! I am your HealthBridge Clinical Assistant');
      expect(res.body.data.sources).toEqual([]);
    });
  });

  describe('3. Citation Verification & Hallucination Prevention Gate', () => {
    it('should strip fabricated citations that were never retrieved during the agent run', async () => {
      const fakeRecordId = '507f1f77bcf86cd799439099';

      aiServiceClient.planAgentStep = jest.fn().mockImplementation(async ({ stepNumber }) => {
        if (stepNumber === 1) {
          return {
            decision: {
              action: 'TOOL_CALL',
              tool: 'get_medications',
              arguments: { patientId: patientProfile1._id.toString() },
            },
          };
        }
        return {
          decision: {
            action: 'FINAL',
            answer: 'Patient is on Amlodipine 5mg.',
            citations: [
              { recordId: med1._id.toString(), recordType: 'MEDICATION' }, // Valid retrieved record
              { recordId: fakeRecordId, recordType: 'LAB_RESULT' }, // Fabricated hallucinated ID
            ],
          },
        };
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          question: 'What medications is the patient on?',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Valid citation is retained
      expect(res.body.data.sources.some((s) => s.recordId === med1._id.toString())).toBe(true);
      // Fabricated citation must be stripped out by Express verification
      expect(res.body.data.sources.some((s) => s.recordId === fakeRecordId)).toBe(false);
    });
  });

  describe('4. RBAC & Pre-Execution Authorization in Agent Loop', () => {
    it('should deny SYSTEM_ADMIN from invoking agent workflows', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({
          patientId: patientProfile1._id.toString(),
          question: 'Summarize clinical records',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });

    it('should deny Patient from running agent workflow on another patient ID', async () => {
      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          patientId: patientProfile2._id.toString(),
          question: 'Summarize visits',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PATIENT_ISOLATION_VIOLATION');
    });

    it('should deny Doctor when agent attempts a tool outside granted consent scope', async () => {
      // Dr Bob only has MEDICATIONS scope
      aiServiceClient.planAgentStep = jest.fn().mockResolvedValue({
        decision: {
          action: 'TOOL_CALL',
          tool: 'get_lab_results', // Not covered by Dr Bob's MEDICATIONS consent
          arguments: { patientId: patientProfile1._id.toString() },
        },
      });

      const res = await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          question: 'Check patient lab results',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CONSENT_SCOPE_RESTRICTED');
    });
  });

  describe('5. Zero-PHI Audit Logging', () => {
    it('should record CLINICAL_AGENT_STARTED and CLINICAL_AGENT_COMPLETED with zero PHI', async () => {
      aiServiceClient.planAgentStep = jest.fn().mockImplementation(async ({ stepNumber }) => {
        if (stepNumber === 1) {
          return {
            decision: {
              action: 'TOOL_CALL',
              tool: 'get_medications',
              arguments: { patientId: patientProfile1._id.toString() },
            },
          };
        }
        return {
          decision: {
            action: 'FINAL',
            answer: 'Patient takes Amlodipine 5mg.',
            citations: [{ recordId: med1._id.toString() }],
          },
        };
      });

      await request(app)
        .post('/api/clinical-assistant/ask')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          question: 'What medication is active?',
        });

      const startLog = await AuditLog.findOne({ action: 'CLINICAL_AGENT_STARTED' }).sort({ createdAt: -1 });
      expect(startLog).toBeDefined();
      expect(startLog.resourceType).toBe('CLINICAL_AGENT');

      const completedLog = await AuditLog.findOne({ action: 'CLINICAL_AGENT_COMPLETED' }).sort({ createdAt: -1 });
      expect(completedLog).toBeDefined();
      expect(completedLog.metadata.toolsUsed).toContain('get_medications');

      // Zero-PHI assertion
      const detailsStr = JSON.stringify(completedLog.metadata);
      expect(detailsStr).not.toContain('Amlodipine');
      expect(detailsStr).not.toContain('5mg');
    });
  });
});
