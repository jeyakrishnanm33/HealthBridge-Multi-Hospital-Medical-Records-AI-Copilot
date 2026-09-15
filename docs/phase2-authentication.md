# HealthBridge — Phase 2: Authentication & Users Documentation

## 1. Overview

Phase 2 establishes the core identity and authentication layer for **HealthBridge**. The Express REST API acts as the authoritative security boundary, issuing and verifying HMAC-SHA256 JSON Web Tokens (JWT) for authenticated requests. The React frontend consumes these APIs to provide registration, login, and session restoration without acting as a security gatekeeper.

---

## 2. Authentication Architecture

```text
Client (React / Vite)
      │
      ├── POST /api/auth/register (Name, Email, Password, Role)
      ├── POST /api/auth/login    (Email, Password)
      │      │
      │      ▼
      │  Express API Gateway
      │    ├── Email Normalization (lowercase, trimmed)
      │    ├── Validation Middleware (Zod schema checking)
      │    ├── Password Hashing (bcrypt, 10 salt rounds)
      │    ├── JWT Issuance (payload: sub: userId, role: userRole)
      │    └── Safe User Serialization (passwordHash stripped)
      │
      ├── GET /api/auth/me (Bearer <token>)
      │      │
      │      ▼
      │  authenticate Middleware
      │    ├── Extract Bearer token from Authorization header
      │    ├── Verify JWT signature & expiration (jsonwebtoken)
      │    ├── Resolve active user from MongoDB (users collection)
      │    └── Attach safe user identity to req.user
      │
      └── POST /api/auth/logout
             └── Stateless acknowledgement (client clears local token)
```

---

## 3. User Data Model

Collection: `users`

```javascript
{
  id: "6aa8e6c5ea94c0409670b0fa",
  name: "Dr. Arun Kumar",
  email: "arun@example.com",           // Unique, normalized to lowercase
  passwordHash: "$2b$10$...",          // Excluded from queries by default (select: false)
  role: "DOCTOR",                      // SYSTEM_ADMIN | HOSPITAL_ADMIN | DOCTOR | PATIENT
  status: "ACTIVE",                    // ACTIVE | INACTIVE
  createdAt: "2026-09-15T06:33:41.160Z",
  updatedAt: "2026-09-15T06:33:41.160Z"
}
```

### Platform Roles
1. `SYSTEM_ADMIN`: Platform-wide governance (approves/suspends hospitals).
2. `HOSPITAL_ADMIN`: Hospital operations and doctor onboarding (no clinical data access).
3. `DOCTOR`: Clinical record creation, authorized cross-hospital access requests, AI copilot interaction.
4. `PATIENT`: Consent controller, record viewer, access history auditor.

### Self-Registration Security Policy
To prevent administrative privilege escalation, public self-registration via `POST /api/auth/register` permits creation of `PATIENT` (default) and `DOCTOR` (for demo purposes). Requests specifying `SYSTEM_ADMIN` or `HOSPITAL_ADMIN` are rejected with a `400 Validation Error`. Administrative roles require system administration provisioning.

---

## 4. API Endpoints

### 1. `POST /api/auth/register`
Creates a new user account and returns a signed JWT.

**Request Body:**
```json
{
  "name": "Arun Kumar",
  "email": "arun@example.com",
  "password": "SecurePassword123!",
  "role": "PATIENT"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6aa8e6c5ea94c0409670b0fa",
      "name": "Arun Kumar",
      "email": "arun@example.com",
      "role": "PATIENT",
      "status": "ACTIVE",
      "createdAt": "2026-09-15T06:33:41.160Z",
      "updatedAt": "2026-09-15T06:33:41.160Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. `POST /api/auth/login`
Authenticates user credentials and returns a signed JWT.

**Request Body:**
```json
{
  "email": "arun@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6aa8e6c5ea94c0409670b0fa",
      "name": "Arun Kumar",
      "email": "arun@example.com",
      "role": "PATIENT",
      "status": "ACTIVE",
      "createdAt": "2026-09-15T06:33:41.160Z",
      "updatedAt": "2026-09-15T06:33:41.160Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. `GET /api/auth/me`
Retrieves the profile of the currently authenticated user. Requires `Authorization: Bearer <token>`.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "6aa8e6c5ea94c0409670b0fa",
      "name": "Arun Kumar",
      "email": "arun@example.com",
      "role": "PATIENT",
      "status": "ACTIVE",
      "createdAt": "2026-09-15T06:33:41.160Z",
      "updatedAt": "2026-09-15T06:33:41.160Z"
    }
  }
}
```

### 4. `POST /api/auth/logout`
Stateless token logout endpoint instructing client to clear stored credentials.

---

## 5. Security & Error Handling

- **Password Hashing**: Uses `bcrypt` with 10 salt rounds. Plaintext passwords are never persisted.
- **Leakage Prevention**: Mongoose schema uses `select: false` on `passwordHash`. `toSafeUser()` serialization strips sensitive properties before any JSON response is generated.
- **Account Enumeration Protection**: Authentication failures for unknown emails or invalid passwords return identical `401 Unauthorized` (`INVALID_CREDENTIALS`) responses.
- **Token Verification**: Tokens are verified against `JWT_SECRET` with configurable expiration (`JWT_EXPIRES_IN=1h`). Expired tokens return `401 Unauthorized` (`TOKEN_EXPIRED`).

---

## 6. Testing

Run the automated test suite:
```bash
cd backend
npm test
```

Suite covers:
- User registration, duplicate email rejection (409), email normalization, and admin escalation prevention.
- Valid/invalid login, unknown user handling, and inactive account gating.
- Missing, malformed, invalid, and expired JWT verification.
- Safe profile retrieval via `/api/auth/me`.
