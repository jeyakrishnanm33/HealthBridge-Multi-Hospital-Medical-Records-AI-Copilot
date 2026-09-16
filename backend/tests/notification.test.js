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
const { Notification } = require('../src/models/Notification');
const notificationService = require('../src/services/notificationService');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Notifications & Clinical Event Communication Tests (Phase 10)', () => {
  let sysAdminUser, sysAdminToken;
  let hospAdminA, hospAdminAToken;
  let hospAdminB, hospAdminBToken;
  let doctorUser, doctorToken, doctorProfile;
  let patientUser, patientToken, patientProfile;
  let otherPatientUser, otherPatientToken, otherPatientProfile;

  let hospitalA, hospitalB;
  let affiliationA;
  let membershipA;

  beforeAll(async () => {
    await connectDB();

    // Clean up test collections
    await User.deleteMany({ email: /test-p10-notify\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P10NOT$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});
    await Notification.deleteMany({});

    // 1. System Admin
    sysAdminUser = await User.create({
      name: 'System Admin Notify',
      email: 'sysadmin@test-p10-notify.local',
      passwordHash: 'dummyhash',
      role: 'SYSTEM_ADMIN',
      status: 'ACTIVE',
    });
    sysAdminToken = generateToken({ sub: sysAdminUser._id.toString(), role: sysAdminUser.role });

    // 2. Hospital Admin A & Hospital A
    hospAdminA = await User.create({
      name: 'Admin Hospital A',
      email: 'admin-a@test-p10-notify.local',
      passwordHash: 'dummyhash',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminAToken = generateToken({ sub: hospAdminA._id.toString(), role: hospAdminA.role });

    hospitalA = await Hospital.create({
      name: 'St. Jude General Hospital',
      hospitalCode: 'HOSP-P10NOT',
      address: { street: '100 Medical Plaza', city: 'Metropolis', state: 'NY', zipCode: '10001' },
      contactEmail: 'contact@stjude-p10.local',
      contactPhone: '+1-555-0199',
      status: 'APPROVED',
      registeredBy: hospAdminA._id,
      admin: hospAdminA._id,
    });

    // 3. Hospital Admin B & Hospital B
    hospAdminB = await User.create({
      name: 'Admin Hospital B',
      email: 'admin-b@test-p10-notify.local',
      passwordHash: 'dummyhash',
      role: 'HOSPITAL_ADMIN',
      status: 'ACTIVE',
    });
    hospAdminBToken = generateToken({ sub: hospAdminB._id.toString(), role: hospAdminB.role });

    hospitalB = await Hospital.create({
      name: 'Mercy Cross Hospital',
      hospitalCode: 'HOSPB-P10NOT',
      address: { street: '200 Health Way', city: 'Metropolis', state: 'NY', zipCode: '10002' },
      contactEmail: 'contact@mercy-p10.local',
      contactPhone: '+1-555-0198',
      status: 'APPROVED',
      registeredBy: hospAdminB._id,
      admin: hospAdminB._id,
    });

    // 4. Doctor User & Profile
    doctorUser = await User.create({
      name: 'Dr. Gregory House',
      email: 'dr.house@test-p10-notify.local',
      passwordHash: 'dummyhash',
      role: 'DOCTOR',
      status: 'ACTIVE',
    });
    doctorToken = generateToken({ sub: doctorUser._id.toString(), role: doctorUser.role });

    doctorProfile = await Doctor.create({
      user: doctorUser._id,
      fullName: 'Dr. Gregory House',
      phone: '+1-555-0123',
      gender: 'MALE',
      dateOfBirth: new Date('1975-06-11'),
      medicalLicenseNumber: 'MD-P10-9988',
      specialization: 'Diagnostic Medicine',
      qualifications: ['MD', 'Board Certified'],
      yearsOfExperience: 15,
      status: 'ACTIVE',
    });

    affiliationA = await DoctorHospitalAffiliation.create({
      doctor: doctorProfile._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      department: 'Diagnostics',
      approvedAt: new Date(),
      approvedBy: hospAdminA._id,
    });

    affiliationB = await DoctorHospitalAffiliation.create({
      doctor: doctorProfile._id,
      hospital: hospitalB._id,
      status: 'ACTIVE',
      department: 'Diagnostics',
      approvedAt: new Date(),
      approvedBy: hospAdminB._id,
    });

    // 5. Patient User & Profile
    patientUser = await User.create({
      name: 'John Doe',
      email: 'johndoe@test-p10-notify.local',
      passwordHash: 'dummyhash',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    patientToken = generateToken({ sub: patientUser._id.toString(), role: patientUser.role });

    patientProfile = await Patient.create({
      user: patientUser._id,
      patientId: 'PAT-P10-001',
      dateOfBirth: new Date('1985-05-15'),
      gender: 'MALE',
      bloodGroup: 'O+',
      phone: '+1-555-0144',
      address: { street: '123 Main St', city: 'Metropolis', state: 'NY', zipCode: '10001' },
      emergencyContact: { name: 'Mary Doe', phone: '+1-555-0145', relationship: 'Spouse' },
      status: 'ACTIVE',
    });

    membershipA = await PatientHospitalMembership.create({
      patient: patientProfile._id,
      hospital: hospitalA._id,
      status: 'ACTIVE',
      joinedAt: new Date(),
    });

    // 6. Second Patient for isolation testing
    otherPatientUser = await User.create({
      name: 'Jane Smith',
      email: 'janesmith@test-p10-notify.local',
      passwordHash: 'dummyhash',
      role: 'PATIENT',
      status: 'ACTIVE',
    });
    otherPatientToken = generateToken({ sub: otherPatientUser._id.toString(), role: otherPatientUser.role });

    otherPatientProfile = await Patient.create({
      user: otherPatientUser._id,
      patientId: 'PAT-P10-002',
      dateOfBirth: new Date('1990-08-20'),
      gender: 'FEMALE',
      bloodGroup: 'A+',
      phone: '+1-555-0146',
      address: { street: '456 Elm St', city: 'Metropolis', state: 'NY', zipCode: '10002' },
      emergencyContact: { name: 'Bob Smith', phone: '+1-555-0147', relationship: 'Sibling' },
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /test-p10-notify\.local$/i });
    await Hospital.deleteMany({ hospitalCode: /-P10NOT$/ });
    await Doctor.deleteMany({});
    await DoctorHospitalAffiliation.deleteMany({});
    await Patient.deleteMany({});
    await PatientHospitalMembership.deleteMany({});
    await DoctorPatientAssignment.deleteMany({});
    await AccessRequest.deleteMany({});
    await Consent.deleteMany({});
    await Notification.deleteMany({});
    await disconnectDB();
  });

  describe('1. Notification Domain Model & Direct Service Operations', () => {
    it('creates a valid notification with UNREAD default status and timestamps', async () => {
      const notification = await notificationService.createNotification({
        recipient: doctorUser._id,
        type: 'DOCTOR_AFFILIATION_APPROVED',
        title: 'Affiliation Approved',
        message: 'Your hospital affiliation has been approved.',
        resourceType: 'DOCTOR',
        resourceId: doctorProfile._id,
        hospital: hospitalA._id,
        actor: hospAdminA._id,
      });

      expect(notification).toBeDefined();
      expect(notification._id).toBeDefined();
      expect(notification.recipient.toString()).toBe(doctorUser._id.toString());
      expect(notification.type).toBe('DOCTOR_AFFILIATION_APPROVED');
      expect(notification.status).toBe('UNREAD');
      expect(notification.readAt).toBeNull();
      expect(notification.createdAt).toBeDefined();
    });

    it('rejects notification creation when recipient is missing', async () => {
      await expect(
        notificationService.createNotification({
          recipient: null,
          type: 'DOCTOR_AFFILIATION_APPROVED',
          title: 'Test',
          message: 'Test message',
        })
      ).rejects.toThrow();
    });

    it('rejects notification creation with an invalid notification type', async () => {
      await expect(
        notificationService.createNotification({
          recipient: doctorUser._id,
          type: 'INVALID_ARBITRARY_TYPE',
          title: 'Fake Title',
          message: 'Fake Message',
        })
      ).rejects.toThrow();
    });

    it('batch creates multiple notifications via createNotifications', async () => {
      const notifications = await notificationService.createNotifications([
        {
          recipient: doctorUser._id,
          type: 'ASSIGNMENT_CREATED',
          title: 'Assignment 1',
          message: 'Assignment 1 message',
        },
        {
          recipient: patientUser._id,
          type: 'ASSIGNMENT_CREATED',
          title: 'Assignment 2',
          message: 'Assignment 2 message',
        },
      ]);

      expect(notifications.length).toBe(2);
      expect(notifications[0].recipient.toString()).toBe(doctorUser._id.toString());
      expect(notifications[1].recipient.toString()).toBe(patientUser._id.toString());
    });
  });

  describe('2. Notifications REST API & Recipient Isolation', () => {
    let docNotification;
    let patientNotification;

    beforeEach(async () => {
      await Notification.deleteMany({});

      docNotification = await Notification.create({
        recipient: doctorUser._id,
        type: 'ASSIGNMENT_CREATED',
        title: 'New Patient Assigned',
        message: 'Patient PAT-P10-001 has been assigned to your care.',
        status: 'UNREAD',
      });

      patientNotification = await Notification.create({
        recipient: patientUser._id,
        type: 'ACCESS_REQUEST_CREATED',
        title: 'Access Request Pending',
        message: 'Dr. Gregory House requested access to your records.',
        status: 'UNREAD',
      });
    });

    it('requires authentication for notification endpoints (401)', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });

    it('GET /api/notifications returns only caller notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notifications.length).toBe(1);
      expect(res.body.notifications[0]._id.toString()).toBe(docNotification._id.toString());
      // Doctor must NOT see patient's notification
      const hasPatientNotif = res.body.notifications.some(
        (n) => n._id.toString() === patientNotification._id.toString()
      );
      expect(hasPatientNotif).toBe(false);
    });

    it('GET /api/notifications/unread-count returns accurate unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBe(1);
    });

    it('GET /api/notifications/:id retrieves a single notification if caller is the owner', async () => {
      const res = await request(app)
        .get(`/api/notifications/${docNotification._id}`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notification._id.toString()).toBe(docNotification._id.toString());
    });

    it('GET /api/notifications/:id forbids access to another user notification (403)', async () => {
      const res = await request(app)
        .get(`/api/notifications/${docNotification._id}`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('PATCH /api/notifications/:id/read marks notification as read', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${docNotification._id}/read`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notification.status).toBe('READ');
      expect(res.body.notification.readAt).not.toBeNull();

      // Check unread count is now 0
      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(countRes.body.unreadCount).toBe(0);
    });

    it('PATCH /api/notifications/:id/read forbids marking another user notification (403)', async () => {
      const res = await request(app)
        .patch(`/api/notifications/${docNotification._id}/read`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(403);
    });

    it('PATCH /api/notifications/read-all marks all unread notifications for current user only', async () => {
      // Create a second unread notification for doctor
      await Notification.create({
        recipient: doctorUser._id,
        type: 'DOCTOR_AFFILIATION_APPROVED',
        title: 'Affiliation Live',
        message: 'Your hospital affiliation is active.',
        status: 'UNREAD',
      });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.modifiedCount).toBe(2);

      // Verify patient notification remains UNREAD
      const patientCheck = await Notification.findById(patientNotification._id);
      expect(patientCheck.status).toBe('UNREAD');
    });

    it('supports status filtering (UNREAD, READ, ALL) and pagination', async () => {
      await Notification.create({
        recipient: doctorUser._id,
        type: 'DOCTOR_AFFILIATION_SUSPENDED',
        title: 'Status change',
        message: 'Affiliation suspended',
        status: 'READ',
        readAt: new Date(),
      });

      const unreadRes = await request(app)
        .get('/api/notifications?status=UNREAD&limit=10&page=1')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(unreadRes.status).toBe(200);
      expect(unreadRes.body.notifications.length).toBe(1);
      expect(unreadRes.body.notifications[0].status).toBe('UNREAD');

      const readRes = await request(app)
        .get('/api/notifications?status=READ')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(readRes.status).toBe(200);
      expect(readRes.body.notifications.length).toBe(1);
      expect(readRes.body.notifications[0].status).toBe('READ');

      const allRes = await request(app)
        .get('/api/notifications?status=ALL')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(allRes.status).toBe(200);
      expect(allRes.body.notifications.length).toBe(2);
    });

    it('client POST /api/notifications returns 404 (no arbitrary creation endpoint)', async () => {
      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          recipient: patientUser._id,
          type: 'SECURITY_EVENT',
          title: 'Fake',
          message: 'Fake message',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('3. Strict Administrative Isolation', () => {
    let doctorNotif;

    beforeEach(async () => {
      await Notification.deleteMany({});
      doctorNotif = await Notification.create({
        recipient: doctorUser._id,
        type: 'ASSIGNMENT_CREATED',
        title: 'Doctor private notice',
        message: 'You have a new patient assignment.',
        status: 'UNREAD',
      });
    });

    it('Hospital Admin cannot view doctor notifications via /api/notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications.length).toBe(0);
    });

    it('Hospital Admin cannot retrieve doctor notification by ID (403)', async () => {
      const res = await request(app)
        .get(`/api/notifications/${doctorNotif._id}`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(403);
    });

    it('System Admin cannot retrieve doctor personal notification by ID (403)', async () => {
      const res = await request(app)
        .get(`/api/notifications/${doctorNotif._id}`)
        .set('Authorization', `Bearer ${sysAdminToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('4. Domain Event Integration & Automatic Notifications', () => {
    beforeEach(async () => {
      await Notification.deleteMany({});
    });

    it('Assignment creation publishes ASSIGNMENT_CREATED and notifies doctor and patient', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${hospAdminAToken}`)
        .send({
          doctorId: doctorProfile._id.toString(),
          patientId: patientProfile._id.toString(),
          hospitalId: hospitalA._id.toString(),
          notes: 'Routine primary care',
        });

      expect(res.status).toBe(201);

      // Verify notification created for doctor
      const docNotif = await Notification.findOne({
        recipient: doctorUser._id,
        type: 'ASSIGNMENT_CREATED',
      });
      expect(docNotif).toBeDefined();
      expect(docNotif.title).toContain('New Patient Assignment');
      expect(docNotif.message).toContain(patientProfile.patientId);

      // Verify notification created for patient
      const patientNotif = await Notification.findOne({
        recipient: patientUser._id,
        type: 'ASSIGNMENT_CREATED',
      });
      expect(patientNotif).toBeDefined();
      expect(patientNotif.title).toContain('Physician Assignment Confirmed');
      expect(patientNotif.message).toContain(doctorProfile.fullName);
    });

    it('Ending an assignment notifies both doctor and patient', async () => {
      const assignment = await DoctorPatientAssignment.findOne({
        doctor: doctorProfile._id,
        patient: patientProfile._id,
        hospital: hospitalA._id,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .patch(`/api/assignments/${assignment._id}/end`)
        .set('Authorization', `Bearer ${hospAdminAToken}`);

      expect(res.status).toBe(200);

      const docNotif = await Notification.findOne({
        recipient: doctorUser._id,
        type: 'ASSIGNMENT_ENDED',
      });
      expect(docNotif).toBeDefined();

      const patientNotif = await Notification.findOne({
        recipient: patientUser._id,
        type: 'ASSIGNMENT_ENDED',
      });
      expect(patientNotif).toBeDefined();
    });

    it('Doctor affiliation status updates trigger affiliation notifications', async () => {
      const testDocUser = await User.create({
        name: 'Dr. Test Affiliation',
        email: 'dr.testaff@test-p10-notify.local',
        passwordHash: 'dummyhash',
        role: 'DOCTOR',
        status: 'ACTIVE',
      });
      const testDocProfile = await Doctor.create({
        user: testDocUser._id,
        fullName: 'Dr. Test Affiliation',
        phone: '+1-555-0999',
        gender: 'MALE',
        dateOfBirth: new Date('1980-01-01'),
        medicalLicenseNumber: 'MD-P10-TEST99',
        specialization: 'Neurology',
        qualifications: ['MD'],
        yearsOfExperience: 8,
        status: 'ACTIVE',
      });

      const pendingAffiliation = await DoctorHospitalAffiliation.create({
        doctor: testDocProfile._id,
        hospital: hospitalB._id,
        status: 'PENDING',
        department: 'Cardiology',
      });

      // Admin B approves affiliation
      const approveRes = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${pendingAffiliation._id}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'ACTIVE' });

      expect(approveRes.status).toBe(200);

      const approvalNotif = await Notification.findOne({
        recipient: testDocUser._id,
        type: 'DOCTOR_AFFILIATION_APPROVED',
      });
      expect(approvalNotif).toBeDefined();
      expect(approvalNotif.title).toContain('Hospital Affiliation Approved');
      expect(approvalNotif.message).toContain(hospitalB.name);

      // Now suspend affiliation
      const suspendRes = await request(app)
        .patch(`/api/hospitals/${hospitalB._id}/doctors/${pendingAffiliation._id}/status`)
        .set('Authorization', `Bearer ${hospAdminBToken}`)
        .send({ status: 'SUSPENDED' });

      expect(suspendRes.status).toBe(200);

      const suspendNotif = await Notification.findOne({
        recipient: testDocUser._id,
        type: 'DOCTOR_AFFILIATION_SUSPENDED',
      });
      expect(suspendNotif).toBeDefined();
      expect(suspendNotif.title).toContain('Hospital Affiliation Suspended');
    });

    it('Cross-hospital access request lifecycle triggers patient and doctor notifications', async () => {
      // Re-establish active assignment at Hospital B
      await DoctorPatientAssignment.create({
        doctor: doctorProfile._id,
        patient: patientProfile._id,
        hospital: hospitalB._id,
        status: 'ACTIVE',
        assignedAt: new Date(),
        assignedBy: hospAdminB._id,
      });

      // Doctor creates cross-hospital access request to Hospital A
      const reqRes = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: patientProfile._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestedScopes: ['VISITS', 'DIAGNOSES'],
          purpose: 'TREATMENT',
          notes: 'Continuity of care request',
        });

      expect(reqRes.status).toBe(201);
      const accessRequestId = reqRes.body.data.accessRequest.id || reqRes.body.data.accessRequest._id;

      // Check notification sent to patient
      const reqCreatedNotif = await Notification.findOne({
        recipient: patientUser._id,
        type: 'ACCESS_REQUEST_CREATED',
      });
      expect(reqCreatedNotif).toBeDefined();
      expect(reqCreatedNotif.title).toContain('Cross-Hospital Access Request');

      // Patient approves request
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const approveRes = await request(app)
        .patch(`/api/access-requests/${accessRequestId}/approve`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          expiresAt: futureDate,
          scopes: ['VISITS', 'DIAGNOSES'],
        });

      expect(approveRes.status).toBe(200);

      // Check notification sent to doctor for approval
      const reqApprovedNotif = await Notification.findOne({
        recipient: doctorUser._id,
        type: 'ACCESS_REQUEST_APPROVED',
      });
      expect(reqApprovedNotif).toBeDefined();
      expect(reqApprovedNotif.title).toContain('Access Request Approved');

      // Check consent created notification also sent to doctor
      const consentCreatedNotif = await Notification.findOne({
        recipient: doctorUser._id,
        type: 'CONSENT_CREATED',
      });
      expect(consentCreatedNotif).toBeDefined();
      expect(consentCreatedNotif.title).toContain('Patient Consent Active');

      // Patient revokes consent
      const consentId = approveRes.body.data.consent.id || approveRes.body.data.consent._id;
      const revokeRes = await request(app)
        .patch(`/api/consents/${consentId}/revoke`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'No longer needed' });

      expect(revokeRes.status).toBe(200);

      const consentRevokedNotif = await Notification.findOne({
        recipient: doctorUser._id,
        type: 'CONSENT_REVOKED',
      });
      expect(consentRevokedNotif).toBeDefined();
      expect(consentRevokedNotif.title).toContain('Clinical Consent Revoked');
    });

    it('Access request denial notifies the requesting doctor', async () => {
      // Create another access request
      const reqRes = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: patientProfile._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestedScopes: ['LAB_RESULTS'],
          purpose: 'REFERRAL',
        });

      expect(reqRes.status).toBe(201);
      const accessRequestId = reqRes.body.data.accessRequest.id || reqRes.body.data.accessRequest._id;

      // Patient denies request
      const denyRes = await request(app)
        .patch(`/api/access-requests/${accessRequestId}/deny`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ reason: 'Unnecessary examination' });

      expect(denyRes.status).toBe(200);

      const deniedNotif = await Notification.findOne({
        recipient: doctorUser._id,
        type: 'ACCESS_REQUEST_DENIED',
      });
      expect(deniedNotif).toBeDefined();
      expect(deniedNotif.title).toContain('Access Request Denied');
    });

    it('Access request cancellation notifies the patient', async () => {
      // Create another access request
      const reqRes = await request(app)
        .post('/api/access-requests')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: patientProfile._id.toString(),
          requestingHospitalId: hospitalB._id.toString(),
          sourceHospitalId: hospitalA._id.toString(),
          requestedScopes: ['PRESCRIPTIONS'],
          purpose: 'RESEARCH',
        });

      expect(reqRes.status).toBe(201);
      const accessRequestId = reqRes.body.data.accessRequest.id || reqRes.body.data.accessRequest._id;

      // Doctor cancels request
      const cancelRes = await request(app)
        .patch(`/api/access-requests/${accessRequestId}/cancel`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ reason: 'Ordered in error' });

      expect(cancelRes.status).toBe(200);

      const cancelNotif = await Notification.findOne({
        recipient: patientUser._id,
        type: 'ACCESS_REQUEST_CANCELLED',
      });
      expect(cancelNotif).toBeDefined();
      expect(cancelNotif.title).toContain('Access Request Cancelled');
    });

    it('Hospital status updates trigger hospital notification for registered admin', async () => {
      // Create pending hospital
      const pendingHosp = await Hospital.create({
        name: 'Metro Care Clinic',
        hospitalCode: 'METRO-P10NOT',
        address: { street: '500 Care Ave', city: 'Metropolis', state: 'NY', zipCode: '10005' },
        contactEmail: 'admin@metrocare-p10.local',
        contactPhone: '+1-555-0155',
        status: 'PENDING',
        registeredBy: hospAdminA._id,
      });

      // System Admin approves hospital
      const res = await request(app)
        .patch(`/api/hospitals/${pendingHosp._id}/status`)
        .set('Authorization', `Bearer ${sysAdminToken}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);

      const hospNotif = await Notification.findOne({
        recipient: hospAdminA._id,
        type: 'HOSPITAL_APPROVED',
      });
      expect(hospNotif).toBeDefined();
      expect(hospNotif.title).toContain('Hospital Status Updated');
      expect(hospNotif.message).toContain('APPROVED');
    });

    it('Privacy protection: ensures notifications do NOT contain passwords, tokens, or raw clinical notes', async () => {
      const allNotifications = await Notification.find({});
      for (const notif of allNotifications) {
        expect(notif.message).not.toMatch(/password/i);
        expect(notif.message).not.toMatch(/token/i);
        expect(notif.message).not.toMatch(/bearer/i);
        expect(notif.title).not.toMatch(/password/i);
      }
    });
  });
});
