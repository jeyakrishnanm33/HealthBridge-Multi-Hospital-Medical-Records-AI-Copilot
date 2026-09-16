# HealthBridge — Phase 6: Doctor–Patient Assignments Documentation

## 1. Assignment Purpose & Core Principle

Phase 6 establishes the explicit clinical relationship layer between an active medical practitioner and an enrolled patient within a specific healthcare facility.

### Core Architectural Principle
> **A doctor-patient assignment establishes a clinical relationship, NOT unrestricted medical-data access.**

An assignment serves as an essential authorization primitive in HealthBridge:
```text
Doctor
   ↓
Active Hospital Affiliation
   ↓
Hospital
   ↓
Patient
   ↓
Doctor-Patient Assignment
```

The assignment establishes:
> *"This doctor is clinically associated with this patient within this hospital facility."*

It does **not** grant unrestricted, blanket access to every historical or cross-hospital medical record. Subsequent phases will layer fine-grained record-level authorization, patient-controlled consent scopes, and break-glass emergency rules.

---

## 2. Domain Model

- **Collection**: `doctor_patient_assignments`
- **File**: `backend/src/models/DoctorPatientAssignment.js`

```javascript
{
  id: "6790b...15",
  doctor: "6790a...10",                 // ObjectId, ref: 'Doctor', required
  patient: "67909...10",                // ObjectId, ref: 'Patient', required
  hospital: "67908...05",               // ObjectId, ref: 'Hospital', required
  status: "ACTIVE",                     // Enum: 'ACTIVE' | 'ENDED', default 'ACTIVE'
  assignedAt: "2026-09-16T08:00:00.000Z", // Date, default Date.now
  endedAt: null,                        // Date, set upon status -> ENDED
  assignedBy: "67908...01",             // ObjectId, ref: 'User', admin who created
  endedBy: null,                        // ObjectId, ref: 'User', admin who ended
  notes: "Primary physician diagnostic care", // String, max 500 chars
  createdAt: "2026-09-16T08:00:00.000Z",
  updatedAt: "2026-09-16T08:00:00.000Z"
}
```

### Data Integrity & Partial Unique Index
To prevent duplicate simultaneous active relationships without losing historical audit trails:
```javascript
doctorPatientAssignmentSchema.index(
  { doctor: 1, patient: 1, hospital: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'ACTIVE' },
  }
);
```
- Exactly **one** active assignment can exist for a given `{ doctor, patient, hospital }` tuple at any time.
- When an assignment ends (`status: 'ENDED'`), the record is preserved indefinitely in the database.
- A patient and doctor may be reassigned in the future under a new active record without index collision.

---

## 3. Assignment Precondition Invariants

An assignment may only be created when all five domain constraints are satisfied:

1. **Doctor Verification**:
   - User account has `role === 'DOCTOR'`.
   - Doctor profile exists.
   - Doctor profile is `ACTIVE`.
2. **Hospital Verification**:
   - Hospital facility exists.
   - Hospital lifecycle status is `APPROVED`.
3. **Doctor Affiliation Verification**:
   - Doctor possesses an `ACTIVE` affiliation record (`DoctorHospitalAffiliation`) with the target hospital facility.
4. **Patient Membership Verification**:
   - Patient identity exists.
   - Patient holds an `ACTIVE` hospital membership (`PatientHospitalMembership`) with the target hospital facility.
5. **No Duplicate Active Relationship**:
   - No existing active assignment currently exists for the doctor, patient, and facility tuple (`409 Conflict`).

---

## 4. Tenant Isolation & Administrative Governance

Implemented in `backend/src/policies/assignmentPolicy.js`:

```
Request → JWT Authentication → Role Check → Facility Authority Gate → Assignment Execution
```

### Governance Separation
- **Hospital Administrators (`HOSPITAL_ADMIN`)**:
  - May create assignments **only** within their assigned facility (`hospital.admin` or `hospital.registeredBy`).
  - Cross-facility operations (creating, viewing, or ending assignments for another hospital) are strictly rejected with **`403 Forbidden` (`HOSPITAL_ACCESS_FORBIDDEN`)**.
  - May end active assignments within their facility.
- **System Administrators (`SYSTEM_ADMIN`)**:
  - Platform-wide governance over all facilities and assignments.
- **Doctors (`DOCTOR`)**:
  - Strictly forbidden from arbitrarily self-assigning patients (`403 Forbidden`).
  - May view their own active and historical patient assignments.
  - Strictly blocked from viewing another practitioner's assignments (`403 Forbidden`).
- **Patients (`PATIENT`)**:
  - May view clinical assignments involving themselves.
  - Strictly blocked from creating or modifying assignments (`403 Forbidden`).

---

## 5. Lifecycle State Machine

Doctor-patient assignments follow a strict two-state lifecycle:

```
    [Hospital Admin Creates Assignment]
                    │
                    ▼
               ┌────────┐
               │ ACTIVE │
               └───┬────┘
                   │ [Hospital Admin Ends Assignment]
                   ▼
               ┌────────┐
               │ ENDED  │ (Terminal State)
               └────────┘
```

### Lifecycle Invariants
- `ACTIVE → ENDED`: Transitioned exclusively by authorized administrators. Sets `endedAt = new Date()` and `endedBy = adminUser.id`.
- `ENDED` assignments cannot be transitioned again; repeated attempts return `400 Bad Request` (`ASSIGNMENT_ALREADY_ENDED`).
- Ended assignments are **never deleted**, preserving full temporal and clinical auditability.
- If care resumes, a new assignment record is established.

---

## 6. REST API Endpoints Specification

All endpoints require `Bearer` JWT authentication.

| Method | Endpoint | Allowed Roles | Description | Status Codes |
|---|---|---|---|---|
| `POST` | `/api/assignments` | `HOSPITAL_ADMIN`, `SYSTEM_ADMIN` | Create assignment inside administered facility | `201`, `400`, `401`, `403`, `404`, `409` |
| `GET` | `/api/assignments` | All Authenticated Roles | List assignments (scoped to facility, doctor, or patient) | `200`, `401`, `403` |
| `GET` | `/api/assignments/:id` | All Authenticated Roles | Get assignment details (tenant & identity checked) | `200`, `401`, `403`, `404` |
| `PATCH` | `/api/assignments/:id/end` | `HOSPITAL_ADMIN`, `SYSTEM_ADMIN` | End active assignment (`ACTIVE → ENDED`) | `200`, `400`, `401`, `403`, `404` |

---

## 7. Frontend Integration

Components implemented under `frontend/src/components/`:
- **`DoctorPatientAssignmentList.jsx`**:
  - **Hospital Admin View**: Facility selector, status filters (`ALL`, `ACTIVE`, `ENDED`), attending doctor card, patient card (`PAT-` identifier), assigned timestamps, and "End Assignment" action.
  - **Doctor View**: Assigned patients directory, patient identifiers, assigned dates, and facility details.
  - **Patient View**: Assigned attending practitioners directory.
- **`CreateAssignmentModal.jsx`**:
  - Modal for Hospital Administrators.
  - Facility-filtered active doctors dropdown.
  - Facility-filtered active member patients dropdown.
  - Clinical notes textarea with submission state handling.

---

## 8. Automated Test Coverage & Verification

### Test Suite: `backend/tests/assignment.test.js`
- **33 Comprehensive Tests** verifying:
  1. Valid assignment creation inside administered facility (`201 Created`).
  2. Non-existent doctor handling (`404 DOCTOR_NOT_FOUND`).
  3. Non-existent patient handling (`404 PATIENT_NOT_FOUND`).
  4. Non-existent hospital handling (`404 HOSPITAL_NOT_FOUND`).
  5. Inactive doctor rejection (`400 DOCTOR_NOT_ACTIVE`).
  6. Non-approved hospital rejection (`400 HOSPITAL_NOT_APPROVED`).
  7. Missing doctor affiliation rejection (`400 DOCTOR_AFFILIATION_REQUIRED`).
  8. Pending doctor affiliation rejection (`400 DOCTOR_AFFILIATION_REQUIRED`).
  9. Missing patient membership rejection (`400 PATIENT_MEMBERSHIP_REQUIRED`).
  10. Pending patient membership rejection (`400 PATIENT_MEMBERSHIP_REQUIRED`).
  11. Duplicate active assignment prevention (`409 ACTIVE_ASSIGNMENT_EXISTS`).
  12. **Mandatory Tenant Isolation**: Hospital Admin A blocked from Hospital B (`403 HOSPITAL_ACCESS_FORBIDDEN`).
  13. System Admin cross-facility assignment creation.
  14. Doctor assignment creation blocked (`403 Forbidden`).
  15. Patient assignment creation blocked (`403 Forbidden`).
  16. Unauthenticated requests blocked (`401 Unauthorized`).
  17. Hospital Admin viewing own facility assignments.
  18. Hospital Admin A blocked from viewing Hospital B assignments (`403 Forbidden`).
  19. Doctor viewing own assignments.
  20. Doctor receiving empty list when unassigned.
  21. Patient viewing own assignments.
  22. Cross-doctor and cross-patient assignment detail access blocked (`403 Forbidden`).
  23. Active assignment ending (`ACTIVE → ENDED`).
  24. Historical record preservation in MongoDB.
  25. Already-ended assignment repeated end rejection (`400 ASSIGNMENT_ALREADY_ENDED`).
  26. Cross-hospital assignment termination blocked (`403 Forbidden`).
  27. Doctor assignment termination blocked (`403 Forbidden`).
  28. Patient assignment termination blocked (`403 Forbidden`).
  29. Re-assignment support after previous assignment has ended.
  30. Password hash redaction in all assignment responses.
  31. Malformed ObjectId handling (`400 Bad Request`).

### Full Regression Suite:
- **6 Test Suites Passed (100%)**:
  - `assignment.test.js`: **33 passed**
  - `doctor.test.js`: **39 passed**
  - `patient.test.js`: **41 passed**
  - `hospital.test.js`: **20 passed**
  - `auth.test.js`: **16 passed**
  - `health.test.js`: **3 passed**
- **Total**: **152 tests passed, 0 failed**.
- **Frontend Build**: `vite build` completed cleanly in 2.33s.
