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
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Medical Records Domain Tests (Phase 7)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;
  let doctorUserPending, doctorTokenPending, doctorProfilePending;
  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;

  let hospitalA, hospitalB, unapprovedHospital;
  let affiliationA_DocA, affiliationB_DocB;
  let membershipA_Pat1, membershipB_Pat2;
  let assignmentA_DocA_Pat1;

  beforeAll(async () => {
    await connectDB();

    // Clean up test collections
    await User.deleteMany({ email: /test-phase7\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P7$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});

    // 1. Seed Users
    sysAdminUser = await User.create({
      name: 'System Admin P7',
      email: 'sysadmin@test-phase7.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminA = await User.create({
      name: 'Admin Hospital A P7',
      email: 'adminA@test-phase7.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: 'HOSPITAL_ADMIN' });

    doctorUserA = await User.create({
      name: 'Dr. Arun Kumar P7',
      email: 'dr.arun@test-phase7.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });

    doctorUserB = await User.create({
      name: 'Dr. Bhaskar Sen P7',
      email: 'dr.bhaskar@test-phase7.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });

    doctorUserPending = await User.create({
      name: 'Dr. Pending Doe P7',
      email: 'dr.pending@test-phase7.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenPending = generateToken({ sub: doctorUserPending._id.toString(), role: 'DOCTOR' });

    patientUser1 = await User.create({
      name: 'Priya Sharma P7',
      email: 'priya.sharma@test-phase7.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });

    patientUser2 = await User.create({
      name: 'Rahul Verma P7',
      email: 'rahul.verma@test-phase7.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });

    // 2. Seed Hospitals
    hospitalA = await Hospital.create({
      name: 'HealthBridge General Hospital A P7',
      hospitalCode: 'HBA-P7',
      address: { street: '100 Medical Blvd', city: 'Cityville', state: 'State', country: 'India' },
      contactEmail: 'contact@hba.test-phase7.local',
      contactPhone: '+919876543201',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    hospitalB = await Hospital.create({
      name: 'HealthBridge Metro Hospital B P7',
      hospitalCode: 'HBB-P7',
      address: { street: '200 Care Way', city: 'Metropolis', state: 'State', country: 'India' },
      contactEmail: 'contact@hbb.test-phase7.local',
      contactPhone: '+919876543202',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    unapprovedHospital = await Hospital.create({
      name: 'Unapproved Clinic P7',
      hospitalCode: 'UAC-P7',
      address: { street: '300 Wait Ave', city: 'Pendingville', state: 'State', country: 'India' },
      contactEmail: 'contact@uac.test-phase7.local',
      contactPhone: '+919876543203',
      status: 'PENDING',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    // 3. Seed Doctor Profiles
    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. Arun Kumar',
      phone: '+919876543211',
      gender: 'MALE',
      dateOfBirth: new Date('1980-05-10'),
      medicalLicenseNumber: 'MCI-70001',
      specialization: 'Internal Medicine',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 15,
      status: 'ACTIVE',
    });

    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Bhaskar Sen',
      phone: '+919876543212',
      gender: 'MALE',
      dateOfBirth: new Date('1982-08-15'),
      medicalLicenseNumber: 'MCI-70002',
      specialization: 'Cardiology',
      qualifications: ['MBBS', 'DM'],
      yearsOfExperience: 12,
      status: 'ACTIVE',
    });

    doctorProfilePending = await Doctor.create({
      user: doctorUserPending._id,
      fullName: 'Dr. Pending Doe',
      phone: '+919876543213',
      gender: 'OTHER',
      dateOfBirth: new Date('1992-01-01'),
      medicalLicenseNumber: 'MCI-70003',
      specialization: 'Dermatology',
      qualifications: ['MBBS'],
      yearsOfExperience: 2,
      status: 'PENDING',
    });

    // 4. Seed Affiliations
    // Dr. Arun is ACTIVE in Hospital A
    affiliationA_DocA = await DoctorHospitalAffiliation.create({
      doctor: doctorProfileA._id,
      hospital: hospitalA._id,
      department: 'General Medicine',
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    // Dr. Bhaskar is ACTIVE in Hospital B
    affiliationB_DocB = await DoctorHospitalAffiliation.create({
      doctor: doctorProfileB._id,
      hospital: hospitalB._id,
      department: 'Cardiology',
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    // 5. Seed Patients
    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PAT-700001',
      dateOfBirth: new Date('1994-04-12'),
      gender: 'FEMALE',
      bloodGroup: 'B+',
      phone: '+919876543221',
      address: { street: '12 Main St', city: 'Cityville', state: 'State', country: 'India' },
      status: 'ACTIVE',
    });

    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PAT-700002',
      dateOfBirth: new Date('1996-09-20'),
      gender: 'MALE',
      bloodGroup: 'O+',
      phone: '+919876543222',
      address: { street: '56 South Ave', city: 'Metropolis', state: 'State', country: 'India' },
      status: 'ACTIVE',
    });

    // 6. Seed Memberships
    // Priya (Pat1) is ACTIVE in Hospital A
    membershipA_Pat1 = await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    // Rahul (Pat2) is ACTIVE in Hospital B
    membershipB_Pat2 = await PatientHospitalMembership.create({
      patient: patientProfile2._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    // 7. Seed Doctor-Patient Assignment
    // Dr. Arun is assigned to Priya at Hospital A
    assignmentA_DocA_Pat1 = await DoctorPatientAssignment.create({
      doctor: doctorProfileA._id,
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      assignedAt: new Date(),
      assignedBy: hospAdminA._id,
      notes: 'Initial clinical assignment',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-phase7\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P7$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await MedicalRecord.deleteMany({});
    await disconnectDB();
  });

  // ==========================================
  // 1. RECORD CREATION (ALL 6 DISCRIMINATORS)
  // ==========================================
  describe('Medical Record Creation & Discriminators', () => {
    let createdVisitId;

    it('1. Active doctor can create a valid VISIT record for an assigned patient', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          recordDate: new Date().toISOString(),
          content: {
            symptoms: ['Fever', 'Dry cough', 'Headache'],
            diagnosis: 'Viral Upper Respiratory Infection',
            notes: 'Advised 3 days of rest and increased fluid intake.',
            vitalSigns: {
              bloodPressure: '120/80',
              heartRate: 76,
              temperature: 99.2,
            },
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.recordType).toBe('VISIT');
      expect(res.body.data.record.patient.id).toBe(patientProfile1._id.toString());
      expect(res.body.data.record.hospital.id).toBe(hospitalA._id.toString());
      expect(res.body.data.record.doctor.id).toBe(doctorProfileA._id.toString());
      expect(res.body.data.record.symptoms).toEqual(['Fever', 'Dry cough', 'Headache']);
      expect(res.body.data.record.vitalSigns.bloodPressure).toBe('120/80');

      createdVisitId = res.body.data.record.id;
    });

    it('2. Active doctor can create a valid DIAGNOSIS record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'DIAGNOSIS',
          content: {
            diagnosis: 'Acute Bronchitis',
            condition: 'Bronchial inflammation',
            icdCode: 'J20.9',
            status: 'CONFIRMED',
            notes: 'Secondary to viral infection',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.recordType).toBe('DIAGNOSIS');
      expect(res.body.data.record.diagnosis).toBe('Acute Bronchitis');
      expect(res.body.data.record.icdCode).toBe('J20.9');
      expect(res.body.data.record.status).toBe('CONFIRMED');
    });

    it('3. Active doctor can create a valid MEDICATION record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'MEDICATION',
          content: {
            medicineName: 'Paracetamol',
            dosage: '650mg',
            frequency: 'TDS (Thrice daily)',
            duration: '5 days',
            instructions: 'Take post-meals if fever exceeds 100 F',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.recordType).toBe('MEDICATION');
      expect(res.body.data.record.medicineName).toBe('Paracetamol');
      expect(res.body.data.record.dosage).toBe('650mg');
    });

    it('4. Active doctor can create a valid LAB_RESULT record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'LAB_RESULT',
          content: {
            testName: 'Complete Blood Count (CBC)',
            value: '11.5',
            unit: 'g/dL',
            referenceRange: '12.0 - 15.5',
            interpretation: 'ABNORMAL',
            notes: 'Mild anemia detected',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.recordType).toBe('LAB_RESULT');
      expect(res.body.data.record.testName).toBe('Complete Blood Count (CBC)');
      expect(res.body.data.record.interpretation).toBe('ABNORMAL');
    });

    it('5. Active doctor can create a valid PRESCRIPTION record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'PRESCRIPTION',
          content: {
            medications: [
              {
                medicineName: 'Amoxicillin',
                dosage: '500mg',
                frequency: 'TDS',
                duration: '7 days',
                instructions: 'Complete full course',
              },
              {
                medicineName: 'Cetirizine',
                dosage: '10mg',
                frequency: 'OD (Night)',
                duration: '3 days',
              },
            ],
            instructions: 'Review in OPD if symptoms persist after 5 days.',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.recordType).toBe('PRESCRIPTION');
      expect(res.body.data.record.medications).toHaveLength(2);
      expect(res.body.data.record.medications[0].medicineName).toBe('Amoxicillin');
    });

    it('6. Active doctor can create a valid DOCUMENT record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'DOCUMENT',
          content: {
            documentType: 'CLINICAL_NOTE',
            fileName: 'opd_summary_20260916.pdf',
            mimeType: 'application/pdf',
            storageReference: 'synthetic-storage://hba/records/opd_summary_20260916.pdf',
            fileSize: 1048576,
            notes: 'Synthetic clinical discharge note reference',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.recordType).toBe('DOCUMENT');
      expect(res.body.data.record.fileName).toBe('opd_summary_20260916.pdf');
      expect(res.body.data.record.storageReference).toContain('synthetic-storage://');
    });
  });

  // ==========================================
  // 2. AUTHORIZATION & PRECONDITION GATES
  // ==========================================
  describe('Record Creation Authorization Gates', () => {
    it('7. Patient cannot create medical records (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Fever'] },
        });

      expect(res.status).toBe(403);
    });

    it('8. Hospital Administrator cannot create medical records (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Fever'] },
        });

      expect(res.status).toBe(403);
    });

    it('9. System Administrator cannot create medical records (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Fever'] },
        });

      expect(res.status).toBe(403);
    });

    it('10. Inactive / Pending doctor cannot create medical records (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenPending}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Fever'] },
        });

      expect(res.status).toBe(403);
    });

    it('11. Doctor without active affiliation with hospital cannot create records (403 Forbidden)', async () => {
      // Dr. Bhaskar has affiliation with Hospital B, NOT Hospital A
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Fever'] },
        });

      expect(res.status).toBe(403);
    });

    it('12. Doctor at unapproved hospital cannot create records (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: unapprovedHospital._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Fever'] },
        });

      expect(res.status).toBe(403);
    });

    it('13. Doctor without active patient assignment cannot create records (403 Forbidden)', async () => {
      // Dr. Arun has NO assignment with Rahul (patient 2)
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Cough'] },
        });

      expect(res.status).toBe(403);
    });

    it('14. Cross-tenant isolation: Doctor A at Hospital A cannot create records for Patient at Hospital B (403)', async () => {
      // Rahul belongs to Hospital B, Dr Arun is at Hospital A
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalB._id.toString(),
          recordType: 'VISIT',
          content: { symptoms: ['Chest pain'] },
        });

      expect(res.status).toBe(403);
    });

    it('15. Invalid record type rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'SURGERY_UNKNOWN',
          content: { notes: 'Invalid type' },
        });

      expect(res.status).toBe(400);
    });

    it('16. Incomplete discriminator content rejected (400 Bad Request)', async () => {
      // DIAGNOSIS requires diagnosis field
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'DIAGNOSIS',
          content: {
            notes: 'Missing diagnosis title',
          },
        });

      expect(res.status).toBe(400);
    });

    it('17. Empty prescription medications array rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          recordType: 'PRESCRIPTION',
          content: {
            medications: [],
            instructions: 'No medications provided',
          },
        });

      expect(res.status).toBe(400);
    });
  });

  // ==========================================
  // 3. RECORD RETRIEVAL & ACCESS CONTROL
  // ==========================================
  describe('Record Retrieval & Access Control', () => {
    let existingRecord;

    beforeAll(async () => {
      existingRecord = await VisitRecord.findOne({ patient: patientProfile1._id });
    });

    it('18. Assigned doctor can list assigned patient records via /api/records/patient/:id', async () => {
      const res = await request(app)
        .get(`/api/records/patient/${patientProfile1._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records.length).toBeGreaterThan(0);
      expect(res.body.data.pagination.total).toBeGreaterThan(0);
    });

    it('19. Assigned doctor can list assigned patient records via /api/patients/:id/records alias', async () => {
      const res = await request(app)
        .get(`/api/patients/${patientProfile1._id.toString()}/records`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records.length).toBeGreaterThan(0);
    });

    it('20. Assigned doctor can retrieve a single medical record by ID', async () => {
      const res = await request(app)
        .get(`/api/records/${existingRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.id).toBe(existingRecord._id.toString());
      expect(res.body.data.record.patient.id).toBe(patientProfile1._id.toString());
    });

    it('21. Unassigned doctor cannot retrieve patient records (403 Forbidden)', async () => {
      // Dr. Bhaskar is NOT assigned to Priya (Pat1)
      const res = await request(app)
        .get(`/api/records/patient/${patientProfile1._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(403);
    });

    it('22. Unassigned doctor cannot retrieve single record by ID (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/records/${existingRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(403);
    });

    it('23. Patient can retrieve their own medical records', async () => {
      const res = await request(app)
        .get(`/api/records/patient/${patientProfile1._id.toString()}`)
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.records.length).toBeGreaterThan(0);
    });

    it('24. Patient can retrieve their own single medical record by ID', async () => {
      const res = await request(app)
        .get(`/api/records/${existingRecord._id.toString()}`)
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.id).toBe(existingRecord._id.toString());
    });

    it('25. Patient cannot retrieve another patient records (403 Forbidden)', async () => {
      // Rahul (patient 2) attempts to view Priya's records
      const res = await request(app)
        .get(`/api/records/patient/${patientProfile1._id.toString()}`)
        .set('Authorization', `Bearer ${patientToken2}`);

      expect(res.status).toBe(403);
    });

    it('26. Patient cannot retrieve another patient single record by ID (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/records/${existingRecord._id.toString()}`)
        .set('Authorization', `Bearer ${patientToken2}`);

      expect(res.status).toBe(403);
    });

    it('27. Hospital Administrator cannot directly access clinical record content (403 ADMIN_CLINICAL_ACCESS_RESTRICTED)', async () => {
      const res = await request(app)
        .get(`/api/records/${existingRecord._id.toString()}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });

    it('28. System Administrator cannot directly access clinical record content (403 ADMIN_CLINICAL_ACCESS_RESTRICTED)', async () => {
      const res = await request(app)
        .get(`/api/records/${existingRecord._id.toString()}`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ADMIN_CLINICAL_ACCESS_RESTRICTED');
    });
  });

  // ==========================================
  // 4. RECORD UPDATE & IMMUTABILITY
  // ==========================================
  describe('Record Updates & Immutability Guarantees', () => {
    let targetRecord;

    beforeAll(async () => {
      targetRecord = await VisitRecord.findOne({ patient: patientProfile1._id });
    });

    it('29. Authorized doctor can update clinical content of medical record', async () => {
      const res = await request(app)
        .patch(`/api/records/${targetRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          content: {
            symptoms: ['Fever', 'Dry cough', 'Mild Fatigue'],
            diagnosis: 'Viral Upper Respiratory Infection (Resolving)',
            notes: 'Follow-up noted significant improvement.',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.record.diagnosis).toBe(
        'Viral Upper Respiratory Infection (Resolving)'
      );
    });

    it('30. Unauthorized doctor cannot update medical record (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/records/${targetRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          content: {
            notes: 'Unauthorized edit attempt',
          },
        });

      expect(res.status).toBe(403);
    });

    it('31. Patient cannot update medical record (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/records/${targetRecord._id.toString()}`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          content: {
            notes: 'Patient attempt to modify clinical record',
          },
        });

      expect(res.status).toBe(403);
    });

    it('32. Immutability: Attempting to modify patient ownership is rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/records/${targetRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          patient: patientProfile2._id.toString(),
          patientId: patientProfile2._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FIELD_IMMUTABLE');
    });

    it('33. Immutability: Attempting to modify hospital ownership is rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/records/${targetRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          hospital: hospitalB._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FIELD_IMMUTABLE');
    });

    it('34. Immutability: Attempting to modify authoring doctor is rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/records/${targetRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          doctor: doctorProfileB._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FIELD_IMMUTABLE');
    });

    it('35. Immutability: Attempting to modify recordType is rejected (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/records/${targetRecord._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({
          recordType: 'MEDICATION',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FIELD_IMMUTABLE');
    });
  });

  // ==========================================
  // 5. STORAGE ARCHITECTURE & DATA INTEGRITY
  // ==========================================
  describe('Storage Architecture & Data Integrity', () => {
    it('36. All discriminators reside within single MongoDB collection "medical_records"', async () => {
      const rawRecords = await MedicalRecord.collection.find({}).toArray();
      expect(rawRecords.length).toBeGreaterThanOrEqual(6);

      const recordTypes = rawRecords.map((r) => r.recordType);
      expect(recordTypes).toContain('VISIT');
      expect(recordTypes).toContain('DIAGNOSIS');
      expect(recordTypes).toContain('MEDICATION');
      expect(recordTypes).toContain('LAB_RESULT');
      expect(recordTypes).toContain('PRESCRIPTION');
      expect(recordTypes).toContain('DOCUMENT');
    });

    it('37. Discriminator instances instantiate correct Mongoose sub-schemas', async () => {
      const prescriptionDoc = await MedicalRecord.findOne({ recordType: 'PRESCRIPTION' });
      expect(prescriptionDoc).toBeInstanceOf(PrescriptionRecord);
      expect(prescriptionDoc.medications.length).toBeGreaterThan(0);

      const documentDoc = await MedicalRecord.findOne({ recordType: 'DOCUMENT' });
      expect(documentDoc).toBeInstanceOf(DocumentRecord);
      expect(documentDoc.storageReference).toBeTruthy();
    });

    it('38. Physical deletion endpoint is deliberately excluded (DELETE /api/records/:id returns 404/405)', async () => {
      const sample = await MedicalRecord.findOne();
      const res = await request(app)
        .delete(`/api/records/${sample._id.toString()}`)
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect([404, 405]).toContain(res.status);
    });

    it('39. Malformed ObjectId in URL parameter returns 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/records/invalid-object-id')
        .set('Authorization', `Bearer ${doctorTokenA}`);

      expect(res.status).toBe(400);
    });
  });
});
