const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/database');
const { User } = require('../src/models/User');
const { generateToken } = require('../src/utils/jwt');

describe('HealthBridge Authentication & Users Tests (Phase 2)', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    // Clean up test data and disconnect
    await User.deleteMany({ email: /@test-healthbridge\.local$/ });
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({ email: /@test-healthbridge\.local$/ });
  });

  describe('POST /api/auth/register', () => {
    const validPatient = {
      name: 'Test Patient',
      email: 'patient@test-healthbridge.local',
      password: 'StrongPassword123!',
      role: 'PATIENT',
    };

    it('should register a new user and return 201 with safe user and JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validPatient);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');

      const { user, token } = res.body.data;
      expect(user).toMatchObject({
        name: validPatient.name,
        email: validPatient.email,
        role: 'PATIENT',
        status: 'ACTIVE',
      });
      expect(user).toHaveProperty('id');
      expect(typeof token).toBe('string');

      // Security check: password and passwordHash must never be exposed
      expect(user).not.toHaveProperty('password');
      expect(user).not.toHaveProperty('passwordHash');
      expect(res.text).not.toContain('passwordHash');
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      await request(app).post('/api/auth/register').send(validPatient);

      // Attempt duplicate with same email
      const res = await request(app).post('/api/auth/register').send(validPatient);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should normalize email to lowercase and prevent case-variant duplicate registration', async () => {
      await request(app).post('/api/auth/register').send(validPatient);

      // Attempt duplicate with uppercase email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validPatient,
          email: 'PATIENT@test-healthbridge.local',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject registration when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '',
          email: 'invalid-email',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject weak password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validPatient,
          email: 'weakpass@test-healthbridge.local',
          password: '12345',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should forbid self-registration for administrative roles (SYSTEM_ADMIN, HOSPITAL_ADMIN)', async () => {
      const adminAttempt = {
        name: 'Malicious Admin Attempt',
        email: 'fakeadmin@test-healthbridge.local',
        password: 'AdminPassword123!',
        role: 'SYSTEM_ADMIN',
      };

      const res = await request(app).post('/api/auth/register').send(adminAttempt);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    const userCredentials = {
      name: 'Doctor Demo',
      email: 'doctor@test-healthbridge.local',
      password: 'DoctorPassword123!',
      role: 'DOCTOR',
    };

    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(userCredentials);
    });

    it('should authenticate valid credentials and return 200 with JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(userCredentials.email);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject incorrect password with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user with 401 Unauthorized without leaking account existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unknown@test-healthbridge.local',
          password: 'SomePassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for inactive accounts with 401 Unauthorized', async () => {
      // Set user to INACTIVE in database
      await User.updateOne(
        { email: userCredentials.email },
        { status: 'INACTIVE' }
      );

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: userCredentials.email,
          password: userCredentials.password,
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('GET /api/auth/me (Protected Route)', () => {
    let authToken;
    let registeredUser;

    beforeEach(async () => {
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Me Profile User',
          email: 'meprofile@test-healthbridge.local',
          password: 'ProfilePassword123!',
          role: 'PATIENT',
        });

      authToken = regRes.body.data.token;
      registeredUser = regRes.body.data.user;
    });

    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MISSING');
    });

    it('should return 401 Unauthorized when Authorization format is malformed', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Basic 123456');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_MALFORMED');
    });

    it('should return 401 Unauthorized when token is invalid or corrupted', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 Unauthorized when token is expired', async () => {
      // Generate an expired token (expiresIn: -1s)
      const expiredToken = generateToken(
        { sub: registeredUser.id, role: registeredUser.role },
        '-1s'
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('TOKEN_EXPIRED');
    });

    it('should return 200 and authenticated safe user profile when token is valid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        id: registeredUser.id,
        name: registeredUser.name,
        email: registeredUser.email,
        role: registeredUser.role,
        status: 'ACTIVE',
      });
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 confirming client logout', async () => {
      const res = await request(app).post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('message');
    });
  });
});
