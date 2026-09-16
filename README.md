# HealthBridge

> Centralized multi-hospital healthcare platform enabling consent-based longitudinal patient record access, fine-grained authorization, and an auditable AI copilot using authorization-aware RAG.

[![Project Status: Phase 8 - Cross-Hospital Access & Consent](https://img.shields.io/badge/Status-Phase_8:_Cross--Hospital_Access_&_Consent-teal.svg)](#current-implementation-status)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933.svg?logo=nodedotjs&logoColor=white)](#technology-stack)
[![Express](https://img.shields.io/badge/Express-4.21+-000000.svg?logo=express&logoColor=white)](#technology-stack)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg?logo=mongodb&logoColor=white)](#technology-stack)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](#technology-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4.svg?logo=tailwindcss&logoColor=white)](#technology-stack)

---

## Current Implementation Status

**Status: Phase 8 — Cross-Hospital Access, Access Requests & Patient Consent (Complete)**

### What is Implemented:
- **Foundation (Phase 1):** Clean monorepo structure, Express REST API, Mongoose connection management, Zod environment validation, centralized error handling, health monitoring (`GET /api/health`), and automated foundation tests.
- **Authentication & Users (Phase 2):** User model with 4 platform roles (`SYSTEM_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `PATIENT`), bcrypt password hashing (10 rounds), stateless JWT issuance & verification middleware, auth API endpoints (`/register`, `/login`, `/me`, `/logout`), and interactive frontend authentication modal.
- **Hospitals & Administration (Phase 3):**
  - **Hospital Model**: Mongoose schema in `hospitals` collection with unique `hospitalCode`, address, contact details, lifecycle status, and `registeredBy` User reference.
  - **Lifecycle State Machine**: Strict transition enforcement: `PENDING → APPROVED`, `PENDING → REJECTED`, and `APPROVED → SUSPENDED`. All invalid transitions are rejected with `400 Bad Request`.
  - **Administrative Protection**: Minimal `requireRoles('SYSTEM_ADMIN')` middleware strictly restricting status transitions to authenticated System Administrators.
- **Patients & Patient-Hospital Memberships (Phase 4):**
  - **Patient Model**: 1:1 clinical identity extension of authenticated `User` (`role === 'PATIENT'`), immutable server-generated collision-safe `patientId` format (`PAT-` + 6 uppercase hex chars), demographics, address, emergency contact, and status.
  - **PatientHospitalMembership Model**: Compound unique index `{ patient: 1, hospital: 1 }` preventing duplicate memberships (`409 Conflict`), tracking `joinedAt`, `approvedAt`, and `approvedBy`.
  - **Membership State Machine**: Authoritative lifecycle: `PENDING → ACTIVE`, `PENDING → REJECTED`, `ACTIVE → INACTIVE`.
  - **Hospital Tenant Isolation**: Hospital administrators can only view and manage memberships belonging to their administered hospital; cross-hospital access is blocked with `403 Forbidden`.
- **Doctors & Clinical Roles (Phase 5):**
  - **Doctor Model**: 1:1 clinical identity extension of authenticated `User` (`role === 'DOCTOR'`), unique medical license number, specialization, qualifications array, years of experience, and status (`PENDING`, `ACTIVE`, `SUSPENDED`).
  - **DoctorHospitalAffiliation Model**: Multi-hospital doctor affiliation model with compound unique index `{ doctor: 1, hospital: 1 }`, department tracking, requested/approved timestamps, and approving administrator metadata.
  - **Authoritative Affiliation State Machine**: Strict transitions: `PENDING → ACTIVE` (promotes doctor profile to `ACTIVE`), `PENDING → REJECTED`, `ACTIVE → SUSPENDED`.
- **Doctor–Patient Assignments (Phase 6):**
  - **DoctorPatientAssignment Model**: Explicit clinical relationship model in `doctor_patient_assignments` collection with partial unique index `{ doctor: 1, patient: 1, hospital: 1 }` (`status: 'ACTIVE'`) preventing duplicate simultaneous active relationships while permanently preserving historical records.
  - **Precondition Invariants**: Enforces active doctor credentials, approved hospital status, active doctor-hospital affiliation, and active patient-hospital membership before any assignment can be created.
  - **Tenant Isolation & Governance**: Admin-governed assignments; Hospital Admins are strictly confined to their facility (`403 Forbidden` for cross-facility tampering); System Admins maintain platform oversight; Doctors and Patients have role-scoped read visibility.
  - **Assignment Lifecycle**: Authoritative state machine `ACTIVE → ENDED`, tracking `assignedAt`, `endedAt`, `assignedBy`, and `endedBy`.
- **Medical Records Domain (Phase 7):**
  - **Mongoose Discriminators Architecture**: Base `MedicalRecord` model in collection `medical_records` with discriminator key `recordType`.
  - **6 Supported Clinical Record Types**:
    - `VisitRecord` (`VISIT`): Symptoms, assessment/diagnosis, notes, vital signs (BP, HR, temperature, RR, SpO2).
    - `DiagnosisRecord` (`DIAGNOSIS`): Diagnosis title, condition category, ICD-10 code, diagnostic status (`PROVISIONAL`, `CONFIRMED`, `RESOLVED`), notes.
    - `MedicationRecord` (`MEDICATION`): Medicine name, dosage, frequency, duration, intake instructions.
    - `LabResultRecord` (`LAB_RESULT`): Diagnostic test name, value, unit, reference range, interpretation (`NORMAL`, `ABNORMAL`, `CRITICAL`), notes.
    - `PrescriptionRecord` (`PRESCRIPTION`): Structured medications array, dosage, frequency, duration, general prescription instructions.
    - `DocumentRecord` (`DOCUMENT`): Clinical note, discharge summary, lab report, imaging scan metadata with synthetic storage references.
  - **9-Step Authorization Chain**: Doctors must satisfy the complete clinical authority chain: Doctor -> Active Doctor Profile -> Approved Hospital -> Active Doctor-Hospital Affiliation -> Enrolled Patient -> Active Patient-Hospital Membership -> Active Doctor-Patient Assignment.
  - **Administrative Clinical Exclusion**: Hospital Administrators and System Administrators have zero direct clinical content access (`403 Forbidden: ADMIN_CLINICAL_ACCESS_RESTRICTED`).
  - **Field Immutability**: Protected identity/ownership fields (`patient`, `hospital`, `doctor`, `recordType`) cannot be altered on update (`400 Bad Request: FIELD_IMMUTABLE`).
  - **Historical Preservation**: Physical deletion (`DELETE /api/records/:id`) is deliberately excluded; medical records remain immutable historical clinical artifacts.
- **Cross-Hospital Access, Access Requests & Patient Consent (Phase 8):**
  - **AccessRequest Model**: Tracks cross-hospital requests from doctors in state `PENDING → APPROVED | DENIED | CANCELLED`. Uses normalized scope keys and compound partial unique indexing (`unique_pending_access_request_idx`) to prevent duplicate pending spam.
  - **Consent Model**: Created automatically when a patient approves an access request. Dynamic `effectiveStatus` computation (`ACTIVE`, `EXPIRED`, `REVOKED`) evaluated in real time without background cron jobs.
  - **12-Invariant Precondition Gate**: Verifies doctor role, active credentials, requesting hospital approval, active doctor affiliation, patient existence, active doctor-patient assignment, source hospital approval, hospital disparity, source hospital patient membership, valid scopes, valid purpose, and duplicate check.
  - **Granular Clinical Scope Mapping**: Bi-directional mapping between consent scopes (`VISITS`, `DIAGNOSES`, `MEDICATIONS`, `LAB_RESULTS`, `PRESCRIPTIONS`, `DOCUMENTS`) and Mongoose discriminator record types.
  - **Cross-Hospital Record Access Integration**: Doctors at Hospital B can only access Hospital A medical records with an active, matching consent. Patient self-access and same-hospital doctor access remain unimpeded.
  - **Immediate Patient Revocation**: Patients can revoke consent at any time (`POST /api/consents/:id/revoke`), resulting in an immediate access cutoff.
  - **Frontend Integration**: Complete interactive interfaces for `CreateAccessRequestModal`, `AccessRequestList`, `ConsentList`, and `ConsentDetailModal`.
  - **Testing**: 240 automated backend tests passing 100% (49 Phase 8 tests + 191 regression tests across 9 suites).

### What is Intentionally Deferred to Later Phases:
- **Phase 9 (Security Audit Logging):** Centralized immutable audit logging (`audit_logs`) for clinical and consent access events.
- **Phase 10+ (AI Copilot & Evaluation):** Authorization-aware RAG, Qdrant vector database, grounded LLM tool calling, and AI evaluation benchmarks.

---

## Repository Structure

```text
healthbridge/
├── .env.example                    # Top-level environment reference
├── .gitignore                      # Git ignore rules for node_modules, .env, build artifacts
├── README.md                       # Project documentation
├── package.json                    # Root workspace orchestration
├── docs/
│   ├── phase1-foundation.md        # Phase 1 architecture & foundation documentation
│   ├── phase2-authentication.md    # Phase 2 identity & authentication documentation
│   ├── phase3-hospitals.md         # Phase 3 hospital domain & lifecycle documentation
│   ├── phase4-patients-memberships.md # Phase 4 patient domain & memberships documentation
│   ├── phase5-doctors.md           # Phase 5 doctor domain & clinical roles documentation
│   ├── phase6-assignments.md       # Phase 6 doctor-patient assignments documentation
│   ├── phase7-medical-records.md   # Phase 7 medical records domain documentation
│   └── phase8-cross-hospital-consent.md # Phase 8 cross-hospital access & consent documentation
├── backend/
│   ├── .env.example                # Backend environment configuration template
│   ├── package.json                # Express & backend dependencies
│   ├── jest.config.js              # Jest configuration
│   ├── tests/
│   │   ├── health.test.js          # Phase 1 health check tests
│   │   ├── auth.test.js            # Phase 2 authentication & security tests
│   │   ├── hospital.test.js        # Phase 3 hospital lifecycle & authorization tests
│   │   ├── patient.test.js         # Phase 4 patient & membership tests
│   │   ├── doctor.test.js          # Phase 5 doctor & affiliation tests
│   │   ├── assignment.test.js      # Phase 6 doctor-patient assignment tests (33 tests)
│   │   ├── medicalRecord.test.js   # Phase 7 medical records domain tests (39 tests)
│   │   ├── accessRequest.test.js   # Phase 8 cross-hospital access request tests (29 tests)
│   │   └── consent.test.js         # Phase 8 consent & cross-hospital record tests (20 tests)
│   └── src/
│       ├── server.js               # Process entry point: DB connection & HTTP listener
│       ├── app.js                  # Express application setup & middleware stack
│       ├── config/
│       │   ├── env.js              # Zod environment variable validation
│       │   └── database.js         # Mongoose connection & lifecycle handlers
│       ├── models/
│       │   ├── User.js             # Mongoose User model
│       │   ├── Hospital.js         # Mongoose Hospital model
│       │   ├── Patient.js          # Mongoose Patient model (Phase 4)
│       │   ├── PatientHospitalMembership.js # Mongoose Membership model (Phase 4)
│       │   ├── Doctor.js           # Mongoose Doctor model (Phase 5)
│       │   ├── DoctorHospitalAffiliation.js # Mongoose Affiliation model (Phase 5)
│       │   ├── DoctorPatientAssignment.js   # Mongoose Assignment model (Phase 6)
│       │   ├── MedicalRecord.js    # Base MedicalRecord model (Phase 7)
│       │   ├── VisitRecord.js      # VisitRecord discriminator (Phase 7)
│       │   ├── DiagnosisRecord.js  # DiagnosisRecord discriminator (Phase 7)
│       │   ├── MedicationRecord.js # MedicationRecord discriminator (Phase 7)
│       │   ├── LabResultRecord.js  # LabResultRecord discriminator (Phase 7)
│       │   ├── PrescriptionRecord.js # PrescriptionRecord discriminator (Phase 7)
│       │   ├── DocumentRecord.js   # DocumentRecord discriminator (Phase 7)
│       │   ├── AccessRequest.js    # Cross-hospital access request model (Phase 8)
│       │   └── Consent.js          # Patient consent model (Phase 8)
│       ├── controllers/
│       │   ├── healthController.js # Handles GET /api/health
│       │   ├── authController.js   # Handles register, login, me, and logout
│       │   ├── hospitalController.js # Handles hospital creation, listing, and status updates
│       │   ├── patientController.js # Handles patient profiles & hospital memberships
│       │   ├── doctorController.js  # Handles doctor profiles & hospital affiliations (Phase 5)
│       │   ├── assignmentController.js # Handles doctor-patient assignments (Phase 6)
│       │   ├── medicalRecordController.js # Handles clinical medical records (Phase 7)
│       │   ├── accessRequestController.js # Handles access request lifecycle (Phase 8)
│       │   └── consentController.js # Handles patient consent & dynamic evaluation (Phase 8)
│       ├── routes/
│       │   ├── index.js            # Main router (/api)
│       │   ├── healthRoutes.js     # Health route definition
│       │   ├── authRoutes.js       # Authentication routes (/api/auth)
│       │   ├── hospitalRoutes.js   # Hospital routes (/api/hospitals)
│       │   ├── patientRoutes.js    # Patient routes (/api/patients)
│       │   ├── doctorRoutes.js     # Doctor routes (/api/doctors) (Phase 5)
│       │   ├── assignmentRoutes.js # Assignment routes (/api/assignments) (Phase 6)
│       │   ├── medicalRecordRoutes.js # Medical record routes (/api/records) (Phase 7)
│       │   ├── accessRequestRoutes.js # Access request routes (/api/access-requests) (Phase 8)
│       │   └── consentRoutes.js    # Consent routes (/api/consents) (Phase 8)
│       ├── services/
│       │   ├── healthService.js    # Health check service & DB connectivity
│       │   ├── authService.js      # Authentication business logic
│       │   ├── hospitalService.js  # Hospital creation, query, and lifecycle state machine
│       │   ├── patientService.js   # Patient profile & membership state machine service
│       │   ├── doctorService.js    # Doctor profile & affiliation state machine service (Phase 5)
│       │   ├── assignmentService.js # Doctor-patient assignment service (Phase 6)
│       │   ├── medicalRecordService.js # Medical record logic & cross-hospital consent check (Phases 7–8)
│       │   ├── accessRequestService.js # Access request lifecycle & 12-invariant checks (Phase 8)
│       │   └── consentService.js   # Consent generation & dynamic status computation (Phase 8)
│       ├── policies/
│       │   ├── doctorPolicy.js     # Doctor authorization & facility authority policies (Phase 5)
│       │   ├── assignmentPolicy.js # Assignment authority & isolation policies (Phase 6)
│       │   ├── medicalRecordPolicy.js # Clinical authorization & admin restriction policies (Phase 7)
│       │   ├── accessRequestPolicy.js # 12-invariant chain & duplicate prevention policies (Phase 8)
│       │   └── consentPolicy.js    # Scope mapping & dynamic consent validation policies (Phase 8)
│       ├── middleware/
│       │   ├── errorHandler.js     # Centralized error handling
│       │   ├── notFoundHandler.js  # 404 handler
│       │   ├── validate.js         # Zod schema validation middleware
│       │   ├── authenticate.js     # JWT Bearer token authentication middleware
│       │   └── authorize.js        # Minimal role gate middleware (requireRoles)
│       ├── validators/
│       │   ├── index.js            # Common validation primitives
│       │   ├── authValidators.js   # Auth schemas
│       │   ├── hospitalValidators.js # Hospital creation and status schemas
│       │   ├── patientValidators.js # Patient profile and membership schemas
│       │   ├── doctorValidators.js  # Doctor profile and affiliation schemas (Phase 5)
│       │   ├── assignmentValidators.js # Doctor-patient assignment schemas (Phase 6)
│       │   ├── medicalRecordValidators.js # Medical record discriminator schemas (Phase 7)
│       │   ├── accessRequestValidators.js # Access request schemas (Phase 8)
│       │   └── consentValidators.js # Consent revocation & query schemas (Phase 8)
│       ├── errors/
│       │   └── AppError.js         # Operational error classes
│       └── utils/
│           ├── logger.js           # Structured console logger
│           ├── password.js         # bcrypt hash and compare helpers
│           └── jwt.js              # jsonwebtoken sign and verify helpers
└── frontend/
    ├── .env.example                # Frontend environment configuration template
    ├── package.json                # React & frontend dependencies
    ├── vite.config.js              # Vite bundler configuration
    ├── tailwind.config.js          # Tailwind CSS design system configuration
    ├── postcss.config.js           # PostCSS plugins
    ├── index.html                  # HTML entry point
    └── src/
        ├── main.jsx                # React root mount
        ├── App.jsx                 # HealthBridge dashboard with role-contextual navigation
        ├── index.css               # Tailwind CSS styling
        ├── components/
        │   ├── AuthModal.jsx       # Login & Registration modal
        │   ├── UserProfileCard.jsx # Authenticated user profile presentation
        │   ├── HospitalList.jsx    # Filterable hospital directory
        │   ├── HospitalFormModal.jsx # Hospital registration form
        │   ├── HospitalDetailModal.jsx # Hospital details view
        │   ├── HospitalStatusActions.jsx # System Admin lifecycle controls
        │   ├── PatientProfile.jsx  # Patient profile presentation
        │   ├── PatientProfileModal.jsx # Patient profile creation & editing modal
        │   ├── HospitalMembershipList.jsx # Patient's hospital memberships view
        │   ├── JoinHospitalModal.jsx # Approved hospital join request modal
        │   ├── HospitalPatientList.jsx # Hospital Admin membership approvals UI
        │   ├── DoctorProfile.jsx   # Doctor clinical profile presentation (Phase 5)
        │   ├── DoctorProfileModal.jsx # Doctor credentials creation & editing modal (Phase 5)
        │   ├── DoctorHospitalAffiliationList.jsx # Doctor's hospital affiliations view (Phase 5)
        │   ├── JoinHospitalAffiliationModal.jsx # Hospital affiliation request modal (Phase 5)
        │   ├── HospitalDoctorList.jsx # Hospital Admin doctor affiliations & approvals UI (Phase 5)
        │   ├── DoctorPatientAssignmentList.jsx # Doctor-patient assignments directory (Phase 6)
        │   ├── CreateAssignmentModal.jsx # Facility assignment creation modal (Phase 6)
        │   ├── MedicalRecordList.jsx # Medical records timeline & filter component (Phase 7)
        │   ├── MedicalRecordDetail.jsx # Clinical record detail inspection modal (Phase 7)
        │   ├── CreateMedicalRecordModal.jsx # Doctor clinical record authoring modal (Phase 7)
        │   ├── DoctorClinicalRecordsView.jsx # Doctor assigned-patient records view (Phase 7)
        │   ├── PatientMedicalRecordsView.jsx # Patient self-record timeline view (Phase 7)
        │   ├── CreateAccessRequestModal.jsx # Doctor cross-hospital access request authoring modal (Phase 8)
        │   ├── AccessRequestList.jsx # Access request tracking & approval/denial/cancellation UI (Phase 8)
        │   ├── ConsentList.jsx     # Consent overview & real-time revocation modal (Phase 8)
        │   └── ConsentDetailModal.jsx # Detailed consent inspection modal (Phase 8)
        └── services/
            ├── api.js              # Full-stack API client (health, auth, hospitals, patients, doctors, assignments, records, access-requests, consents)
            └── authStorage.js      # LocalStorage JWT token management helper
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | High-performance SPA with modern healthcare UI |
| **Backend** | Node.js, Express | RESTful API gateway & authoritative security boundary |
| **Database** | MongoDB, Mongoose ODM | Document database for accounts, hospitals, patients, doctors, affiliations, assignments, medical records, access requests, and consents |
| **Security** | bcrypt, jsonwebtoken (JWT) | Password hashing (10 rounds) and stateless tokens |
| **Validation** | Zod | Runtime schema validation for env, auth, hospital, patient, doctor, assignment, clinical record, access request, and consent payloads |
| **Testing** | Jest, Supertest | Unit & integration testing (240 passing tests across 9 suites) |

---

## Getting Started

### Prerequisites
- **Node.js**: v18+ (tested with v22.14)
- **npm**: v9+ (tested with v11.2)
- **MongoDB**: Running locally on `mongodb://localhost:27017`

### Running the Project

```bash
# Start backend (http://localhost:5000)
cd backend
npm run dev

# Start frontend (http://localhost:5173)
cd frontend
npm run dev
```

### Running Automated Tests

```bash
cd backend
npm test
```
Runs 240 tests across:
- `tests/accessRequest.test.js` (29 tests)
- `tests/consent.test.js` (20 tests)
- `tests/medicalRecord.test.js` (39 tests)
- `tests/assignment.test.js` (33 tests)
- `tests/doctor.test.js` (39 tests)
- `tests/patient.test.js` (41 tests)
- `tests/hospital.test.js` (20 tests)
- `tests/auth.test.js` (16 tests)
- `tests/health.test.js` (3 tests)

