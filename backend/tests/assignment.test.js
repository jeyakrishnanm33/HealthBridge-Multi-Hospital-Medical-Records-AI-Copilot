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
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Doctor–Patient Assignments Tests (Phase 6)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;
  let doctorUser1, doctorToken1, doctorProfile1;
  let doctorUser2, doctorToken2, doctorProfile2;
  let doctorPendingProfileUser, doctorPendingToken, doctorPendingProfile;
  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;

  let hospitalA, hospitalB, pendingHospital, suspendedHospital;
  let affiliationA1, affiliationB1;
  let membershipA1, membershipB2;

  beforeAll(async () => {
    await connectDB();

    // Clean up test collections
    await User.deleteMany({ email: /test-phase6\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P6$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});

    // 1. Seed users
    sysAdminUser = await User.create({
      name: 'System Admin P6',
      email: 'sysadmin@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminA = await User.create({
      name: 'Admin Hospital A P6',
      email: 'adminA@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: 'HOSPITAL_ADMIN' });

    hospAdminB = await User.create({
      name: 'Admin Hospital B P6',
      email: 'adminB@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: 'HOSPITAL_ADMIN' });

    doctorUser1 = await User.create({
      name: 'Dr. Gregory House P6',
      email: 'dr.house@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorToken1 = generateToken({ sub: doctorUser1._id.toString(), role: 'DOCTOR' });

    doctorUser2 = await User.create({
      name: 'Dr. John Watson P6',
      email: 'dr.watson@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorToken2 = generateToken({ sub: doctorUser2._id.toString(), role: 'DOCTOR' });

    doctorPendingProfileUser = await User.create({
      name: 'Dr. Pending P6',
      email: 'dr.pending@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorPendingToken = generateToken({
      sub: doctorPendingProfileUser._id.toString(),
      role: 'DOCTOR',
    });

    patientUser1 = await User.create({
      name: 'Patient One P6',
      email: 'patient1@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });

    patientUser2 = await User.create({
      name: 'Patient Two P6',
      email: 'patient2@test-phase6.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });

    // 2. Seed hospitals
    hospitalA = await Hospital.create({
      name: 'City General Hospital P6',
      hospitalCode: 'CGH-P6',
      address: { street: '100 Medical Plaza', city: 'Cityville', state: 'State', country: 'India' },
      contactEmail: 'contact@cgh.test-phase6.local',
      contactPhone: '+919876543210',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    hospitalB = await Hospital.create({
      name: 'Metro Care Center P6',
      hospitalCode: 'MCC-P6',
      address: { street: '200 Health Way', city: 'Metropolis', state: 'State', country: 'India' },
      contactEmail: 'contact@mcc.test-phase6.local',
      contactPhone: '+919876543211',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
    });

    pendingHospital = await Hospital.create({
      name: 'Pending Facility P6',
      hospitalCode: 'PFH-P6',
      address: { street: '300 Wait Lane', city: 'Waitville', state: 'State', country: 'India' },
      contactEmail: 'contact@pfh.test-phase6.local',
      contactPhone: '+919876543212',
      status: 'PENDING',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    suspendedHospital = await Hospital.create({
      name: 'Suspended Facility P6',
      hospitalCode: 'SFH-P6',
      address: { street: '400 Hold St', city: 'Holdville', state: 'State', country: 'India' },
      contactEmail: 'contact@sfh.test-phase6.local',
      contactPhone: '+919876543213',
      status: 'SUSPENDED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    // 3. Seed doctor clinical profiles
    doctorProfile1 = await Doctor.create({
      user: doctorUser1._id,
      fullName: 'Dr. Gregory House',
      phone: '+919876543220',
      gender: 'MALE',
      dateOfBirth: new Date('1975-05-15'),
      medicalLicenseNumber: 'MCI-60001',
      specialization: 'Diagnostic Medicine',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 20,
      status: 'ACTIVE',
    });

    doctorProfile2 = await Doctor.create({
      user: doctorUser2._id,
      fullName: 'Dr. John Watson',
      phone: '+919876543221',
      gender: 'MALE',
      dateOfBirth: new Date('1980-07-20'),
      medicalLicenseNumber: 'MCI-60002',
      specialization: 'General Practice',
      qualifications: ['MBBS'],
      yearsOfExperience: 10,
      status: 'ACTIVE',
    });

    doctorPendingProfile = await Doctor.create({
      user: doctorPendingProfileUser._id,
      fullName: 'Dr. Pending Doe',
      phone: '+919876543222',
      gender: 'OTHER',
      dateOfBirth: new Date('1990-01-01'),
      medicalLicenseNumber: 'MCI-60003',
      specialization: 'Pediatrics',
      qualifications: ['MBBS'],
      yearsOfExperience: 2,
      status: 'PENDING',
    });

    // 4. Seed doctor affiliations
    // Doctor 1 is ACTIVE in Hospital A
    affiliationA1 = await DoctorHospitalAffiliation.create({
      doctor: doctorProfile1._id,
      hospital: hospitalA._id,
      department: 'Diagnostics',
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    // Doctor 1 is ACTIVE in Hospital B
    affiliationB1 = await DoctorHospitalAffiliation.create({
      doctor: doctorProfile1._id,
      hospital: hospitalB._id,
      department: 'ICU',
      status: 'ACTIVE',
      approvedAt: new Date(),
      approvedBy: hospAdminB._id,
    });

    // Doctor 2 has PENDING affiliation in Hospital A
    await DoctorHospitalAffiliation.create({
      doctor: doctorProfile2._id,
      hospital: hospitalA._id,
      department: 'General',
      status: 'PENDING',
    });

    // 5. Seed patients
    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PAT-600001',
      dateOfBirth: new Date('1995-03-10'),
      gender: 'MALE',
      bloodGroup: 'O+',
      phone: '+919876543230',
      address: { street: '12 First St', city: 'Cityville', state: 'State', country: 'India' },
      status: 'ACTIVE',
    });

    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PAT-600002',
      dateOfBirth: new Date('1998-11-25'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      phone: '+919876543231',
      address: { street: '34 Second St', city: 'Metropolis', state: 'State', country: 'India' },
      status: 'ACTIVE',
    });

    // 6. Seed patient hospital memberships
    // Patient 1 has ACTIVE membership in Hospital A
    membershipA1 = await PatientHospitalMembership.create({
      patient: patientProfile1._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    // Patient 2 has ACTIVE membership in Hospital B
    membershipB2 = await PatientHospitalMembership.create({
      patient: patientProfile2._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
      approvedAt: new Date(),
      approvedBy: hospAdminB._id,
    });

    // Patient 2 has PENDING membership in Hospital A
    await PatientHospitalMembership.create({
      patient: patientProfile2._id,
      hospital: hospitalA._id,
      status: 'PENDING',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-phase6\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P6$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await disconnectDB();
  });

  // ==========================================
  // 1. ASSIGNMENT CREATION & PRECONDITIONS
  // ==========================================
  describe('Assignment Creation & Precondition Invariants', () => {
    let createdAssignmentId;

    it('1. Hospital Admin can create assignment inside own hospital with valid prerequisites', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          notes: 'Primary physician assignment for diagnostic workup',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment).toBeDefined();
      expect(res.body.data.assignment.status).toBe('ACTIVE');
      expect(res.body.data.assignment.doctor.fullName).toBe('Dr. Gregory House');
      expect(res.body.data.assignment.patient.patientId).toBe('PAT-600001');
      expect(res.body.data.assignment.hospital.hospitalCode).toBe('CGH-P6');
      expect(res.body.data.assignment.assignedBy.email).toBe('admina@test-phase6.local');
      expect(res.body.data.assignment.endedAt).toBeNull();

      createdAssignmentId = res.body.data.assignment.id;
    });

    it('2. Fails with 404 when doctor does not exist', async () => {
      const fakeDoctorId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: fakeDoctorId,
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_NOT_FOUND');
    });

    it('3. Fails with 404 when patient does not exist', async () => {
      const fakePatientId = '507f1f77bcf86cd799439012';
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: fakePatientId,
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PATIENT_NOT_FOUND');
    });

    it('4. Fails with 404 when hospital does not exist', async () => {
      const fakeHospId = '507f1f77bcf86cd799439013';
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: fakeHospId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_FOUND');
    });

    it('5. Fails with 400 DOCTOR_NOT_ACTIVE when doctor profile is PENDING', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorPendingProfile._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_NOT_ACTIVE');
    });

    it('6. Fails with 400 HOSPITAL_NOT_APPROVED when hospital is PENDING', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: pendingHospital._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('6b. Fails with 400 HOSPITAL_NOT_APPROVED when hospital is SUSPENDED', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: suspendedHospital._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_NOT_APPROVED');
    });

    it('7. Fails with 400 DOCTOR_AFFILIATION_REQUIRED when doctor has no affiliation with target hospital', async () => {
      // Doctor 2 has NO affiliation record with Hospital B
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({
          doctorId: doctorProfile2._id.toString(),
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalB._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_AFFILIATION_REQUIRED');
    });

    it('8. Fails with 400 DOCTOR_AFFILIATION_REQUIRED when doctor affiliation is not ACTIVE (PENDING)', async () => {
      // Doctor 2 is PENDING at Hospital A
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile2._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DOCTOR_AFFILIATION_REQUIRED');
    });

    it('9. Fails with 400 PATIENT_MEMBERSHIP_REQUIRED when patient has no membership with target hospital', async () => {
      // Patient 1 has NO membership with Hospital B
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalB._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PATIENT_MEMBERSHIP_REQUIRED');
    });

    it('10. Fails with 400 PATIENT_MEMBERSHIP_REQUIRED when patient membership is not ACTIVE (PENDING)', async () => {
      // Patient 2 is PENDING at Hospital A
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PATIENT_MEMBERSHIP_REQUIRED');
    });

    it('11. Duplicate active assignment returns 409 ACTIVE_ASSIGNMENT_EXISTS', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ACTIVE_ASSIGNMENT_EXISTS');
    });
  });

  // ==========================================
  // 2. TENANT ISOLATION & AUTHORIZATION
  // ==========================================
  describe('Tenant Isolation & Role Authorization Gates', () => {
    it('12. MANDATORY: Hospital Admin A CANNOT create assignment in Hospital B (403 HOSPITAL_ACCESS_FORBIDDEN)', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalB._id.toString(),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('13. System Admin can create assignments across any hospital', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile2._id.toString(),
          hospitalId: hospitalB._id.toString(),
          notes: 'System Admin assigned specialist',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment.hospital.hospitalCode).toBe('MCC-P6');
    });

    it('14. Doctor CANNOT create assignments (403 FORBIDDEN_ASSIGNMENT_CREATION)', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${doctorToken1}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(403);
    });

    it('15. Patient CANNOT create assignments (403 FORBIDDEN_ASSIGNMENT_CREATION)', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
        });

      expect(res.status).toBe(403);
    });

    it('16. Unauthenticated request rejected with 401 Unauthorized', async () => {
      const res = await request(app).post('/api/assignments').send({});

      expect(res.status).toBe(401);
    });
  });

  // ==========================================
  // 3. ROLE-SCOPED LISTING & VIEWING
  // ==========================================
  describe('Role-Scoped Assignment Listing & Details', () => {
    it('17. Hospital Admin A can view assignments for Hospital A', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.assignments)).toBe(true);
      expect(res.body.data.assignments.length).toBe(1);
      expect(res.body.data.assignments[0].hospital.hospitalCode).toBe('CGH-P6');
    });

    it('18. Hospital Admin A CANNOT view assignments for Hospital B (403)', async () => {
      const res = await request(app)
        .get(`/api/assignments?hospitalId=${hospitalB._id}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('19. Doctor 1 can view own assignments across hospitals', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${doctorToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Doctor 1 has assignment in Hosp A (Patient 1) and Hosp B (Patient 2)
      expect(res.body.data.assignments.length).toBe(2);
    });

    it('20. Doctor 2 receives empty list (no assignments)', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${doctorToken2}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignments.length).toBe(0);
    });

    it('21. Patient 1 can view assignments involving themselves', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignments.length).toBe(1);
      expect(res.body.data.assignments[0].patient.patientId).toBe('PAT-600001');
    });

    it('22. Doctor 2 cannot view assignment details of Doctor 1 by ID (403)', async () => {
      // Find assignment for Doctor 1
      const assignments = await DoctorPatientAssignment.find({ doctor: doctorProfile1._id });
      const assignmentId = assignments[0]._id;

      const res = await request(app)
        .get(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${doctorToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ASSIGNMENT_ACCESS_FORBIDDEN');
    });

    it('22b. Patient 2 cannot view assignment details of Patient 1 by ID (403)', async () => {
      const assignments = await DoctorPatientAssignment.find({ patient: patientProfile1._id });
      const assignmentId = assignments[0]._id;

      const res = await request(app)
        .get(`/api/assignments/${assignmentId}`)
        .set('Authorization', `Bearer ${patientToken2}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ASSIGNMENT_ACCESS_FORBIDDEN');
    });
  });

  // ==========================================
  // 4. ASSIGNMENT LIFECYCLE & ENDING
  // ==========================================
  describe('Assignment Lifecycle (ACTIVE -> ENDED) & Historical State', () => {
    let targetAssignmentId;

    beforeAll(async () => {
      const assignment = await DoctorPatientAssignment.findOne({
        doctor: doctorProfile1._id,
        hospital: hospitalA._id,
      });
      targetAssignmentId = assignment._id.toString();
    });

    it('23. Hospital Admin A can end active assignment (ACTIVE -> ENDED)', async () => {
      const res = await request(app)
        .patch(`/api/assignments/${targetAssignmentId}/end`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment.status).toBe('ENDED');
      expect(res.body.data.assignment.endedAt).toBeDefined();
      expect(res.body.data.assignment.endedBy.email).toBe('admina@test-phase6.local');
    });

    it('24. Ended assignment remains preserved in database (not deleted)', async () => {
      const stored = await DoctorPatientAssignment.findById(targetAssignmentId);
      expect(stored).not.toBeNull();
      expect(stored.status).toBe('ENDED');
      expect(stored.endedAt).toBeInstanceOf(Date);
    });

    it('25. Ended assignment cannot be ended again (400 ASSIGNMENT_ALREADY_ENDED)', async () => {
      const res = await request(app)
        .patch(`/api/assignments/${targetAssignmentId}/end`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('ASSIGNMENT_ALREADY_ENDED');
    });

    it('26. Hospital Admin A CANNOT end Hospital B assignment (403 HOSPITAL_ACCESS_FORBIDDEN)', async () => {
      const hospBAssignment = await DoctorPatientAssignment.findOne({ hospital: hospitalB._id });

      const res = await request(app)
        .patch(`/api/assignments/${hospBAssignment._id}/end`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('HOSPITAL_ACCESS_FORBIDDEN');
    });

    it('27. Doctor CANNOT end assignments (403)', async () => {
      const hospBAssignment = await DoctorPatientAssignment.findOne({ hospital: hospitalB._id });

      const res = await request(app)
        .patch(`/api/assignments/${hospBAssignment._id}/end`)
        .set('Authorization', `Bearer ${doctorToken1}`);

      expect(res.status).toBe(403);
    });

    it('28. Patient CANNOT end assignments (403)', async () => {
      const hospBAssignment = await DoctorPatientAssignment.findOne({ hospital: hospitalB._id });

      const res = await request(app)
        .patch(`/api/assignments/${hospBAssignment._id}/end`)
        .set('Authorization', `Bearer ${patientToken2}`);

      expect(res.status).toBe(403);
    });

    it('29. Re-assignment: after assignment has ENDED, a new ACTIVE assignment can be created', async () => {
      // Re-create assignment between Doctor 1 and Patient 1 at Hospital A
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile1._id.toString(),
          patientId: patientProfile1._id.toString(),
          hospitalId: hospitalA._id.toString(),
          notes: 'Re-admitted under Dr. House care',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignment.status).toBe('ACTIVE');

      // Both historical (ENDED) and current (ACTIVE) exist in database
      const count = await DoctorPatientAssignment.countDocuments({
        doctor: doctorProfile1._id,
        patient: patientProfile1._id,
        hospital: hospitalA._id,
      });
      expect(count).toBe(2);
    });
  });

  // ==========================================
  // 5. SECURITY & DATA REDACTION
  // ==========================================
  describe('Security & Data Redaction', () => {
    it('30. Password hashes and sensitive credentials never leak in assignment responses', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      const jsonStr = JSON.stringify(res.body);
      expect(jsonStr).not.toContain('passwordHash');
      expect(jsonStr).not.toContain('fakesalt');
    });

    it('31. Malformed ObjectId in URL parameter returns 400 Bad Request', async () => {
      const res = await request(app)
        .get('/api/assignments/not-a-valid-object-id')
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(400);
    });
  });
});
