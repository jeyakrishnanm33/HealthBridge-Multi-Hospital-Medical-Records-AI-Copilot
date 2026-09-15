# HealthBridge

> Centralized multi-hospital healthcare platform enabling consent-based longitudinal patient record access, fine-grained authorization, and an auditable AI copilot using authorization-aware RAG.

[![Project Status: Phase 1 - Foundation](https://img.shields.io/badge/Status-Phase_1:_Foundation-teal.svg)](#current-implementation-status)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-339933.svg?logo=nodedotjs&logoColor=white)](#technology-stack)
[![Express](https://img.shields.io/badge/Express-4.21+-000000.svg?logo=express&logoColor=white)](#technology-stack)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248.svg?logo=mongodb&logoColor=white)](#technology-stack)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg?logo=react&logoColor=black)](#technology-stack)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4.svg?logo=tailwindcss&logoColor=white)](#technology-stack)

---

## Current Implementation Status

**Status: Phase 1 — Foundation (Active)**

Phase 1 establishes the clean, runnable monorepo foundation for HealthBridge.

### What is Implemented in Phase 1:
- Express backend application with clear application/server separation (`src/app.js` and `src/server.js`).
- Mongoose database connection manager with lifecycle event handling and status telemetry.
- Environment variable validation with **Zod** (`src/config/env.js`).
- Centralized error handling infrastructure (`src/errors/AppError.js`, `src/middleware/errorHandler.js`).
- Request validation middleware primitives (`src/middleware/validate.js`).
- Health endpoint (`GET /api/health`) reporting system uptime and MongoDB connectivity.
- React + Vite + Tailwind CSS frontend with a clean healthcare interface.
- Live full-stack communication proving frontend → backend → MongoDB connectivity.
- Automated tests via Jest and Supertest (`backend/tests/health.test.js`).
- Architectural boundary directories (`policies/`, `models/`, and `ai/*`) prepared for subsequent phases.

### What is Intentionally Deferred to Later Phases:
- **Phase 2 (Auth & Identities):** User registration, login, JWT issuance, bcrypt password hashing, System/Hospital Admin and Doctor/Patient identities.
- **Phase 3 (Consent & Sharing):** Patient-controlled consent, cross-hospital access requests, medical record discriminator schemas (Visits, Diagnoses, Medications, Labs).
- **Phase 4+ (AI Copilot):** Vector database (Qdrant), embeddings, RAG retrieval, LLM generation, tool calling, audit logs, and AI evaluation.

---

## Repository Structure

```text
healthbridge/
├── .env.example                    # Top-level environment reference
├── .gitignore                      # Git ignore rules for node_modules, .env, build artifacts
├── README.md                       # Project documentation
├── package.json                    # Root workspace orchestration
├── docs/
│   └── phase1-foundation.md        # Detailed Phase 1 architecture & setup documentation
├── backend/
│   ├── .env.example                # Backend environment configuration template
│   ├── package.json                # Express & backend dependencies
│   ├── jest.config.js              # Jest configuration
│   ├── tests/
│   │   └── health.test.js          # Health check & error handling tests
│   └── src/
│       ├── server.js               # Entry point: DB connection & HTTP listener
│       ├── app.js                  # Express application setup & middleware stack
│       ├── config/
│       │   ├── env.js              # Zod environment variable validation
│       │   └── database.js         # Mongoose connection & lifecycle handlers
│       ├── controllers/
│       │   └── healthController.js # Handles GET /api/health
│       ├── routes/
│       │   ├── index.js            # Main router
│       │   └── healthRoutes.js     # Health route definition
│       ├── services/
│       │   └── healthService.js    # Health check service & DB connectivity
│       ├── middleware/
│       │   ├── errorHandler.js     # Centralized error handling
│       │   ├── notFoundHandler.js  # 404 handler
│       │   └── validate.js         # Request validation middleware primitive
│       ├── validators/
│       │   └── index.js            # Common validation schemas
│       ├── errors/
│       │   └── AppError.js         # Operational error classes
│       ├── utils/
│       │   └── logger.js           # Development-friendly logger
│       ├── models/                 # Reserved for Phase 2+ schemas (.gitkeep)
│       ├── policies/               # Reserved for Phase 3+ authorization policies (.gitkeep)
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
        ├── App.jsx                 # HealthBridge dashboard & live health telemetry
        ├── index.css               # Tailwind CSS imports & global styles
        └── services/
            └── api.js              # Client fetching from /api/health
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS | High-performance SPA with modern healthcare UI |
| **Backend** | Node.js, Express | RESTful API gateway & authorization layer |
| **Database** | MongoDB, Mongoose ODM | Document database for polymorphic medical data |
| **Validation** | Zod | Runtime schema validation for env & future requests |
| **Testing** | Jest, Supertest | Unit & integration testing |

---

## Getting Started

### Prerequisites
- **Node.js**: v18+ (tested with v22.14)
- **npm**: v9+ (tested with v11.2)
- **MongoDB**: Running locally on `mongodb://localhost:27017` (or remote URI)

### 1. Clone & Configure Environment Variables

Create `.env` files in `backend/` and `frontend/` using their respective `.env.example`:

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
```

**Frontend Default `.env`:**
```env
VITE_API_URL=http://localhost:5000
```

---

### 2. Independent Execution

Both frontend and backend are independently runnable:

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

### 3. Monorepo Orchestration

From the project root:
```bash
# Install root orchestration packages
npm install

# Run backend tests
npm test

# Run both backend and frontend concurrently
npm run dev
```

---

## Health Check Flow

1. Open `http://localhost:5173` in your browser.
2. The React frontend calls `GET /api/health`.
3. The Express backend verifies that MongoDB is connected (`mongoose.connection.readyState === 1`).
4. The dashboard displays the live system status, latency, uptime, and database state.
5. Click **"Refresh Status"** to re-ping the backend on demand.
