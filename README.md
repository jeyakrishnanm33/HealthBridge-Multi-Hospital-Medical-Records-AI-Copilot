# HealthBridge

> Centralized multi-hospital healthcare platform enabling consent-based longitudinal patient record access, fine-grained authorization, and an auditable AI copilot using authorization-aware RAG.

[![Project Status: Phase 2 - Auth & Users](https://img.shields.io/badge/Status-Phase_2:_Auth_%26_Users-teal.svg)](#current-implementation-status)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933.svg?logo=nodedotjs&logoColor=white)](#technology-stack)
[![Express](https://img.shields.io/badge/Express-4.21+-000000.svg?logo=express&logoColor=white)](#technology-stack)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg?logo=mongodb&logoColor=white)](#technology-stack)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](#technology-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4.svg?logo=tailwindcss&logoColor=white)](#technology-stack)

---

## Current Implementation Status

**Status: Phase 2 — Authentication & Users (Active)**

### What is Implemented:
- **Foundation (Phase 1):** Clean monorepo structure, Express REST API, Mongoose connection management, Zod environment validation, centralized error handling, health monitoring (`GET /api/health`), and automated foundation tests.
- **Authentication & Users (Phase 2):**
  - **User Model**: Mongoose schema supporting 4 platform roles (`SYSTEM_ADMIN`, `HOSPITAL_ADMIN`, `DOCTOR`, `PATIENT`), account statuses (`ACTIVE`, `INACTIVE`), email normalization, and unique indexing.
  - **Security**: Passwords hashed with `bcrypt` (10 rounds); plaintext passwords never stored or leaked.
  - **JWT Layer**: HMAC-SHA256 token issuance and expiration configured via `JWT_SECRET` and `JWT_EXPIRES_IN`.
  - **Authentication Middleware**: Bearer token verification attached to `req.user` (`middleware/authenticate.js`).
  - **Auth API Endpoints**:
    - `POST /api/auth/register` (Public self-registration for `PATIENT` and `DOCTOR`)
    - `POST /api/auth/login` (Credential verification and JWT issuance)
    - `GET /api/auth/me` (Protected profile retrieval)
    - `POST /api/auth/logout` (Stateless token discard contract)
  - **Frontend Auth Integration**: React modals for login/registration, token persistence in `localStorage`, session restoration on refresh, and user profile badges.
  - **Testing**: 19 automated tests covering registration, login, token verification, negative error codes, and health telemetry.

### What is Intentionally Deferred to Later Phases:
- **Phase 3 (Hospitals & Hospital Admin):** Hospital model, lifecycle approvals, hospital admin operations, doctor onboarding.
- **Phase 4 (Patients & Clinical Records):** Patient domain identity, medical record polymorphism (discriminators: visits, diagnoses, medications, labs).
- **Phase 5 (Consent & Access Requests):** Patient-controlled scoped consent, cross-hospital access requests.
- **Phase 6 (Authorization Policies):** Fine-grained RBAC and consent policy enforcement (`policies/`).
- **Phase 7+ (AI Copilot & Audit):** Authorization-aware RAG, Qdrant vector database, LLM tool calling, audit logs, and AI evaluation.

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
│   └── phase2-authentication.md    # Phase 2 identity & authentication documentation
├── backend/
│   ├── .env.example                # Backend environment configuration template
│   ├── package.json                # Express & backend dependencies (bcrypt, jsonwebtoken)
│   ├── jest.config.js              # Jest configuration
│   ├── tests/
│   │   ├── health.test.js          # Health check & error handling tests
│   │   └── auth.test.js            # Comprehensive authentication & security tests
│   └── src/
│       ├── server.js               # Process entry point: DB connection & HTTP listener
│       ├── app.js                  # Express application setup & middleware stack
│       ├── config/
│       │   ├── env.js              # Zod environment variable validation (JWT_SECRET)
│       │   └── database.js         # Mongoose connection & lifecycle handlers
│       ├── models/
│       │   └── User.js             # Mongoose User model with role and status enums
│       ├── controllers/
│       │   ├── healthController.js # Handles GET /api/health
│       │   └── authController.js   # Handles register, login, me, and logout
│       ├── routes/
│       │   ├── index.js            # Main router (/api)
│       │   ├── healthRoutes.js     # Health route definition
│       │   └── authRoutes.js       # Authentication routes (/api/auth)
│       ├── services/
│       │   ├── healthService.js    # Health check service & DB connectivity
│       │   └── authService.js      # Registration, login, token issuance, safe user serialization
│       ├── middleware/
│       │   ├── errorHandler.js     # Centralized error handling
│       │   ├── notFoundHandler.js  # 404 handler
│       │   ├── validate.js         # Zod schema validation middleware
│       │   └── authenticate.js     # JWT Bearer token authentication middleware
│       ├── validators/
│       │   ├── index.js            # Common validation primitives
│       │   └── authValidators.js   # Registration and login Zod schemas
│       ├── errors/
│       │   └── AppError.js         # Operational error classes (ConflictError, UnauthorizedError, etc.)
│       ├── utils/
│       │   ├── logger.js           # Development-friendly logger
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
        ├── App.jsx                 # HealthBridge dashboard, auth session & health telemetry
        ├── index.css               # Tailwind CSS imports & global styles
        ├── components/
        │   ├── AuthModal.jsx       # Login & Registration modal with role selection
        │   └── UserProfileCard.jsx # Authenticated user profile presentation
        └── services/
            ├── api.js              # Fetch client communicating with /api/health & /api/auth
            └── authStorage.js      # LocalStorage JWT token management helper
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | High-performance SPA with modern healthcare UI |
| **Backend** | Node.js, Express | RESTful API gateway & authoritative security boundary |
| **Database** | MongoDB, Mongoose ODM | Document database for accounts and medical records |
| **Security** | bcrypt, jsonwebtoken (JWT) | Password hashing (10 rounds) and stateless tokens |
| **Validation** | Zod | Runtime schema validation for env and API payloads |
| **Testing** | Jest, Supertest | Unit & integration testing (19 passing tests) |

---

## Getting Started

### Prerequisites
- **Node.js**: v18+ (tested with v22.14)
- **npm**: v9+ (tested with v11.2)
- **MongoDB**: Running locally on `mongodb://localhost:27017`

### 1. Environment Setup

Copy `.env.example` templates in `backend/` and `frontend/`:

```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env
```

**Backend Default `.env`:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/healthbridge
CLIENT_URL=http://localhost:5173

JWT_SECRET=your-secure-development-jwt-secret-key-32-chars-long
JWT_EXPIRES_IN=1h
```

**Frontend Default `.env`:**
```env
VITE_API_URL=http://localhost:5000
```

---

### 2. Independent Execution

#### Backend
```bash
cd backend
npm install
npm run dev
# Starts API server on http://localhost:5000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
# Starts Vite dev server on http://localhost:5173
```

---

### 3. Automated Tests

```bash
# Run all backend tests from root or backend directory
cd backend
npm test
```
Runs 19 tests across `tests/auth.test.js` and `tests/health.test.js`.
