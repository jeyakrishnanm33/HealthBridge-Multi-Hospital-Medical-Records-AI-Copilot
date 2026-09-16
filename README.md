# HealthBridge

> Centralized multi-hospital healthcare platform enabling consent-based longitudinal patient record access, fine-grained authorization, and an auditable AI copilot using authorization-aware RAG.

[![Project Status: Phase 5 - Doctors & Clinical Roles](https://img.shields.io/badge/Status-Phase_5:_Doctors_&_Clinical_Roles-teal.svg)](#current-implementation-status)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933.svg?logo=nodedotjs&logoColor=white)](#technology-stack)
[![Express](https://img.shields.io/badge/Express-4.21+-000000.svg?logo=express&logoColor=white)](#technology-stack)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg?logo=mongodb&logoColor=white)](#technology-stack)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](#technology-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4.svg?logo=tailwindcss&logoColor=white)](#technology-stack)

---

## Current Implementation Status

**Status: Phase 5 — Doctors & Clinical Roles (Complete)**

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
  - **Authoritative Affiliation State Machine**: Strict transitions: `PENDING → ACTIVE` (promotes doctor profile to `ACTIVE`), `PENDING → REJECTED`, `ACTIVE → SUSPENDED`. Hospital lifecycle gating ensures affiliations cannot be activated under unapproved or suspended hospitals.
  - **Tenant Isolation & Authority**: Clinical policies (`doctorPolicy.js`) enforce facility governance; administrators manage only their assigned facility; unauthorized attempts yield `403 Forbidden`.
  - **Frontend UI Components**:
    - `DoctorProfile.jsx` & `DoctorProfileModal.jsx`: Visual clinical credentials presentation, license badge, qualifications tags, experience, and profile creation/edit workflows.
    - `DoctorHospitalAffiliationList.jsx` & `JoinHospitalAffiliationModal.jsx`: Affiliation directory with lifecycle badges, department selection, and affiliation request modal.
    - `HospitalDoctorList.jsx`: Hospital Admin governance view with Approve, Reject, and Suspend state machine controls.
  - **Testing**: 119 automated tests (39 Phase 5 doctor tests + 80 existing regression tests passing 100%).

### What is Intentionally Deferred to Later Phases:
- **Phase 6 (Medical Records):** Polymorphic medical records (Visits, Diagnoses, Medications, Labs) via Mongoose discriminators.
- **Phase 7 (Authorization Policies):** Fine-grained RBAC and consent policy enforcement (`policies/`).
- **Phase 8 (Consent & Sharing):** Scoped patient-controlled consent and cross-hospital access requests.
- **Phase 9 (Security Audit):** Centralized immutable audit logging (`audit_logs`).
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
│   └── phase5-doctors.md           # Phase 5 doctor domain & clinical roles documentation
├── backend/
│   ├── .env.example                # Backend environment configuration template
│   ├── package.json                # Express & backend dependencies
│   ├── jest.config.js              # Jest configuration
│   ├── tests/
│   │   ├── health.test.js          # Phase 1 health check tests
│   │   ├── auth.test.js            # Phase 2 authentication & security tests
│   │   ├── hospital.test.js        # Phase 3 hospital lifecycle & authorization tests
│   │   ├── patient.test.js         # Phase 4 patient & membership tests
│   │   └── doctor.test.js          # Phase 5 doctor & affiliation tests (39 tests)
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
│       │   └── DoctorHospitalAffiliation.js # Mongoose Affiliation model (Phase 5)
│       ├── controllers/
│       │   ├── healthController.js # Handles GET /api/health
│       │   ├── authController.js   # Handles register, login, me, and logout
│       │   ├── hospitalController.js # Handles hospital creation, listing, and status updates
│       │   ├── patientController.js # Handles patient profiles & hospital memberships
│       │   └── doctorController.js  # Handles doctor profiles & hospital affiliations (Phase 5)
│       ├── routes/
│       │   ├── index.js            # Main router (/api)
│       │   ├── healthRoutes.js     # Health route definition
│       │   ├── authRoutes.js       # Authentication routes (/api/auth)
│       │   ├── hospitalRoutes.js   # Hospital routes (/api/hospitals)
│       │   ├── patientRoutes.js    # Patient routes (/api/patients)
│       │   └── doctorRoutes.js     # Doctor routes (/api/doctors) (Phase 5)
│       ├── services/
│       │   ├── healthService.js    # Health check service & DB connectivity
│       │   ├── authService.js      # Authentication business logic
│       │   ├── hospitalService.js  # Hospital creation, query, and lifecycle state machine
│       │   ├── patientService.js   # Patient profile & membership state machine service
│       │   └── doctorService.js    # Doctor profile & affiliation state machine service (Phase 5)
│       ├── policies/
│       │   └── doctorPolicy.js     # Doctor authorization & facility authority policies (Phase 5)
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
│       │   └── doctorValidators.js  # Doctor profile and affiliation schemas (Phase 5)
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
        │   └── HospitalDoctorList.jsx # Hospital Admin doctor affiliations & approvals UI (Phase 5)
        └── services/
            ├── api.js              # Full-stack API client (health, auth, hospitals, patients, doctors)
            └── authStorage.js      # LocalStorage JWT token management helper
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | High-performance SPA with modern healthcare UI |
| **Backend** | Node.js, Express | RESTful API gateway & authoritative security boundary |
| **Database** | MongoDB, Mongoose ODM | Document database for accounts, hospitals, patients, doctors, and affiliations |
| **Security** | bcrypt, jsonwebtoken (JWT) | Password hashing (10 rounds) and stateless tokens |
| **Validation** | Zod | Runtime schema validation for env, auth, hospital, patient, and doctor payloads |
| **Testing** | Jest, Supertest | Unit & integration testing (119 passing tests) |

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
Runs 119 tests across:
- `tests/doctor.test.js` (39 tests)
- `tests/patient.test.js` (41 tests)
- `tests/hospital.test.js` (20 tests)
- `tests/auth.test.js` (16 tests)
- `tests/health.test.js` (3 tests)
