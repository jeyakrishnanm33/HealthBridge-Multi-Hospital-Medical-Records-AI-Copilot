# HealthBridge Phase 9 — Audit Logging & Security Audit Trail

## 1. Domain Overview

The **Audit Logging & Security Audit Trail Domain** establishes a centralized, tamper-resistant record of security-sensitive, authorization-sensitive, clinical, and state-changing actions across HealthBridge.

In HealthBridge, audit logging answers 10 fundamental questions for any event:
1. **Who** performed the action? (`actor`, `actorRole`)
2. **What** action occurred? (`action`, controlled action enum)
3. **When** did it occur? (`createdAt`, immutable timestamp)
4. **What resource** was affected? (`resourceType`, `resourceId`)
5. **Which patient** was involved, if applicable? (`patient` reference)
6. **Which hospital / tenant** was involved? (`hospital` reference)
7. **Was the operation successful or denied?** (`result`: `SUCCESS`, `DENIED`, `FAILURE`)
8. **Why was it denied or rejected?** (`reasonCode`, e.g., `ADMIN_CLINICAL_ACCESS_RESTRICTED`, `CONSENT_SCOPE_NOT_AUTHORIZED`)
9. **What security context is relevant?** (`metadata`, strictly sanitized)
10. **Can the event be traced to the originating HTTP request?** (`requestId`, `ipAddress`, `userAgent`)

```text
HTTP Request
     ↓
[requestContextMiddleware] ──→ Validates or generates x-request-id UUID
     ↓                         Enters AsyncLocalStorage context
[authenticateMiddleware]  ──→ Attaches req.user & enriches actor in context
     ↓
[Domain Service / Policy] ──→ Evaluates business logic / authorization
     ├── Action Succeeded ────→ auditService.recordSuccess(...)
     ├── Access Denied    ────→ auditService.recordDenied(...)
     └── Action Failed    ────→ auditService.recordFailure(...)
            ↓
      [sanitizeMetadata]  ──→ Strips passwords, tokens, auth headers, clinical notes
            ↓
     [AuditLog Model]     ──→ Persists to 'audit_logs' collection
                              Pre-save hook blocks document mutations
```

---

## 2. Audit Event Schema & Model

Located at `backend/src/models/AuditLog.js` in collection `audit_logs`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `actor` | `ObjectId -> User` | Actor who executed the action (null for unauthenticated / system events) |
| `actorRole` | `Enum` | Role at event time: `SYSTEM_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `PATIENT`, `SYSTEM`, `ANONYMOUS` |
| `action` | `String (Enum)` | Controlled operation identifier |
| `resourceType` | `Enum` | `USER`, `PATIENT`, `DOCTOR`, `HOSPITAL`, `ASSIGNMENT`, `MEDICAL_RECORD`, `ACCESS_REQUEST`, `CONSENT`, `AUTHENTICATION`, `SYSTEM` |
| `resourceId` | `String` | Identifier of the affected resource |
| `patient` | `ObjectId -> Patient` | Associated patient (optional) |
| `hospital` | `ObjectId -> Hospital`| Associated hospital / facility (optional) |
| `result` | `Enum` | `SUCCESS`, `DENIED`, `FAILURE` |
| `reasonCode` | `String` | Machine-readable error or restriction code |
| `metadata` | `Mixed` | Structured, non-sensitive contextual metadata |
| `requestId` | `String` | Request correlation ID (`x-request-id`) |
| `ipAddress` | `String` | Client IP address |
| `userAgent` | `String` | Client User-Agent header (truncated to 250 chars) |
| `createdAt` | `Date` | Timestamp of event occurrence |

### Index Strategy
To ensure sub-millisecond query performance for institutional and platform audits:
- `{ actor: 1, createdAt: -1 }`
- `{ patient: 1, createdAt: -1 }`
- `{ hospital: 1, createdAt: -1 }`
- `{ resourceType: 1, resourceId: 1, createdAt: -1 }`
- `{ action: 1, createdAt: -1 }`
- `{ result: 1, createdAt: -1 }`
- `{ requestId: 1 }`
- `{ createdAt: -1 }`

---

## 3. Controlled Action Vocabulary

Actions are strictly controlled enums rather than arbitrary strings:

### Authentication
- `LOGIN_SUCCESS`: Authenticated successfully with password/credentials.
- `LOGIN_FAILURE`: Invalid credentials, unknown user, or inactive account.
- `LOGOUT`: Client explicitly terminated session.

### User / Identity
- `USER_CREATED`: New platform account registered.
- `USER_ROLE_CHANGED`: User role elevated or modified.

### Hospital
- `HOSPITAL_CREATED`: New hospital facility registered in `PENDING` status.
- `HOSPITAL_STATUS_CHANGED`: Lifecycle state machine transition (`PENDING → APPROVED | REJECTED`, `APPROVED → SUSPENDED`).

### Doctor
- `DOCTOR_PROFILE_CREATED`: Doctor profile submitted with medical license.
- `DOCTOR_PROFILE_UPDATED`: Profile qualifications or contact details modified.
- `DOCTOR_AFFILIATION_REQUESTED`: Affiliation requested with an approved hospital.
- `DOCTOR_AFFILIATION_APPROVED`: Hospital Admin accepted affiliation (activates doctor profile).
- `DOCTOR_AFFILIATION_REJECTED`: Hospital Admin rejected affiliation.
- `DOCTOR_AFFILIATION_SUSPENDED`: Hospital Admin suspended affiliation.

### Doctor–Patient Assignment
- `ASSIGNMENT_CREATED`: Active care relationship established at a hospital.
- `ASSIGNMENT_ENDED`: Care relationship transitioned `ACTIVE → ENDED`.

### Medical Records
- `MEDICAL_RECORD_CREATED`: Doctor created a clinical encounter / record.
- `MEDICAL_RECORD_VIEWED`: Record viewed by attending doctor or patient.
- `MEDICAL_RECORD_UPDATED`: Permitted clinical content updated on a record.
- `MEDICAL_RECORD_ACCESS_DENIED`: Unauthorized doctor or cross-hospital access denied.

### Cross-Hospital Access & Consent
- `ACCESS_REQUEST_CREATED`: Doctor requested cross-hospital records.
- `ACCESS_REQUEST_APPROVED`: Patient approved access request.
- `ACCESS_REQUEST_DENIED`: Patient denied access request.
- `ACCESS_REQUEST_CANCELLED`: Requesting doctor cancelled access request.
- `CONSENT_CREATED`: Active consent artifact created following approval.
- `CONSENT_REVOKED`: Patient revoked active consent with immediate cutoff.
- `CONSENT_ACCESS_DENIED`: Doctor denied record access due to missing, expired, or out-of-scope consent.

### Security Denials
- `UNAUTHORIZED_ACCESS_ATTEMPT`: Call failed role verification gate (`requireRoles`).
- `TENANT_ACCESS_DENIED`: Hospital administrator attempted cross-hospital tampering.
- `ADMIN_CLINICAL_ACCESS_DENIED`: Administrator attempted direct clinical record retrieval.

---

## 4. Request Correlation & Context Middleware

Located at `backend/src/middleware/requestContext.js` and `backend/src/utils/requestContext.js`:
- Uses Node.js native `AsyncLocalStorage` (`node:async_hooks`) to maintain request context across async function boundaries.
- Inspects incoming `x-request-id` header:
  - If valid alphanumeric/hyphen string (`/^[a-zA-Z0-9_-]{1,100}$/`), preserves it.
  - If missing or invalid, generates a secure random UUID (`crypto.randomUUID()`).
- Injects correlation ID into the response header: `x-request-id: <uuid>`.
- Ambient context (`requestId`, `ipAddress`, `userAgent`, `actor`) is accessible anywhere in the service layer via `getContext()`.

---

## 5. Metadata Sanitization

Located in `backend/src/services/auditService.js`:
Metadata is deep-sanitized before persistence. Any key matching sensitive patterns is replaced with `'[REDACTED]'`:
- Passwords (`password`, `passwordHash`)
- Tokens (`token`, `refreshToken`, `jwt`)
- Headers (`authorization`)
- Secrets & Credentials (`secret`, `credentials`, `apiKey`)
- Raw Clinical Content (`symptoms`, `diagnosis`, `notes`, `vitalSigns`, `storageReference`)

---

## 6. Audit Immutability & Failure Semantics

### Immutability
- **No Update / Delete Endpoints**: There are NO `POST`, `PUT`, `PATCH`, or `DELETE` endpoints for `/api/audit-logs`.
- **Pre-Save Mongoose Hook**: Direct document updates (`log.save()` on non-new docs) throw an error blocking mutations.
- **Dedicated Collection**: Stored in `audit_logs` with `{ createdAt: true, updatedAt: false }`.

### Failure Semantics
1. **Critical Security Events** (`isCritical: true`, e.g., login success/failure, consent creation/revocation, record creation/modification):
   - Persistence is awaited.
   - If audit write fails, it is logged as critical via `logger.error`.
2. **Informational Events** (e.g. routine list views):
   - Persistence failures are captured and logged to avoid operational disruptions for routine lookups.

---

## 7. Tenant Isolation & Role Policies

Located at `backend/src/policies/auditPolicy.js`:

| Role | Access Level | Restrictions |
| :--- | :--- | :--- |
| `SYSTEM_ADMIN` | Platform-Wide | Can view all audit events across all hospitals and platform services |
| `HOSPITAL_ADMIN`| Tenant-Scoped | Strictly restricted to events where `hospital` matches their authorized facility |
| `DOCTOR` | None | `403 Forbidden` (`FORBIDDEN`) |
| `PATIENT` | None | `403 Forbidden` (`FORBIDDEN`) |

### Anti-Tampering Guarantee
For `HOSPITAL_ADMIN`, queries are automatically forced to `filter.hospital = { $in: adminHospitalIds }`. Even if an administrator specifies `?hospitalId=<otherHospitalId>` in the URL, the backend ignores it and applies the tenant scope. Attempting to fetch another hospital's event by ID (`GET /api/audit-logs/:id`) returns `403 HOSPITAL_ACCESS_FORBIDDEN`.

---

## 8. API Specification

Read-only endpoints mounted at `/api/audit-logs`:

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/audit-logs` | `SYSTEM_ADMIN`, `HOSPITAL_ADMIN` | List audit logs with tenant isolation, filters, and pagination |
| `GET` | `/api/audit-logs/:id` | `SYSTEM_ADMIN`, `HOSPITAL_ADMIN` | Get single audit event with tenant access verification |

### Query Parameters
- `page`: Page number (default `1`)
- `limit`: Items per page (default `20`, max `100`)
- `action`: Filter by controlled action enum
- `resourceType`: Filter by resource type enum
- `result`: Filter by result (`SUCCESS`, `DENIED`, `FAILURE`)
- `hospitalId`: Facility filter (`SYSTEM_ADMIN` only)
- `patientId`: Patient ObjectId filter
- `actorId`: Actor user ObjectId filter
- `requestId`: Correlation ID filter
- `startDate`: ISO datetime or YYYY-MM-DD
- `endDate`: ISO datetime or YYYY-MM-DD

---

## 9. Frontend Audit Explorer

Located at `frontend/src/components/AuditLogList.jsx`:
- Filterable timeline and table view:
  - Result status badges (green `SUCCESS`, amber `DENIED`, red `FAILURE`)
  - Action categories and resource type badges
  - Actor name, role, and facility attribution
  - Client network context (IP address and truncated user-agent)
  - Correlation request ID with quick search
- Event Inspection Modal:
  - Deep inspection of event details, timestamps, reason codes, and formatted sanitized JSON metadata.
- Integrated into `frontend/src/App.jsx` under the **Audit Trail** tab for `SYSTEM_ADMIN` and `HOSPITAL_ADMIN`.

---

## 10. Testing & Verification

Comprehensive test suite in `backend/tests/audit.test.js` (27 test cases):
1. **Audit Service & Model Integrity (1–4)**: Creation of success/denied/failure events, metadata sanitization, immutability pre-save hook.
2. **Role-Based Retrieval & Tenant Isolation (5–12)**: System Admin platform access, Hospital Admin tenant scope, parameter anti-tampering, cross-tenant ID access blocking (403), Doctor/Patient rejection (403), unauthenticated rejection (401).
3. **Filtering & Pagination (13–18)**: Action filter, resourceType filter, result filter, invalid filter rejection (400), pagination math, ObjectId format validation.
4. **Security Invariants (19–21)**: Verifying POST, PATCH, and DELETE return 404.
5. **Request Correlation (22–23)**: Preserving client `x-request-id` and server UUID generation.
6. **Domain Integration (24–27)**: Real end-to-end events for login success/failure, medical record creation, and admin clinical access restrictions.

### Suite Verification
- `audit.test.js`: **27 passed, 0 failed**
- Complete Backend Suite: **267 passed, 0 failed across all 10 test suites**
- Frontend Production Build: **PASS (0 errors, 0 warnings)**
