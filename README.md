# HealthBridge

> Centralized multi-hospital healthcare platform enabling consent-based longitudinal patient record access, fine-grained authorization, and an auditable AI copilot using authorization-aware RAG.

[![Project Status: Phase 3 - Hospitals](https://img.shields.io/badge/Status-Phase_3:_Hospitals-teal.svg)](#current-implementation-status)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933.svg?logo=nodedotjs&logoColor=white)](#technology-stack)
[![Express](https://img.shields.io/badge/Express-4.21+-000000.svg?logo=express&logoColor=white)](#technology-stack)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg?logo=mongodb&logoColor=white)](#technology-stack)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](#technology-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4.svg?logo=tailwindcss&logoColor=white)](#technology-stack)

---

## Current Implementation Status

**Status: Phase 3 — Hospitals & Hospital Administration (Active)**

### What is Implemented:
- **Foundation (Phase 1):** Clean monorepo structure, Express REST API, Mongoose connection management, Zod environment validation, centralized error handling, health monitoring (`GET /api/health`), and automated foundation tests.
- **Authentication & Users (Phase 2):** User model with 4 platform roles (`SYSTEM_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `PATIENT`), bcrypt password hashing (10 rounds), stateless JWT issuance & verification middleware, auth API endpoints (`/register`, `/login`, `/me`, `/logout`), and interactive frontend authentication modal.
- **Hospitals & Administration (Phase 3):**
  - **Hospital Model**: Mongoose schema in `hospitals` collection with unique `hospitalCode`, address, contact details, lifecycle status, and `registeredBy` User reference.
  - **Lifecycle State Machine**: Strict transition enforcement: `PENDING → APPROVED`, `PENDING → REJECTED`, and `APPROVED → SUSPENDED`. All invalid transitions are rejected with `400 Bad Request`.
  - **Administrative Protection**: Minimal `requireRoles('SYSTEM_ADMIN')` middleware strictly restricting status transitions to authenticated System Administrators (non-admins receive `403 Forbidden`).
  - **Hospital API Endpoints**:
    - `POST /api/hospitals` (Registers hospital defaulting to `PENDING`)
    - `GET /api/hospitals` (Lists hospitals with optional `status` filter)
    - `GET /api/hospitals/:id` (Retrieves full hospital details)
    - `PATCH /api/hospitals/:id/status` (Privileged lifecycle status updates)
  - **Frontend Hospital UI**: Healthcare Network management tab, filterable hospital cards, registration modal, details modal, and System Admin lifecycle action controls (`Approve`, `Reject`, `Suspend`).
  - **Testing**: 39 automated tests across Phase 1, Phase 2, and Phase 3 suites.

### What is Intentionally Deferred to Later Phases:
- **Phase 4 (Patients & Memberships):** Centralized patient identity and Patient-Hospital memberships.
- **Phase 5 (Medical Records):** Polymorphic medical records (Visits, Diagnoses, Medications, Labs) via Mongoose discriminators.
- **Phase 6 (Authorization Policies):** Fine-grained RBAC and consent policy enforcement (`policies/`).
- **Phase 7 (Consent & Sharing):** Scoped patient-controlled consent and cross-hospital access requests.
- **Phase 8 (Security Audit):** Centralized immutable audit logging (`audit_logs`).
- **Phase 9+ (AI Copilot & Evaluation):** Authorization-aware RAG, Qdrant vector database, grounded LLM tool calling, and AI evaluation benchmarks.

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
│   └── phase3-hospitals.md         # Phase 3 hospital domain & lifecycle documentation
├── backend/
│   ├── .env.example                # Backend environment configuration template
│   ├── package.json                # Express & backend dependencies
│   ├── jest.config.js              # Jest configuration
│   ├── tests/
│   │   ├── health.test.js          # Phase 1 health check tests
│   │   ├── auth.test.js            # Phase 2 authentication & security tests
│   │   └── hospital.test.js        # Phase 3 hospital lifecycle & authorization tests
│   └── src/
│       ├── server.js               # Process entry point: DB connection & HTTP listener
│       ├── app.js                  # Express application setup & middleware stack
│       ├── config/
│       │   ├── env.js              # Zod environment variable validation
│       │   └── database.js         # Mongoose connection & lifecycle handlers
│       ├── models/
│       │   ├── User.js             # Mongoose User model
│       │   └── Hospital.js         # Mongoose Hospital model
│       ├── controllers/
│       │   ├── healthController.js # Handles GET /api/health
│       │   ├── authController.js   # Handles register, login, me, and logout
│       │   └── hospitalController.js # Handles hospital creation, listing, and status updates
│       ├── routes/
│       │   ├── index.js            # Main router (/api)
│       │   ├── healthRoutes.js     # Health route definition
│       │   ├── authRoutes.js       # Authentication routes (/api/auth)
│       │   └── hospitalRoutes.js   # Hospital routes (/api/hospitals)
│       ├── services/
│       │   ├── healthService.js    # Health check service & DB connectivity
│       │   ├── authService.js      # Authentication business logic
│       │   └── hospitalService.js  # Hospital creation, query, and lifecycle state machine
│       ├── middleware/
│       │   ├── errorHandler.js     # Centralized error handling
│       │   ├── notFoundHandler.js  # 404 handler
│       │   ├── validate.js         # Zod schema validation middleware
│       │   ├── authenticate.js     # JWT Bearer token authentication middleware
│       │   └── authorize.js        # Minimal role gate middleware (requireRoles)
│       ├── validators/
│       │   ├── index.js            # Common validation primitives
│       │   ├── authValidators.js   # Auth schemas
│       │   └── hospitalValidators.js # Hospital creation and status schemas
│       ├── errors/
│       │   └── AppError.js         # Operational error classes
│       ├── utils/
│       │   ├── logger.js           # Structured console logger
│       │   ├── password.js         # bcrypt hash and compare helpers
│       │   └── jwt.js              # jsonwebtoken sign and verify helpers
│       ├── policies/.gitkeep       # Reserved for Phase 6 authorization policies
│       └── ai/                     # AI subsystem architectural boundary
│           ├── embeddings/.gitkeep
│           ├── retrieval/.gitkeep
│           ├── rag/.gitkeep
│           ├── tools/.gitkeep
│           ├── agents/.gitkeep
│           ├── guardrails/.gitkeep
│           └── evaluation/.gitkeep
└── frontend/
    ├── .env.example                # Frontend environment configuration template
    ├── package.json                # React & frontend dependencies
    ├── vite.config.js              # Vite bundler configuration
    ├── tailwind.config.js          # Tailwind CSS design system configuration
    ├── postcss.config.js           # PostCSS plugins
    ├── index.html                  # HTML entry point
    └── src/
        ├── main.jsx                # React root mount
        ├── App.jsx                 # HealthBridge main dashboard with view switcher
        ├── index.css               # Tailwind CSS styling
        ├── components/
        │   ├── AuthModal.jsx       # Login & Registration modal
        │   ├── UserProfileCard.jsx # Authenticated user profile presentation
        │   ├── HospitalList.jsx    # Filterable hospital directory
        │   ├── HospitalFormModal.jsx # Hospital registration form
        │   ├── HospitalDetailModal.jsx # Hospital details view
        │   └── HospitalStatusActions.jsx # System Admin lifecycle controls
        └── services/
            ├── api.js              # Full-stack API client (health, auth, hospitals)
            └── authStorage.js      # LocalStorage JWT token management helper
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | High-performance SPA with modern healthcare UI |
| **Backend** | Node.js, Express | RESTful API gateway & authoritative security boundary |
| **Database** | MongoDB, Mongoose ODM | Document database for accounts, hospitals, and medical records |
| **Security** | bcrypt, jsonwebtoken (JWT) | Password hashing (10 rounds) and stateless tokens |
| **Validation** | Zod | Runtime schema validation for env, auth, and hospital payloads |
| **Testing** | Jest, Supertest | Unit & integration testing (39 passing tests) |

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
Runs 39 tests across:
- `tests/hospital.test.js` (20 tests)
- `tests/auth.test.js` (16 tests)
- `tests/health.test.js` (3 tests)
