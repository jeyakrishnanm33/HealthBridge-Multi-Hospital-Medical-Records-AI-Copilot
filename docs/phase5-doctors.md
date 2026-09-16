# HealthBridge — Phase 5: Doctor Domain & Clinical Roles Documentation

## 1. Doctor Architecture

Phase 5 establishes the clinical identity layer, professional credentials, multi-hospital doctor affiliations, hospital administrator review workflows, and clinical authorization policies within HealthBridge. 

A `Doctor` document represents a strict 1:1 clinical identity extension of an authenticated `User` account with role `DOCTOR`.

```text
User (role: 'DOCTOR')
  │
  └── Doctor (Profile & Credentials)
        │
        ├── Hospital A (Affiliation: ACTIVE)
        └── Hospital B (Affiliation: PENDING)
```

The backend acts as the authoritative security boundary:
- Doctor identity is strictly derived from `req.user.id` (client cannot assign doctor profiles to another user).
- Medical license numbers are validated, formatted to uppercase, and uniquely indexed at the database level.
- Multi-hospital affiliations are modeled via a dedicated `DoctorHospitalAffiliation` collection with compound uniqueness (`{ doctor: 1, hospital: 1 }`).
- Hospital administrators can view and manage affiliations exclusively for facilities they control (tenant isolation).
- An authoritative server-side state machine governs the affiliation lifecycle (`PENDING → ACTIVE`, `PENDING → REJECTED`, `ACTIVE → SUSPENDED`).
- Doctors can only operate as active clinical users if their affiliation is `ACTIVE` and the hospital facility is `APPROVED`.

---

## 2. Doctor Model

- **Collection**: `doctors`
- **File**: `backend/src/models/Doctor.js`

```javascript
{
  id: "6790a...11",
  user: "67908...02",                  // ObjectId, ref: 'User', unique: true, required
  fullName: "Dr. Gregory House",       // String, required, trimmed
  phone: "+919876543221",              // String, required, trimmed
  gender: "MALE",                      // Enum: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'
  dateOfBirth: "1975-05-15T00:00:00.000Z", // Date, required
  medicalLicenseNumber: "MCI-77382",   // String, unique: true, uppercase, required
  specialization: "Diagnostic Medicine", // String, required, trimmed
  qualifications: ["MBBS", "MD", "PhD"], // [String], at least 1 qualification required
  yearsOfExperience: 20,               // Number, min: 0, default: 0
  status: "ACTIVE",                    // Enum: 'PENDING' | 'ACTIVE' | 'SUSPENDED', default: 'PENDING'
  createdAt: "2026-09-16T08:00:00.000Z",
  updatedAt: "2026-09-16T08:00:00.000Z"
}
```

### Constraints & Invariants
- Exactly one Doctor profile may exist per User (`user` unique index: `user_1`).
- Medical license numbers are unique platform-wide (`medicalLicenseNumber_1`).
- Client attempts to mutate `user`, `status`, or `medicalLicenseNumber` are rejected via strict schema validation.
- User password hashes and internal secrets are never exposed in responses.

---

## 3. Doctor-Hospital Affiliation Model

- **Collection**: `doctorHospitalAffiliations`
- **File**: `backend/src/models/DoctorHospitalAffiliation.js`

```javascript
{
  id: "6790b...22",
  doctor: "6790a...11",               // ObjectId, ref: 'Doctor', required
  hospital: "67907...01",             // ObjectId, ref: 'Hospital', required
  department: "Diagnostics",          // String, optional, trimmed
  status: "ACTIVE",                   // Enum: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED'
  requestedAt: "2026-09-16T08:05:00.000Z", // Date, default: Date.now
  approvedAt: "2026-09-16T08:10:00.000Z",  // Date, default: null
  approvedBy: "67908...03",           // ObjectId, ref: 'User', default: null
  createdAt: "2026-09-16T08:05:00.000Z",
  updatedAt: "2026-09-16T08:10:00.000Z"
}
```

### Compound Uniqueness
A compound unique index on `{ doctor: 1, hospital: 1 }` guarantees that duplicate affiliations cannot exist. Duplicate requests return `409 Conflict` with `DOCTOR_AFFILIATION_EXISTS`.

---

## 4. Affiliation Lifecycle & State Machine

The lifecycle of a doctor affiliation is strictly authoritative and enforced server-side.

```text
                  ┌──────────────┐
                  │   PENDING    │
                  └──────┬───────┘
                         │
            ┌────────────┴────────────┐
            │                         │
            ▼                         ▼
     ┌──────────────┐          ┌──────────────┐
     │    ACTIVE    │          │   REJECTED   │
     └──────┬───────┘          └──────────────┘
            │                     (Terminal)
            ▼
     ┌──────────────┐
     │  SUSPENDED   │
     └──────────────┘
        (Terminal)
```

### Transition Table

| Current Status | Target Status | Permitted? | Side Effects |
|---|---|---|---|
| `PENDING` | `ACTIVE` | ✅ | Sets `approvedAt = now`, `approvedBy = adminId`. Automatically transitions `doctor.status` to `ACTIVE`. |
| `PENDING` | `REJECTED` | ✅ | Sets `approvedAt = now`, `approvedBy = adminId`. |
| `ACTIVE` | `SUSPENDED` | ✅ | Preserves historical `approvedAt` and `approvedBy`. |
| `REJECTED` | Any | ❌ | `400 Bad Request` (`INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION`) |
| `SUSPENDED` | Any | ❌ | `400 Bad Request` (`INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION`) |
| `ACTIVE` | `REJECTED` | ❌ | `400 Bad Request` (`INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION`) |
| Any | `PENDING` | ❌ | `400 Bad Request` (`INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION`) |

---

## 5. Hospital Administrator Authorization & Tenant Isolation

1. **Platform Scope**: `SYSTEM_ADMIN` retains full authority to review, approve, reject, and suspend affiliations across any hospital in the network.
2. **Facility Scope**: `HOSPITAL_ADMIN` may manage affiliations *only* for the hospital where:
   - `hospital.admin === adminUser.id`, OR
   - `hospital.registeredBy === adminUser.id`
3. **Tenant Isolation Enforcement**: If an administrator for Hospital A attempts to list or update affiliations for Hospital B, the backend rejects the request with `403 Forbidden` (`HOSPITAL_ACCESS_FORBIDDEN`).
4. **Cross-Tenant Parameter Tampering**: Attempting to use a Hospital A route with a Hospital B affiliation ID returns `404 Not Found` (`DOCTOR_AFFILIATION_NOT_FOUND`).

---

## 6. Hospital Facility Lifecycle Interaction

Doctor authorization strictly respects facility operational status:
- Affiliations can only be requested against hospitals in `APPROVED` status (`HOSPITAL_NOT_APPROVED`).
- An affiliation cannot transition to `ACTIVE` if the hospital is `SUSPENDED`, `PENDING`, or `REJECTED`.
- If a hospital is `SUSPENDED`, doctors affiliated with it are dynamically denied active clinical authorization via `hasActiveHospitalAffiliation`.

---

## 7. Clinical Authorization Policies

Policy module: `backend/src/policies/doctorPolicy.js`

- `isDoctor(user)`: Validates that `user.role === 'DOCTOR'`.
- `hasActiveDoctorProfile(doctor)`: Validates that `doctor.status === 'ACTIVE'`.
- `hasActiveHospitalAffiliation(affiliation, hospital)`: Validates that `affiliation.status === 'ACTIVE'` AND `hospital.status === 'APPROVED'`.
- `verifyHospitalAdminAuthority(hospital, adminUser)`: Enforces platform vs. facility-level tenant isolation.

---

## 8. REST API Endpoints

### Doctor Profile APIs

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| `POST` | `/api/doctors/profile` | JWT | `DOCTOR` | Create clinical profile with credentials |
| `GET` | `/api/doctors/me` | JWT | `DOCTOR` | Retrieve authenticated doctor profile |
| `PATCH` | `/api/doctors/me` | JWT | `DOCTOR` | Update permitted fields (phone, specialization, qualifications, experience) |

### Doctor Affiliation APIs

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| `GET` | `/api/doctors/me/hospitals` | JWT | `DOCTOR` | List all hospital affiliations for the doctor |
| `POST` | `/api/doctors/me/hospitals/:hospitalId/affiliation` | JWT | `DOCTOR` | Request affiliation with an approved hospital |

### Hospital Administration APIs

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| `GET` | `/api/hospitals/:hospitalId/doctors` | JWT | `HOSPITAL_ADMIN`, `SYSTEM_ADMIN` | List all doctors affiliated with the facility |
| `PATCH` | `/api/hospitals/:hospitalId/doctors/:affiliationId/status` | JWT | `HOSPITAL_ADMIN`, `SYSTEM_ADMIN` | Approve, reject, or suspend doctor affiliation |

---

## 9. Error Catalog

| Status | Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Request payload failed Zod schema validation |
| `400` | `HOSPITAL_NOT_APPROVED` | Attempted affiliation against a non-approved facility |
| `400` | `INVALID_DOCTOR_AFFILIATION_STATUS_TRANSITION` | Illegal state machine transition |
| `401` | `TOKEN_MISSING` / `INVALID_TOKEN` | Authentication required or invalid |
| `403` | `DOCTOR_ROLE_REQUIRED` | Attempt to create profile with non-DOCTOR account |
| `403` | `HOSPITAL_ACCESS_FORBIDDEN` | Tenant isolation violation by unauthorized admin |
| `404` | `DOCTOR_PROFILE_NOT_FOUND` | Doctor profile does not exist for the user |
| `404` | `HOSPITAL_NOT_FOUND` | Hospital does not exist |
| `404` | `DOCTOR_AFFILIATION_NOT_FOUND` | Affiliation does not exist for the given hospital |
| `409` | `DOCTOR_PROFILE_EXISTS` | User already has a profile or license is duplicate |
| `409` | `DOCTOR_AFFILIATION_EXISTS` | Doctor already has an affiliation with the hospital |

---

## 10. Frontend Components

- **`DoctorProfile.jsx`**: Visual dashboard showing clinical identity, medical license, specialization chips, qualifications, and verification badges.
- **`DoctorProfileModal.jsx`**: Reactive form for registering credentials or updating allowed fields with Zod-compatible validation.
- **`DoctorHospitalAffiliationList.jsx`**: Multi-hospital affiliation tracker with lifecycle status badges and affiliation request trigger.
- **`JoinHospitalAffiliationModal.jsx`**: Facility picker filtering approved hospitals and allowing optional clinical department assignment.
- **`HospitalDoctorList.jsx`**: Hospital administrator view for reviewing affiliated doctors with `Approve`, `Reject`, and `Suspend` controls.

---

## 11. Test Coverage & Verification

Phase 5 was validated with 39 dedicated automated tests in `backend/tests/doctor.test.js`:

```text
Test Suites: 5 passed, 5 total
Tests:       119 passed, 119 total
Snapshots:   0 total
Time:        12.975 s
Ran all test suites.
```

- **Phase 1 (Foundation):** 3 passed
- **Phase 2 (Authentication & Users):** 16 passed
- **Phase 3 (Hospitals & Lifecycle):** 20 passed
- **Phase 4 (Patients & Memberships):** 41 passed
- **Phase 5 (Doctors & Clinical Roles):** 39 passed
- **Total:** 119 passed, 0 failed, 0 regressions.

---

## 12. Strict Scope Boundary Confirmation

Phase 5 deliberately excluded:
- Doctor-patient assignments (Phase 6)
- Medical records & polymorphic discriminators (Phase 7)
- Scoped consent & cross-hospital access requests (Phase 8)
- Centralized audit engine (Phase 9)
- AI Copilot, Qdrant, RAG, tool calling, embeddings (Phase 10+)
