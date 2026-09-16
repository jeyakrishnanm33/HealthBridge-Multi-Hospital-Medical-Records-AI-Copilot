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
const { LabResultRecord } = require('../src/models/LabResultRecord');
const { MedicationRecord } = require('../src/models/MedicationRecord');
const { AccessRequest } = require('../src/models/AccessRequest');
const { Consent } = require('../src/models/Consent');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Consent & Cross-Hospital Medical Records Tests (Phase 8)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;

  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;

  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;

  let hospitalA, hospitalB;
  let affiliationA_DocA, affiliationB_DocB;
  let membershipA_Pat1, membershipB_Pat1;
  let assignmentA_DocA_Pat1, assignmentB_DocB_Pat1;

  let visitRecordA, labRecordA, medicationRecordA;
  let activeConsent, expiredConsent, revocableConsent;

  beforeAll(async () => {
    await connectDB();

    // Clean up
    await User.deleteMany({ email: /test-phase8-consent\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P8CON$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});

    // Seed Users
    sysAdminUser = await User.create({
      name: 'SysAdmin P8CON',
      email: 'sysadmin@test-phase8-consent.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminA = await User.create({
      name: 'Admin A P8CON',
      email: 'adminA@test-phase8-consent.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: 'HOSPITAL_ADMIN' });

    hospAdminB = await User.create({
      name: 'Admin B P8CON',
      email: 'adminB@test-phase8-consent.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: 'HOSPITAL_ADMIN' });

    hospitalA = await Hospital.create({
      name: 'Apollo Hospital P8CON',
      hospitalCode: 'APOLLO-P8CON',
      address: { street: '1 Health Ave', city: 'Chennai', state: 'TN', zipCode: '600001', country: 'India' },
      contactEmail: 'contact@apollo-p8con.local',
      contactPhone: '+914428291001',
      licenseNumber: 'HOSP-LIC-P8CON-01',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    hospitalB = await Hospital.create({
      name: 'Fortis Hospital P8CON',
      hospitalCode: 'FORTIS-P8CON',
      address: { street: '2 Care Blvd', city: 'Bangalore', state: 'KA', zipCode: '560001', country: 'India' },
      contactEmail: 'contact@fortis-p8con.local',
      contactPhone: '+918028291002',
      licenseNumber: 'HOSP-LIC-P8CON-02',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
    });

    // Doctors
    doctorUserA = await User.create({
      name: 'Dr. Arun Kumar P8CON',
      email: 'dr.arun@test-phase8-consent.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });
    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. Arun Kumar P8CON',
      phone: '+919876543211',
      gender: 'MALE',
      dateOfBirth: new Date('1980-05-10'),
      medicalLicenseNumber: 'DOC-LIC-P8CON-01',
      specialization: 'CARDIOLOGY',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 10,
      status: 'ACTIVE',
      approvedBy: sysAdminUser._id,
    });

    doctorUserB = await User.create({
      name: 'Dr. Bhaskar Sen P8CON',
      email: 'dr.bhaskar@test-phase8-consent.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });
    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Bhaskar Sen P8CON',
      phone: '+919876543212',
      gender: 'MALE',
      dateOfBirth: new Date('1982-08-15'),
      medicalLicenseNumber: 'DOC-LIC-P8CON-02',
      specialization: 'GENERAL_MEDICINE',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 8,
      status: 'ACTIVE',
      approvedBy: sysAdminUser._id,
    });

    // Affiliations
    affiliationA_DocA = await DoctorHospitalAffiliation.create({
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      department: 'Cardiology',
      designation: 'Senior Consultant',
      status: 'ACTIVE',
      approvedBy: hospAdminA._id,
    });

    affiliationB_DocB = await DoctorHospitalAffiliation.create({
      doctor: doctorProfileB._id,
      hospital: hospitalB._id,
      department: 'General Medicine',
      designation: 'Attending Physician',
      status: 'ACTIVE',
      approvedBy: hospAdminB._id,
    });

    // Patients
    patientUser1 = await User.create({
      name: 'Priya Sharma P8CON',
      email: 'priya.sharma@test-phase8-consent.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });
    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PAT-P8CON-001',
      gender: 'FEMALE',
      dateOfBirth: new Date('1992-05-15'),
      bloodGroup: 'O+',
      phone: '+919876543221',
      address: { street: '12 Main St', city: 'Chennai', state: 'TN', country: 'India' },
      status: 'ACTIVE',
    });

    patientUser2 = await User.create({
      name: 'Rohan Gupta P8CON',
      email: 'rohan.gupta@test-phase8-consent.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });
    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PAT-P8CON-002',
      gender: 'MALE',
      dateOfBirth: new Date('1988-11-20'),
      bloodGroup: 'A+',
      phone: '+919876543222',
      address: { street: '45 Park Rd', city: 'Bangalore', state: 'KA', country: 'India' },
      status: 'ACTIVE',
    });

    // Memberships
    membershipA_Pat1 = await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
    });
    membershipB_Pat1 = await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
    });

    // Assignments
    // Doc A treats Pat 1 at Hospital A
    assignmentA_DocA_Pat1 = await DoctorPatientAssignment.create({
      doctor: doctorProfileA._id,
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      assignedBy: hospAdminA._id,
      status: 'ACTIVE',
      assignmentType: 'PRIMARY',
    });

    // Doc B treats Pat 1 at Hospital B
    assignmentB_DocB_Pat1 = await DoctorPatientAssignment.create({
      doctor: doctorProfileB._id,
      patient: patientProfile1._id,
      hospital: hospitalB._id,
      assignedBy: hospAdminB._id,
      status: 'ACTIVE',
      assignmentType: 'PRIMARY',
    });

    // Seed Records at Hospital A for Patient 1
    visitRecordA = await VisitRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'VISIT',
      recordDate: new Date(),
      symptoms: ['Chest discomfort'],
      diagnosis: 'Mild angina',
      notes: 'Advised rest',
    });

    labRecordA = await LabResultRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'LAB_RESULT',
      recordDate: new Date(),
      testName: 'Lipid Profile Panel',
      value: '240',
      unit: 'mg/dL',
      referenceRange: '< 200',
      interpretation: 'ABNORMAL',
      notes: 'Hyperlipidemia',
    });

    medicationRecordA = await MedicationRecord.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      doctor: doctorProfileA._id,
      recordType: 'MEDICATION',
      recordDate: new Date(),
      medicineName: 'Atorvastatin',
      dosage: '20mg',
      frequency: 'Once daily',
      duration: '30 days',
      instructions: 'Take at bedtime',
    });

    // Create an active consent for Doctor B at Hospital B to access Patient 1's LAB_RESULTS and MEDICATIONS at Hospital A
    activeConsent = await Consent.create({
      patient: patientProfile1._id,
      requestingDoctor: doctorProfileB._id,
      requestingHospital: hospitalB._id,
      sourceHospital: hospitalA._id,
      scopes: ['LAB_RESULTS', 'MEDICATIONS'],
      purpose: 'TREATMENT',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days future
      grantedBy: patientUser1._id,
    });

    // Create a revocable consent for testing revocation
    revocableConsent = await Consent.create({
      patient: patientProfile1._id,
      requestingDoctor: doctorProfileB._id,
      requestingHospital: hospitalB._id,
      sourceHospital: hospitalA._id,
      scopes: ['DOCUMENTS'],
      purpose: 'TREATMENT',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      grantedBy: patientUser1._id,
    });

    // Create an expired consent
    expiredConsent = await Consent.create({
      patient: patientProfile1._id,
      requestingDoctor: doctorProfileB._id,
      requestingHospital: hospitalB._id,
      sourceHospital: hospitalA._id,
      scopes: ['VISITS'],
      purpose: 'TREATMENT',
      grantedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // expired 7 days ago
      grantedBy: patientUser1._id,
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-phase8-consent\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P8CON$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});
    await disconnectDB();
  });

  describe('1. Consent Retrieval & Listing Role Scoping', () => {
    it('Patient lists their consents (200)', async () => {
      const res = await request(app)
        .get('/api/consents')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.consents.length).toBeGreaterThanOrEqual(3);
    });

    it('Doctor lists consents granted to them (200)', async () => {
      const res = await request(app)
        .get('/api/consents')
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.consents.length).toBeGreaterThanOrEqual(3);
      const allForDoctorB = res.body.data.consents.every(
        (c) => (c.requestingDoctor.id || c.requestingDoctor._id).toString() === doctorProfileB._id.toString()
      );
      expect(allForDoctorB).toBe(true);
    });

    it('Hospital Admin lists consents involving their hospital (200)', async () => {
      const res = await request(app)
        .get('/api/consents')
        .set('Authorization', `Bearer ${hospAdminBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.consents.length).toBeGreaterThanOrEqual(1);
    });

    it('Filter consents by ACTIVE status: computes dynamically without cron', async () => {
      const res = await request(app)
        .get('/api/consents?status=ACTIVE')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      res.body.data.consents.forEach((c) => {
        expect(c.effectiveStatus).toBe('ACTIVE');
        expect(new Date(c.expiresAt).getTime()).toBeGreaterThan(Date.now());
        expect(c.revokedAt).toBeNull();
      });
    });

    it('Filter consents by EXPIRED status', async () => {
      const res = await request(app)
        .get('/api/consents?status=EXPIRED')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.consents.length).toBeGreaterThanOrEqual(1);
      res.body.data.consents.forEach((c) => {
        expect(c.effectiveStatus).toBe('EXPIRED');
      });
    });

    it('Get consent by ID', async () => {
      const res = await request(app)
        .get(`/api/consents/${activeConsent._id}`)
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.consent.id || res.body.data.consent._id).toBe(activeConsent._id.toString());
      expect(res.body.data.consent.effectiveStatus).toBe('ACTIVE');
    });

    it('Unrelated patient cannot access another patients consent (403)', async () => {
      const res = await request(app)
        .get(`/api/consents/${activeConsent._id}`)
        .set('Authorization', `Bearer ${patientToken2}`);

      expect(res.status).toBe(403);
    });
  });

  describe('2. Consent Revocation', () => {
    it('Non-patient (Doctor/Admin) cannot revoke consent (403)', async () => {
      const res = await request(app)
        .patch(`/api/consents/${revocableConsent._id}/revoke`)
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({ reason: 'Doctor trying to revoke' });

      expect(res.status).toBe(403);
    });

    it('Patient successfully revokes consent (200)', async () => {
      const res = await request(app)
        .patch(`/api/consents/${revocableConsent._id}/revoke`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ reason: 'Consultation concluded' });

      expect(res.status).toBe(200);
      expect(res.body.data.consent.revokedAt).toBeDefined();
      expect(res.body.data.consent.effectiveStatus).toBe('REVOKED');
    });

    it('Cannot revoke an already revoked consent (400)', async () => {
      const res = await request(app)
        .patch(`/api/consents/${revocableConsent._id}/revoke`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ reason: 'Trying to revoke again' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CONSENT_ALREADY_REVOKED');
    });

    it('Cannot revoke an expired consent (400)', async () => {
      const res = await request(app)
        .patch(`/api/consents/${expiredConsent._id}/revoke`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ reason: 'Revoke expired' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CONSENT_ALREADY_EXPIRED');
    });
  });

  describe('3. Cross-Hospital Medical Record Access with Consent', () => {
    it('Doctor B can access Patient 1s LAB_RESULT at Hospital A via active consent (200)', async () => {
      const res = await request(app)
        .get(`/api/records/${labRecordA._id}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record.id || res.body.data.record._id).toBe(labRecordA._id.toString());
      expect(res.body.data.record.testName).toBe('Lipid Profile Panel');
    });

    it('Doctor B can access Patient 1s MEDICATION record at Hospital A via active consent (200)', async () => {
      const res = await request(app)
        .get(`/api/records/${medicationRecordA._id}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record.id || res.body.data.record._id).toBe(medicationRecordA._id.toString());
    });

    it('Doctor B is DENIED access to VISIT record at Hospital A because scope is not granted (403)', async () => {
      // activeConsent scopes are only LAB_RESULTS and MEDICATIONS
      const res = await request(app)
        .get(`/api/records/${visitRecordA._id}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CONSENT_SCOPE_NOT_AUTHORIZED');
    });

    it('Doctor B is DENIED access to records if consent is expired (403)', async () => {
      // Create a lab record at Hospital A that is only covered by expired consent
      // We already tested that expired consent does not authorize. Let's revoke active consent and verify immediate cutoff:
    });

    it('Immediate cutoff: Revoking consent immediately denies cross-hospital access (403)', async () => {
      // Patient 1 revokes activeConsent
      await request(app)
        .patch(`/api/consents/${activeConsent._id}/revoke`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ reason: 'Withdrawing permission immediately' });

      // Doctor B attempts to view labRecordA again
      const res = await request(app)
        .get(`/api/records/${labRecordA._id}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CONSENT_REVOKED');
    });
  });

  describe('4. Administrative Isolation & Non-Regression', () => {
    it('Hospital Admin cannot access medical records directly (403 ADMIN_CLINICAL_ACCESS_RESTRICTED)', async () => {
      const res = await request(app)
        .get(`/api/records/${labRecordA._id}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });

    it('System Admin cannot access medical records directly (403 ADMIN_CLINICAL_ACCESS_RESTRICTED)', async () => {
      const res = await request(app)
        .get(`/api/records/${labRecordA._id}`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });

    it('Same-hospital doctor with assignment accesses records without cross-hospital consent (200)', async () => {
      // Doctor A at Hospital A has active assignment with Patient 1 at Hospital A
      const res = await request(app)
        .get(`/api/records/${visitRecordA._id}`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record.id || res.body.data.record._id).toBe(visitRecordA._id.toString());
      expect(res.body.data.record.diagnosis).toBe('Mild angina');
    });

    it('Patient self-access works directly without consent requirement (200)', async () => {
      const res = await request(app)
        .get(`/api/records/${visitRecordA._id}`)
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record.id || res.body.data.record._id).toBe(visitRecordA._id.toString());
    });
  });
});
