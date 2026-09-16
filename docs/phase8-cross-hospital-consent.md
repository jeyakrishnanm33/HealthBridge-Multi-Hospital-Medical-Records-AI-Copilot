# HealthBridge Phase 8 — Cross-Hospital Access, Access Requests & Patient Consent

## 1. Domain Overview

The **Cross-Hospital Access & Consent Domain** establishes the secure, patient-centric authorization protocol that enables doctors at one approved hospital to request and view medical records generated at another approved hospital.

In HealthBridge, patient data privacy is foundational:
- **Zero Cross-Hospital Access by Default**: A doctor has zero baseline access to records created at another healthcare facility.
- **Patient Sovereignty**: Only the patient (data subject) has the authority to approve access requests or grant consent.
- **Granular Scoping**: Consent is granted for specific clinical scopes (`VISITS`, `DIAGNOSES`, `MEDICATIONS`, `LAB_RESULTS`, `PRESCRIPTIONS`, `DOCUMENTS`) rather than blanket access.
- **Time-Bounded & Revocable**: Consents have an expiration date (`expiresAt`) and can be revoked at any time by the patient with immediate cutoff.
- **No Cron Jobs for Expiration**: Effective consent status (`ACTIVE`, `EXPIRED`, `REVOKED`) is evaluated dynamically on every access and query.
- **Administrative Clinical Restriction Preserved**: System Admins and Hospital Admins are strictly forbidden from clinical records access (`ADMIN_CLINICAL_ACCESS_RESTRICTED`).

```text
Doctor at Hospital B
        ↓
Wants to view Patient's records at Hospital A
        ↓
Has Active Non-Expired Non-Revoked Consent?
       ├── YES (and requested recordType in permitted scopes) ──→ 200 OK Record Returned
       └── NO
            ↓
    Creates AccessRequest (POST /api/access-requests)
            ↓
    Validated against 12 Invariant Preconditions
            ↓
    Status: PENDING
            ↓
    Patient reviews request (GET /api/access-requests)
            ↓
    ┌───────────────────────┴───────────────────────┐
    ↓                                               ↓
Patient Approves                               Patient Denies / Doctor Cancels
    ↓                                               ↓
Status: APPROVED                                Status: DENIED / CANCELLED
Consent Artifact Created                            ↓
(Granular scopes, expiresAt)                    Terminal State (No Consent Created)
    ↓
Doctor B accesses permitted
records at Hospital A
    ↓
Patient Revokes Consent (at any time)
    ↓
Status: REVOKED → Immediate Access Denied (403)
```

---

## 2. Access Request Creation: 12 Precondition Invariants

Before an `AccessRequest` can be created, the system executes a strict, ordered chain of 12 invariants in `backend/src/policies/accessRequestPolicy.js`:

| # | Invariant | Failure Code / HTTP |
| :--- | :--- | :--- |
| 1 | Authenticated caller must have `DOCTOR` role | `403 FORBIDDEN` |
| 2 | Requesting doctor profile must exist and have `status: 'ACTIVE'` | `403 DOCTOR_NOT_ACTIVE` |
| 3 | Requesting hospital must exist and have `status: 'APPROVED'` | `400 HOSPITAL_NOT_APPROVED` |
| 4 | Doctor must have an active affiliation (`DoctorHospitalAffiliation`, `status: 'ACTIVE'`) at the requesting hospital | `403 DOCTOR_NOT_AFFILIATED_WITH_REQUESTING_HOSPITAL` |
| 5 | Target patient profile must exist | `404 PATIENT_NOT_FOUND` |
| 6 | Doctor must have an active clinical assignment (`DoctorPatientAssignment`, `status: 'ACTIVE'`) with the patient at the requesting hospital | `403 ASSIGNMENT_NOT_ACTIVE` |
| 7 | Source hospital must exist and have `status: 'APPROVED'` | `400 SOURCE_HOSPITAL_NOT_APPROVED` |
| 8 | Source hospital must differ from requesting hospital (`sourceHospitalId !== requestingHospitalId`) | `400 SAME_HOSPITAL_CROSS_ACCESS_INVALID` |
| 9 | Patient must have an active or approved membership (`PatientHospitalMembership`) at the source hospital | `400 PATIENT_NOT_MEMBER_OF_SOURCE_HOSPITAL` |
| 10| Requested scopes must be non-empty and contain only valid scope enums | `400 INVALID_REQUESTED_SCOPES` |
| 11| Clinical purpose must be a recognized purpose enum (`TREATMENT`, `EMERGENCY`, `REFERRAL`, `RESEARCH`) | `400 INVALID_PURPOSE` |
| 12| No duplicate `PENDING` access request may exist for the same doctor, patient, requesting hospital, source hospital, and identical scopes | `409 DUPLICATE_PENDING_REQUEST` |

---

## 3. Duplicate Pending Prevention & Compound Indexing

To prevent spamming and race conditions, duplicate pending requests are rejected at both the policy level and database index level:
- Scopes are normalized using `normalizeScopesKey(requestedScopes)` (sorted unique comma-separated string, e.g., `'LAB_RESULTS,MEDICATIONS'`).
- A partial compound unique index is enforced in MongoDB:
  ```javascript
  accessRequestSchema.index(
    {
      requestingDoctor: 1,
      patient: 1,
      requestingHospital: 1,
      sourceHospital: 1,
      normalizedScopesKey: 1,
    },
    {
      unique: true,
      partialFilterExpression: { status: 'PENDING' },
      name: 'unique_pending_access_request_idx',
    }
  );
  ```
- If a request is `DENIED`, `APPROVED`, or `CANCELLED`, a new pending request with the same parameters can be submitted.
- Multiple pending requests between the same parties are allowed **only** if the requested scope sets differ.

---

## 4. State Machine & Transitions

### 4.1 Access Request Lifecycle
- Initial state: `PENDING`
- Allowed transitions:
  - `PENDING → APPROVED` (Executed exclusively by the patient owner)
  - `PENDING → DENIED` (Executed exclusively by the patient owner; records optional `decisionReason`)
  - `PENDING → CANCELLED` (Executed exclusively by the requesting doctor; records optional `decisionReason`)
- Terminal states: `APPROVED`, `DENIED`, `CANCELLED` cannot transition to any other state (`400 INVALID_STATUS_TRANSITION`).

### 4.2 Consent Lifecycle & Dynamic Status
When a patient approves an access request:
1. The request status updates to `APPROVED` with `approvedAt` timestamp.
2. A corresponding `Consent` document is created referencing the `accessRequestId`, patient, doctor, source hospital, requesting hospital, scopes, and `expiresAt` (default 30 days, or custom between 1 and 365 days).
3. Consent effective status is calculated dynamically on query and access without requiring cron jobs:
   - If `revokedAt != null` → `REVOKED`
   - Else if `new Date() >= expiresAt` → `EXPIRED`
   - Else → `ACTIVE`
4. Patients can revoke an active consent at any time (`POST /api/consents/:id/revoke`), immediately preventing subsequent cross-hospital access. Attempting to revoke an already revoked or expired consent returns `400 Bad Request`.

---

## 5. Granular Clinical Scope Enforcement

HealthBridge clinical scopes map directly to Mongoose medical record discriminators:

| Consent Scope | Medical Record Discriminator |
| :--- | :--- |
| `VISITS` | `VisitRecord` (`recordType: 'VISIT'`) |
| `DIAGNOSES` | `DiagnosisRecord` (`recordType: 'DIAGNOSIS'`) |
| `MEDICATIONS` | `MedicationRecord` (`recordType: 'MEDICATION'`) |
| `LAB_RESULTS` | `LabResultRecord` (`recordType: 'LAB_RESULT'`) |
| `PRESCRIPTIONS` | `PrescriptionRecord` (`recordType: 'PRESCRIPTION'`) |
| `DOCUMENTS` | `DocumentRecord` (`recordType: 'DOCUMENT'`) |

When Doctor B queries records for Patient 1:
- Same-hospital records at Hospital B (where Doctor B has an active assignment) are accessible directly without consent.
- Cross-hospital records originating at Hospital A are filtered through Doctor B's active consents for Patient 1. Only records whose `recordType` matches granted scopes on an active, non-expired, non-revoked consent are returned or accessible.

---

## 6. API Specification

### 6.1 Access Requests (`/api/access-requests`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/access-requests` | `DOCTOR` | Initiates cross-hospital access request after 12-invariant check |
| `GET` | `/api/access-requests` | Patient / Doctor / Admin | Lists access requests filtered by role isolation and status |
| `GET` | `/api/access-requests/:id` | Patient / Doctor / Admin | Retrieves single access request details |
| `POST` | `/api/access-requests/:id/approve` | `PATIENT` (Owner) | Approves pending request, creates active `Consent` artifact |
| `POST` | `/api/access-requests/:id/deny` | `PATIENT` (Owner) | Denies pending request with optional reason |
| `POST` | `/api/access-requests/:id/cancel` | `DOCTOR` (Requester) | Cancels pending request with optional reason |

### 6.2 Consents (`/api/consents`)

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/consents` | Patient / Doctor / Admin | Lists consents with dynamic status filtering (`ACTIVE`, `EXPIRED`, `REVOKED`) |
| `GET` | `/api/consents/:id` | Patient / Doctor / Admin | Retrieves single consent with full metadata |
| `POST` | `/api/consents/:id/revoke` | `PATIENT` (Owner) | Revokes active consent with immediate effect and reason |

---

## 7. Frontend User Interfaces

1. **Patient Dashboard**:
   - **Consent Management Tab**: Displays incoming access requests with badges, scope pills, and one-click **Approve** or **Deny** modals.
   - **Active Consents View**: Lists active permissions with time remaining countdowns and an immediate **Revoke Consent** dialog.
2. **Doctor Clinical Portal**:
   - **Request Cross-Hospital Access Modal**: Allows selecting assigned patient, source facility, clinical scopes, purpose, and custom expiration.
   - **Access Request Tracker**: Tracks pending, approved, and denied requests with cancel capabilities.
   - **Cross-Hospital Records View**: Displays medical records retrieved under active consent with prominent consent badges indicating permitted scope and expiration.
3. **Hospital Admin Governance**:
   - Institutional oversight of inbound and outbound access requests and consents involving their healthcare facility.

---

## 8. Verification & Test Suite

Validated with **49 new automated tests** across 2 suites:
- `backend/tests/accessRequest.test.js` (29 tests):
  - 12 invariant precondition tests (unauthenticated, non-doctor, inactive doctor, unapproved hospitals, unassigned doctor, same hospital check, missing membership, duplicate pending conflict, scope validation).
  - Lifecycle state machine tests (Approve, Deny, Cancel, terminal transition rejections).
  - Duplicate pending request prevention with normalized scope key hashing.
  - Role-based listing isolation.
- `backend/tests/consent.test.js` (20 tests):
  - Consent retrieval and role-scoped filtering.
  - Dynamic status computation without cron (`ACTIVE`, `EXPIRED`, `REVOKED`).
  - Patient revocation and error handling on already revoked/expired consents.
  - Granular cross-hospital medical record authorization (access granted for permitted scopes, access denied for unpermitted scopes).
  - Immediate cutoff upon revocation.
  - Administrative isolation (`ADMIN_CLINICAL_ACCESS_RESTRICTED`).

### Complete Test Results
- Total test suites: **9 passed, 9 total**
- Total tests: **240 passed, 0 failed**
- Frontend build: **0 errors** (`vite build` production bundle passing)
