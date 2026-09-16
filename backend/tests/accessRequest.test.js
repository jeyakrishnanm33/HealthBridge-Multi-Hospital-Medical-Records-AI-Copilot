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
const { AccessRequest } = require('../src/models/AccessRequest');
const { Consent } = require('../src/models/Consent');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Access Request Domain Tests (Phase 8)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;

  let doctorUserA, doctorTokenA, doctorProfileA;
  let doctorUserB, doctorTokenB, doctorProfileB;
  let doctorUserSuspended, doctorTokenSuspended, doctorProfileSuspended;
  let doctorUserUnaffiliated, doctorTokenUnaffiliated, doctorProfileUnaffiliated;

  let patientUser1, patientToken1, patientProfile1;
  let patientUser2, patientToken2, patientProfile2;

  let hospitalA, hospitalB, hospitalPending;
  let affiliationA_DocA, affiliationB_DocB;
  let membershipA_Pat1, membershipB_Pat1, membershipB_Pat2;
  let assignmentB_DocB_Pat1;

  beforeAll(async () => {
    await connectDB();

    // Clean up collections
    await User.deleteMany({ email: /test-phase8-ar\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P8AR$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});

    // Seed Admins
    sysAdminUser = await User.create({
      name: 'System Admin P8AR',
      email: 'sysadmin@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: 'SYSTEM_ADMIN' });

    hospAdminA = await User.create({
      name: 'Admin Hosp A P8AR',
      email: 'adminA@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: 'HOSPITAL_ADMIN' });

    hospAdminB = await User.create({
      name: 'Admin Hosp B P8AR',
      email: 'adminB@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: 'HOSPITAL_ADMIN' });

    // Seed Hospitals
    hospitalA = await Hospital.create({
      name: 'Apollo Hospital P8AR',
      hospitalCode: 'APOLLO-P8AR',
      address: { street: '12 Health Way', city: 'Chennai', state: 'TN', zipCode: '600001', country: 'India' },
      contactEmail: 'contact@apollo-p8ar.local',
      contactPhone: '+914428290001',
      licenseNumber: 'HOSP-LIC-P8AR-01',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    hospitalB = await Hospital.create({
      name: 'Fortis Hospital P8AR',
      hospitalCode: 'FORTIS-P8AR',
      address: { street: '45 Care Ave', city: 'Bangalore', state: 'KA', zipCode: '560001', country: 'India' },
      contactEmail: 'contact@fortis-p8ar.local',
      contactPhone: '+918028290002',
      licenseNumber: 'HOSP-LIC-P8AR-02',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
    });

    hospitalPending = await Hospital.create({
      name: 'Pending Hospital P8AR',
      hospitalCode: 'PEND-P8AR',
      address: { street: '99 Wait Rd', city: 'Delhi', state: 'DL', postalCode: '110001', country: 'India' },
      contactEmail: 'contact@pending-p8ar.local',
      contactPhone: '+911128290003',
      licenseNumber: 'HOSP-LIC-P8AR-03',
      status: 'PENDING',
      registeredBy: hospAdminA._id,
    });

    // Seed Doctors
    doctorUserA = await User.create({
      name: 'Dr. Arun Kumar P8AR',
      email: 'dr.arun@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenA = generateToken({ sub: doctorUserA._id.toString(), role: 'DOCTOR' });
    doctorProfileA = await Doctor.create({
      user: doctorUserA._id,
      fullName: 'Dr. Arun Kumar P8AR',
      phone: '+919876543211',
      gender: 'MALE',
      dateOfBirth: new Date('1980-05-10'),
      medicalLicenseNumber: 'DOC-LIC-P8AR-01',
      specialization: 'CARDIOLOGY',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 10,
      status: 'ACTIVE',
      approvedBy: sysAdminUser._id,
    });

    doctorUserB = await User.create({
      name: 'Dr. Bhaskar Sen P8AR',
      email: 'dr.bhaskar@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenB = generateToken({ sub: doctorUserB._id.toString(), role: 'DOCTOR' });
    doctorProfileB = await Doctor.create({
      user: doctorUserB._id,
      fullName: 'Dr. Bhaskar Sen P8AR',
      phone: '+919876543212',
      gender: 'MALE',
      dateOfBirth: new Date('1982-08-15'),
      medicalLicenseNumber: 'DOC-LIC-P8AR-02',
      specialization: 'GENERAL_MEDICINE',
      qualifications: ['MBBS', 'MD'],
      yearsOfExperience: 8,
      status: 'ACTIVE',
      approvedBy: sysAdminUser._id,
    });

    doctorUserSuspended = await User.create({
      name: 'Dr. Suspended P8AR',
      email: 'dr.suspended@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenSuspended = generateToken({ sub: doctorUserSuspended._id.toString(), role: 'DOCTOR' });
    doctorProfileSuspended = await Doctor.create({
      user: doctorUserSuspended._id,
      fullName: 'Dr. Suspended P8AR',
      phone: '+919876543213',
      gender: 'MALE',
      dateOfBirth: new Date('1985-02-15'),
      medicalLicenseNumber: 'DOC-LIC-P8AR-03',
      specialization: 'NEUROLOGY',
      qualifications: ['MBBS'],
      yearsOfExperience: 5,
      status: 'SUSPENDED',
    });

    doctorUserUnaffiliated = await User.create({
      name: 'Dr. Unaffiliated P8AR',
      email: 'dr.unaffiliated@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorTokenUnaffiliated = generateToken({ sub: doctorUserUnaffiliated._id.toString(), role: 'DOCTOR' });
    doctorProfileUnaffiliated = await Doctor.create({
      user: doctorUserUnaffiliated._id,
      fullName: 'Dr. Unaffiliated P8AR',
      phone: '+919876543214',
      gender: 'FEMALE',
      dateOfBirth: new Date('1989-07-20'),
      medicalLicenseNumber: 'DOC-LIC-P8AR-04',
      specialization: 'PEDIATRICS',
      qualifications: ['MBBS', 'DCH'],
      yearsOfExperience: 4,
      status: 'ACTIVE',
      approvedBy: sysAdminUser._id,
    });

    // Seed Affiliations
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

    // Seed Patients
    patientUser1 = await User.create({
      name: 'Priya Sharma P8AR',
      email: 'priya.sharma@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken1 = generateToken({ sub: patientUser1._id.toString(), role: 'PATIENT' });
    patientProfile1 = await Patient.create({
      user: patientUser1._id,
      patientId: 'PAT-P8AR-001',
      gender: 'FEMALE',
      dateOfBirth: new Date('1992-05-15'),
      bloodGroup: 'O+',
      phone: '+919876543221',
      address: { street: '12 Main St', city: 'Chennai', state: 'TN', country: 'India' },
      status: 'ACTIVE',
    });

    patientUser2 = await User.create({
      name: 'Rohan Gupta P8AR',
      email: 'rohan.gupta@test-phase8-ar.local',
      passwordHash: '$2b$10$fakesaltforunhashedtests1234567890123456789012',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken2 = generateToken({ sub: patientUser2._id.toString(), role: 'PATIENT' });
    patientProfile2 = await Patient.create({
      user: patientUser2._id,
      patientId: 'PAT-P8AR-002',
      gender: 'MALE',
      dateOfBirth: new Date('1988-11-20'),
      bloodGroup: 'A+',
      phone: '+919876543222',
      address: { street: '45 Park Rd', city: 'Bangalore', state: 'KA', country: 'India' },
      status: 'ACTIVE',
    });

    // Patient Memberships:
    // Patient 1 has records / registered at Hospital A, and also registered at Hospital B
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

    // Patient 2 registered only at Hospital B
    membershipB_Pat2 = await PatientHospitalMembership.create({
      patient: patientProfile2._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
    });

    // Active Doctor-Patient Assignment:
    // Dr. Bhaskar Sen (Hospital B) treats Patient 1 at Hospital B!
    assignmentB_DocB_Pat1 = await DoctorPatientAssignment.create({
      doctor: doctorProfileB._id,
      patient: patientProfile1._id,
      hospital: hospitalB._id,
      assignedBy: hospAdminB._id,
      status: 'ACTIVE',
      assignmentType: 'PRIMARY',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-phase8-ar\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P8AR$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});
    await disconnectDB();
  });

  describe('1. Invariants & Preconditions for Creating Access Requests', () => {
    it('Invariant 1: Non-doctor roles cannot create access requests (403)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
        });

      expect(res.status).toBe(403);
    });

    it('Invariant 2: Suspended doctor cannot create access requests (403)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenSuspended}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
        });

      expect(res.status).toBe(403);
    });

    it('Invariant 3: Cannot create access request if requesting hospital is not approved (403)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalPending._id.toString(),
          requestedScopes: ['VISITS'],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('REQUESTING_HOSPITAL_NOT_APPROVED');
    });

    it('Invariant 4: Cannot create access request if source hospital is not approved (403)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalPending._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('SOURCE_HOSPITAL_NOT_APPROVED');
    });

    it('Invariant 5: Doctor must have active affiliation with requesting hospital (403)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenUnaffiliated}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOCTOR_NOT_AFFILIATED');
    });

    it('Invariant 7: Doctor must have active assignment with patient at requesting hospital (403)', async () => {
      // Dr. Bhaskar does NOT have assignment with Patient 2
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile2._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ASSIGNMENT_NOT_ACTIVE');
    });

    it('Invariant 8: Patient must have active membership at source hospital (400)', async () => {
      // Patient 2 only has membership at Hospital B, not Hospital A!
      // Let's create an assignment for Doc B with Patient 2 at Hosp B first to isolate invariant 8
      const tempAssignment = await DoctorPatientAssignment.create({
        doctor: doctorProfileB._id,
        patient: patientProfile2._id,
        hospital: hospitalB._id,
        assignedBy: hospAdminB._id,
        status: 'ACTIVE',
        assignmentType: 'CONSULTING',
      });

      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile2._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
        });

      await DoctorPatientAssignment.findByIdAndDelete(tempAssignment._id);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PATIENT_SOURCE_MEMBERSHIP_REQUIRED');
    });

    it('Invariant 9: Requesting hospital and source hospital must be distinct (400)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalB._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SAME_HOSPITAL_REQUEST_REJECTED');
    });

    it('Invariant 10: At least one scope must be requested (400 validation)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: [],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('2. Access Request Lifecycle & Duplicate Prevention', () => {
    let createdRequestId;

    it('Doctor successfully creates an access request (201)', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['MEDICATIONS', 'LAB_RESULTS'],
          purpose: 'TREATMENT',
          notes: 'Reviewing past test results and prescriptions before surgery',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessRequest).toBeDefined();
      expect(res.body.data.accessRequest.status).toBe('PENDING');
      expect(res.body.data.accessRequest.normalizedScopesKey).toBe('LAB_RESULTS,MEDICATIONS');
      createdRequestId = res.body.data.accessRequest.id || res.body.data.accessRequest._id;
    });

    it('Invariant 12: Duplicate pending request with same scopes (even rearranged order) returns 409', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['LAB_RESULTS', 'MEDICATIONS'], // inverted order
          purpose: 'TREATMENT',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_PENDING_REQUEST');
    });

    it('Allows creating another request with different scopes', async () => {
      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['VISITS'],
          purpose: 'TREATMENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.accessRequest.status).toBe('PENDING');
      const reqId = res.body.data.accessRequest.id || res.body.data.accessRequest._id;
      // Clean it up by cancelling so it does not interfere
      await request(app)
        .patch(`/api/access-requests/${reqId}/cancel`)
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({ reason: 'Accidental submission' });
    });

    it('List access requests role isolation: Patient sees their requests', async () => {
      const res = await request(app)
        .get('/api/access-requests')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessRequests.length).toBeGreaterThanOrEqual(1);
      const found = res.body.data.accessRequests.find((r) => (r.id || r._id) === createdRequestId);
      expect(found).toBeDefined();
    });

    it('List access requests role isolation: Doctor sees their requests', async () => {
      const res = await request(app)
        .get('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessRequests.length).toBeGreaterThanOrEqual(1);
    });

    it('Get access request by ID', async () => {
      const res = await request(app)
        .get(`/api/access-requests/${createdRequestId}`)
        .set('Authorization', `Bearer ${doctorTokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.data.accessRequest.id || res.body.data.accessRequest._id).toBe(createdRequestId);
    });

    it('Unrelated patient cannot view or approve someone else request (403)', async () => {
      const res = await request(app)
        .get(`/api/access-requests/${createdRequestId}`)
        .set('Authorization', `Bearer ${patientToken2}`);

      expect(res.status).toBe(403);
    });
  });

  describe('3. Deny, Cancel, and Invalid State Transitions', () => {
    let cancelRequestId;
    let denyRequestId;

    beforeEach(async () => {
      await AccessRequest.deleteMany({});

      // Create fresh requests for denial and cancellation
      const res1 = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['DOCUMENTS'],
        });
      cancelRequestId = res1.body.data.accessRequest.id || res1.body.data.accessRequest._id;

      const res2 = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['PRESCRIPTIONS'],
        });
      denyRequestId = res2.body.data.accessRequest.id || res2.body.data.accessRequest._id;
    });

    it('Doctor can cancel their pending access request (200)', async () => {
      const res = await request(app)
        .patch(`/api/access-requests/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({ reason: 'No longer needed' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessRequest.status).toBe('CANCELLED');
      expect(res.body.data.accessRequest.cancelledAt).toBeDefined();
    });

    it('Another doctor cannot cancel someone elses request (403)', async () => {
      const res = await request(app)
        .patch(`/api/access-requests/${denyRequestId}/cancel`)
        .set('Authorization', `Bearer ${doctorTokenA}`)
        .send({ reason: 'Unauthorized cancel' });

      expect(res.status).toBe(403);
    });

    it('Patient can deny a pending access request (200)', async () => {
      const res = await request(app)
        .patch(`/api/access-requests/${denyRequestId}/deny`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ reason: 'I prefer to bring hard copies myself' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessRequest.status).toBe('DENIED');
      expect(res.body.data.accessRequest.deniedAt).toBeDefined();
    });

    it('Cannot approve an already denied request (400 INVALID_STATE_TRANSITION)', async () => {
      await request(app)
        .patch(`/api/access-requests/${denyRequestId}/deny`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ reason: 'Denied first' });

      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .patch(`/api/access-requests/${denyRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ expiresAt: futureDate });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('Cannot cancel an already cancelled request (400 INVALID_STATE_TRANSITION)', async () => {
      // First cancel cancelRequestId
      await request(app)
        .patch(`/api/access-requests/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({ reason: 'No longer needed' });

      const res = await request(app)
        .patch(`/api/access-requests/${cancelRequestId}/cancel`)
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({ reason: 'Cancel again' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });
  });

  describe('4. Approval & Consent Generation', () => {
    let approvalRequestId;

    beforeAll(async () => {
      await AccessRequest.deleteMany({});

      const res = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({
          patientId: patientProfile1._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          requestedScopes: ['LAB_RESULTS', 'MEDICATIONS'],
        });
      approvalRequestId = res.body.data.accessRequest.id || res.body.data.accessRequest._id;
    });

    it('Patient approves request: transitions to APPROVED and creates Consent artifact', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .patch(`/api/access-requests/${approvalRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({
          expiresAt: futureDate,
          scopes: ['LAB_RESULTS', 'MEDICATIONS'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessRequest.status).toBe('APPROVED');
      expect(res.body.data.accessRequest.approvedAt).toBeDefined();
      expect(res.body.data.consent).toBeDefined();
      expect(res.body.data.consent.scopes).toEqual(expect.arrayContaining(['LAB_RESULTS', 'MEDICATIONS']));
      expect(res.body.data.consent.effectiveStatus).toBe('ACTIVE');
    });

    it('Cannot re-approve an already APPROVED request (400)', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .patch(`/api/access-requests/${approvalRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ expiresAt: futureDate });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('Reject approval with past expiration timestamp (400 validation)', async () => {
      const pastDate = new Date(Date.now() - 10000).toISOString();
      const res = await request(app)
        .patch(`/api/access-requests/${approvalRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ expiresAt: pastDate });

      expect(res.status).toBe(400);
    });

    it('Doctor cannot approve an access request (403 Forbidden)', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .patch(`/api/access-requests/${approvalRequestId}/approve`)
        .set('Authorization', `Bearer ${doctorTokenB}`)
        .send({ expiresAt: futureDate });

      expect(res.status).toBe(403);
    });

    it('Patient cannot cancel an access request (403 Forbidden)', async () => {
      const res = await request(app)
        .patch(`/api/access-requests/${approvalRequestId}/cancel`)
        .set('Authorization', `Bearer ${patientToken1}`)
        .send({ reason: 'Patient trying to cancel' });

      expect(res.status).toBe(403);
    });

    it('Filter access requests with status query filter', async () => {
      const res = await request(app)
        .get('/api/access-requests?status=APPROVED')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.requests.every((r) => r.status === 'APPROVED')).toBe(true);
    });

    it('List access requests pagination (page=1, limit=1)', async () => {
      const res = await request(app)
        .get('/api/access-requests?page=1&limit=1')
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.requests.length).toBeLessThanOrEqual(1);
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(1);
    });

    it('Get non-existent access request ID returns 404', async () => {
      const nonExistentId = '666666666666666666666666';
      const res = await request(app)
        .get(`/api/access-requests/${nonExistentId}`)
        .set('Authorization', `Bearer ${patientToken1}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ACCESS_REQUEST_NOT_FOUND');
    });
  });
});
