# HealthBridge Phase 7 — Medical Records Domain

## 1. Domain Overview

The **Medical Records Domain** establishes the core clinical data layer of HealthBridge. Medical records capture encounters, diagnoses, medications, lab diagnostics, prescriptions, and clinical document references.

In HealthBridge, a medical record is never an isolated free-floating document. It is anchored to:
- A registered, enrolled **Patient**
- An approved healthcare **Hospital** facility
- An active, credentialed **Doctor** who authored the record

```text
Doctor (Active Profile + Approved Hospital Affiliation + Active Patient Assignment)
  ↓
Creates Clinical Medical Record
  ├── Patient: Enrolled patient with active hospital membership
  ├── Hospital: Approved facility where encounter took place
  ├── Doctor: Authoring active clinical doctor
  └── Discriminator Type: VISIT | DIAGNOSIS | MEDICATION | LAB_RESULT | PRESCRIPTION | DOCUMENT
```

This phase enforces strict clinical access boundaries and immutable record retention, forming the foundational prerequisite for future **Consent Management (Phase 8)**, **Audit Logging (Phase 10)**, and **Authorization-Aware Retrieval-Augmented Generation (Phase 14)**.

---

## 2. Core Architecture: Mongoose Discriminators

Per project architectural specifications, all clinical medical records reside within a single MongoDB collection (`medical_records`), utilizing **Mongoose Discriminators** indexed by the discriminator key `recordType`.

### 2.1 Base Model (`MedicalRecord`)
Located at `backend/src/models/MedicalRecord.js`.
- **Collection**: `medical_records`
- **Discriminator Key**: `recordType`
- **Common Fields**:
  - `patient`: `ObjectId` referencing `Patient` (Required, indexed)
  - `hospital`: `ObjectId` referencing `Hospital` (Required, indexed)
  - `doctor`: `ObjectId` referencing `Doctor` (Required, indexed)
  - `recordType`: `String` enum (`VISIT`, `DIAGNOSIS`, `MEDICATION`, `LAB_RESULT`, `PRESCRIPTION`, `DOCUMENT`)
  - `recordDate`: `Date` encounter timestamp (Required, default `Date.now`)
  - `createdAt`, `updatedAt`: Automatic Mongoose timestamps

### 2.2 Discriminator Models
All 6 discriminator schemas extend `MedicalRecord` without duplicating common fields:

1. **`VisitRecord` (`recordType: 'VISIT'`)**:
   - `symptoms`: `[String]`
   - `diagnosis`: `String`
   - `notes`: `String`
   - `vitalSigns`: `{ bloodPressure: String, heartRate: Number, temperature: Number, respiratoryRate: Number, oxygenSaturation: Number }`
2. **`DiagnosisRecord` (`recordType: 'DIAGNOSIS'`)**:
   - `diagnosis`: `String` (Required)
   - `condition`: `String`
   - `icdCode`: `String` (Uppercase ICD-10 code)
   - `status`: `Enum` (`PROVISIONAL`, `CONFIRMED`, `RESOLVED`)
   - `notes`: `String`
3. **`MedicationRecord` (`recordType: 'MEDICATION'`)**:
   - `medicineName`: `String` (Required)
   - `dosage`: `String` (Required)
   - `frequency`: `String` (Required)
   - `duration`: `String` (Required)
   - `instructions`: `String`
4. **`LabResultRecord` (`recordType: 'LAB_RESULT'`)**:
   - `testName`: `String` (Required)
   - `value`: `String` (Required)
   - `unit`: `String`
   - `referenceRange`: `String`
   - `interpretation`: `Enum` (`NORMAL`, `ABNORMAL`, `CRITICAL`)
   - `notes`: `String`
5. **`PrescriptionRecord` (`recordType: 'PRESCRIPTION'`)**:
   - `medications`: Array of structured entries:
     - `medicineName`: `String` (Required)
     - `dosage`: `String` (Required)
     - `frequency`: `String` (Required)
     - `duration`: `String` (Required)
     - `instructions`: `String`
   - `instructions`: General regimen and dietary instructions
6. **`DocumentRecord` (`recordType: 'DOCUMENT'`)**:
   - `documentType`: `Enum` (`DISCHARGE_SUMMARY`, `LAB_REPORT`, `IMAGING_SCAN`, `CLINICAL_NOTE`, `PRESCRIPTION_SCAN`, `OTHER`)
   - `fileName`: `String` (Required)
   - `mimeType`: `String` (Required)
   - `storageReference`: `String` (Required synthetic storage URI)
   - `fileSize`: `Number`
   - `notes`: `String`

---

## 3. Authorization & Clinical Security Model

Access to medical records is strictly governed by clinical relationship invariants rather than broad role tags.

### 3.1 Nine-Step Creation Invariant Chain
Before any clinical record is created via `POST /api/records`, the service layer verifies:
1. **Authenticated User**: User must be authenticated with role `DOCTOR`.
2. **Doctor Profile Exists**: Clinical profile must be established.
3. **Doctor Profile Status**: Must be in `ACTIVE` status.
4. **Hospital Exists**: Target hospital must be registered.
5. **Hospital Status**: Hospital must be `APPROVED`.
6. **Doctor Affiliation**: Doctor must hold an `ACTIVE` affiliation with that specific hospital.
7. **Patient Exists**: Target patient profile must exist.
8. **Patient Membership**: Patient must hold an `ACTIVE` hospital membership with that facility.
9. **Doctor-Patient Assignment**: Doctor must have an `ACTIVE` clinical assignment with that patient at that hospital facility.

If any check in this chain fails, the request is rejected with `403 Forbidden` (`404 Not Found` if entity is missing).

### 3.2 Read Access Boundaries
- **Patients**: Can access only their own medical records (`GET /api/records/patient/:id` or `GET /api/records/:id`). Cross-patient access attempts are rejected with `403 Forbidden`.
- **Doctors**: Can only read records for patients with whom they have an `ACTIVE` assignment within an `APPROVED` hospital where the doctor is `ACTIVE`ly affiliated. Unassigned doctors or cross-hospital attempts are rejected with `403 Forbidden`.
- **Hospital Administrators**: Per architecture specifications, hospital administrators manage facilities and operational workflows, but do **NOT** receive unrestricted clinical medical record content (`403 Forbidden: ADMIN_CLINICAL_ACCESS_RESTRICTED`).
- **System Administrators**: Platform administrators have zero direct clinical content authority (`403 Forbidden: ADMIN_CLINICAL_ACCESS_RESTRICTED`). Administrative and clinical boundaries remain strictly segregated.

### 3.3 Update Invariants & Field Immutability
Authorized attending doctors may update clinical notes, vital signs, or test results via `PATCH /api/records/:id`.
However, core identity and ownership fields are **strictly immutable**:
- `patient` / `patientId`
- `hospital` / `hospitalId`
- `doctor` / `doctorId`
- `recordType`

Any attempt to reassign patient, facility, author, or discriminator type is immediately rejected with `400 Bad Request` (`FIELD_IMMUTABLE`).

### 3.4 Why Medical Records Are Not Deleted
There is deliberately **no physical deletion endpoint** (`DELETE /api/records/:id`).
Medical records represent medico-legal and clinical encounter artifacts. They are historically immutable to safeguard patient history and maintain auditability.

---

## 4. API Specification

All routes are mounted under `/api/records` (with alias `/api/patients/:id/records`) and require `Bearer` token authentication.

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/records` | `DOCTOR` (Active + Assigned) | Creates a new medical record across any of the 6 discriminators |
| `GET` | `/api/records/:id` | Patient Owner / Assigned Doctor | Retrieves single record with populated patient, doctor, and hospital |
| `GET` | `/api/records/patient/:patientId` | Patient Owner / Assigned Doctor | Lists records for a patient with discriminator & hospital filters |
| `GET` | `/api/patients/:id/records` | Patient Owner / Assigned Doctor | Alias endpoint for patient record timeline |
| `PATCH`| `/api/records/:id` | Assigned Doctor | Updates record clinical content while protecting identity fields |

---

## 5. Verification & Test Suite

The Medical Records domain is validated by `backend/tests/medicalRecord.test.js` covering 39 test cases:

1. **Discriminator Creation (1–6)**: Full validation of `VISIT`, `DIAGNOSIS`, `MEDICATION`, `LAB_RESULT`, `PRESCRIPTION`, and `DOCUMENT` records.
2. **Preconditions & Authorization Gates (7–17)**: Patient/admin rejection, inactive doctor rejection, unapproved hospital rejection, unassigned doctor rejection, cross-tenant isolation, and invalid schema rejections.
3. **Retrieval & Clinical Scoping (18–28)**: Assigned doctor queries, patient self-queries, cross-patient blocks, and administrative clinical access restriction (`403 ADMIN_CLINICAL_ACCESS_RESTRICTED`).
4. **Updates & Immutability (29–35)**: Permitted clinical updates, unauthorized doctor blocks, and strict rejection of attempts to mutate `patient`, `hospital`, `doctor`, or `recordType`.
5. **Storage Integrity (36–39)**: Single collection verification, discriminator sub-schema instantiation, verification that `DELETE` is not implemented, and ObjectId format checks.

**Regression Status**: All 191 tests in the backend test suite pass with 0 failures.
**Frontend Build**: Production build compiles with 0 errors via `vite build`.

---

## 6. Preparation for Future Phases

The Phase 7 medical records architecture directly lays the clinical substrate for:
- **Phase 8 (Consent Management)**: Patients will be able to grant cross-hospital consent for these records.
- **Phase 9 (Cross-Hospital Access Requests)**: Facilitating secure access to records from other network hospitals based on patient consent.
- **Phase 10 (Audit Logging)**: Logging all clinical read, create, and update actions.
- **Phase 13–14 (Authorization-Aware RAG)**: Chunks extracted from these typed medical records will be retrieved strictly according to the active authorization and consent graph established here.
