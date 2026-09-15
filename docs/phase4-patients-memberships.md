# HealthBridge — Phase 4: Patients & Patient-Hospital Memberships Documentation

## 1. Patient Architecture

Phase 4 establishes the patient domain and patient-hospital membership relationship within HealthBridge. A `Patient` document represents a 1:1 clinical identity extension of an authenticated `User` account with role `PATIENT`. 

The backend acts as the authoritative security boundary:
- Patient identity is strictly tied to `req.user.id`.
- Patient identifiers (`patientId`) are generated exclusively server-side and are immutable.
- A patient can connect to multiple approved hospitals via `PatientHospitalMembership` records.
- Hospital administrators can view and manage memberships exclusively for their own hospital.

---

## 2. Patient Model

- **Collection**: `patients`
- **File**: `backend/src/models/Patient.js`

```javascript
{
  id: "67909...10",
  user: "67908...01",               // ObjectId, ref: 'User', unique: true, required
  patientId: "PAT-7F42A1",          // String, unique: true, uppercase, server-generated
  dateOfBirth: "2001-05-15T00:00:00.000Z", // Date, required
  gender: "MALE",                   // Enum: 'MALE' | 'FEMALE' | 'OTHER'
  bloodGroup: "O+",                 // Optional Enum: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  phone: "9876543210",              // String, required, trimmed
  address: {                        // Subdocument
    street: "123 Cross Road",
    city: "Chennai",
    state: "Tamil Nadu",
    postalCode: "600001",
    country: "India"                // Default: 'India'
  },
  emergencyContact: {               // Subdocument
    name: "John Doe",
    relationship: "Brother",
    phone: "9876543211"
  },
  status: "ACTIVE",                 // Enum: 'ACTIVE' | 'INACTIVE', default: 'ACTIVE'
  createdAt: "2026-09-15T08:14:00.000Z",
  updatedAt: "2026-09-15T08:14:00.000Z"
}
```

### Constraints & Invariants
- Exactly one Patient profile may exist per User (`user` unique index).
- Client-supplied `patientId`, `user`, or `status` are strictly forbidden and rejected.
- Date of birth is validated and immutable once set.
- User password hashes and sensitive auth details are never exposed.

---

## 3. Patient ID Generation

Format: `PAT-` followed by 6 uppercase hexadecimal characters (e.g. `PAT-7F42A1`).

Generated via cryptographic randomness:
```javascript
const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
const candidateId = `PAT-${randomHex}`;
```

The service layer validates against database collision in a loop before insertion. The database enforces uniqueness with a unique index on `patientId`.

---

## 4. Patient Hospital Membership Model

- **Collection**: `patientHospitalMemberships`
- **File**: `backend/src/models/PatientHospitalMembership.js`

```javascript
{
  id: "67909...20",
  patient: "67909...10",            // ObjectId, ref: 'Patient', required
  hospital: "67908...05",           // ObjectId, ref: 'Hospital', required
  status: "PENDING",                // Enum: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE'
  joinedAt: null,                   // Date, set upon PENDING -> ACTIVE
  approvedAt: null,                 // Date, set upon PENDING -> ACTIVE or PENDING -> REJECTED
  approvedBy: null,                 // ObjectId, ref: 'User', admin who approved/rejected
  createdAt: "2026-09-15T08:14:05.000Z",
  updatedAt: "2026-09-15T08:14:05.000Z"
}
```

---

## 5. Membership Uniqueness

Enforced at the database level using a compound unique index:
```javascript
patientHospitalMembershipSchema.index({ patient: 1, hospital: 1 }, { unique: true });
```
This guarantees that a patient can have at most one membership record for a specific hospital. Duplicate requests return `409 Conflict` (`MEMBERSHIP_EXISTS`).

---

## 6. Membership Lifecycle State Machine

The membership state machine is authoritative and enforced server-side:

```text
                 ┌───────────┐
                 │  PENDING  │
                 └─────┬─────┘
                       │
                 ┌─────┴─────┐
                 ↓           ↓
              ACTIVE      REJECTED
                 │
                 ↓
             INACTIVE
```

### Allowed Transitions
- `PENDING → ACTIVE`: Sets `approvedAt = new Date()`, `joinedAt = new Date()`, `approvedBy = admin.id`.
- `PENDING → REJECTED`: Sets `approvedAt = new Date()`, `approvedBy = admin.id`.
- `ACTIVE → INACTIVE`: Deactivates membership; preserves historical approval metadata.

### Forbidden Transitions
All other transitions return `400 Bad Request` (`INVALID_MEMBERSHIP_STATUS_TRANSITION`):
- `REJECTED → ACTIVE`
- `REJECTED → INACTIVE`
- `INACTIVE → ACTIVE`
- `INACTIVE → REJECTED`
- `ACTIVE → REJECTED`

---

## 7. Hospital Administrator Authorization & Tenant Isolation

- A `HOSPITAL_ADMIN` can only access and modify memberships for hospitals they administer.
- Authorization check:
  ```javascript
  hospital.admin?.equals(user.id) || hospital.registeredBy?.equals(user.id)
  ```
- A `SYSTEM_ADMIN` may access memberships across all hospitals.
- If Admin A attempts to access or modify memberships for Hospital B, the backend rejects with `403 Forbidden` (`HOSPITAL_ACCESS_FORBIDDEN`).
- If Admin A passes a membership ID belonging to Hospital B under Hospital A's route, the backend returns `404 Not Found` (`MEMBERSHIP_NOT_FOUND`).

---

## 8. API Endpoints

### Patient Routes (`/api/patients`)
| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/patients/profile` | `PATIENT` | Create patient profile (returns 201 with `PAT-` ID) |
| `GET` | `/api/patients/me` | `PATIENT` | Retrieve authenticated patient's profile |
| `PATCH` | `/api/patients/me` | `PATIENT` | Update contact/demographics (phone, address, emergencyContact, bloodGroup) |
| `GET` | `/api/patients/me/hospitals` | `PATIENT` | List hospitals where authenticated patient has memberships |
| `POST` | `/api/patients/me/hospitals/:hospitalId/membership` | `PATIENT` | Request membership to an `APPROVED` hospital (initial status: `PENDING`) |

### Hospital Management Routes (`/api/hospitals`)
| Method | Endpoint | Roles | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/hospitals/:hospitalId/memberships` | `HOSPITAL_ADMIN`, `SYSTEM_ADMIN` | List patient memberships for hospital (tenant isolated) |
| `PATCH` | `/api/hospitals/:hospitalId/memberships/:membershipId/status` | `HOSPITAL_ADMIN`, `SYSTEM_ADMIN` | Execute lifecycle status transition (`ACTIVE`, `REJECTED`, `INACTIVE`) |

---

## 9. Frontend Flow

The React frontend includes role-contextual views matching the HealthBridge design aesthetic:

1. **Patient Profile (`PatientProfile.jsx` + `PatientProfileModal.jsx`)**:
   - Displays read-only Patient ID, name, email, DOB, gender, blood group, phone, address, emergency contact, status.
   - Allows creation and updating of allowed profile fields.
   - Prevents client tampering with immutable attributes.

2. **Patient Memberships (`HospitalMembershipList.jsx` + `JoinHospitalModal.jsx`)**:
   - Shows patient's current hospital memberships with status badges (`PENDING`, `ACTIVE`, `REJECTED`, `INACTIVE`).
   - "Join Another Hospital" modal filters and displays only `APPROVED` hospitals.
   - Triggers membership request and renders `PENDING` state.

3. **Hospital Admin Memberships (`HospitalPatientList.jsx`)**:
   - Displays hospital patient memberships for the administrator's hospital.
   - Provides action buttons based on current state:
     - `PENDING`: [Approve] → `ACTIVE`, [Reject] → `REJECTED`
     - `ACTIVE`: [Deactivate] → `INACTIVE`
     - Terminal states: no action buttons rendered.

---

## 10. Security Considerations

- **Strict Identity Derivation**: Patient ID, user ID, and admin identity are strictly derived server-side from validated JWT claims (`req.user.id`).
- **Strict Role Gates**: Only `PATIENT` can create profiles or request memberships. Only `HOSPITAL_ADMIN` and `SYSTEM_ADMIN` can review or transition memberships.
- **Tenant Isolation**: Cross-hospital access is blocked at the service layer regardless of frontend inputs.
- **Input Validation**: All request bodies and URL parameters are validated via Zod schemas with `.strict()` mode to reject rogue fields.
- **Credential Hygiene**: Password hashes and sensitive tokens are excluded from all responses and Mongoose projections.

---

## 11. Testing

Automated test suite in `backend/tests/patient.test.js` covers 41 test cases across all requirements:
1. Patient profile creation, ID generation, immutability, role restrictions.
2. Profile retrieval and safe user population.
3. Profile editing and mutation restrictions.
4. Membership requests, approved hospital checks, duplicate prevention.
5. Patient and Admin membership retrieval.
6. Membership state machine transitions and invalid transition rejections (`INVALID_MEMBERSHIP_STATUS_TRANSITION`).
7. Cross-hospital isolation and tenant security.

All 80 test cases across Phases 1, 2, 3, and 4 pass cleanly.

---

## 12. Synthetic Verification

All testing and live demonstrations use synthetic test data:
- Synthetic Patient: `patient1@test-phase4.local` / `PAT-XXXXXX`
- Synthetic Hospitals: `Apollo Hospital Phase4`, `Fortis Hospital Phase4`
- Synthetic Admins: `adminA@test-phase4.local`, `adminB@test-phase4.local`

No real healthcare data or credentials are used.

---

## 13. Explicit Scope Boundaries

Phase 4 strictly implements patient profiles, memberships, and hospital-admin membership lifecycle. The following remain entirely unimplemented:
- Doctor-hospital membership & doctor scheduling
- Medical records, clinical notes, and prescriptions
- Patient-controlled consent engine
- Cross-hospital record sharing
- Audit logging engine
- AI copilot, LLMs, embeddings, vector database, Qdrant, RAG, tool calling

---

## 14. Next Phase: Phase 5

**Phase 5: Doctor Domain & Clinical Roles** will introduce:
- Doctor profile and credentials
- Doctor-hospital affiliation and approval
- Department and specialty assignment
- Doctor scheduling and clinical availability
