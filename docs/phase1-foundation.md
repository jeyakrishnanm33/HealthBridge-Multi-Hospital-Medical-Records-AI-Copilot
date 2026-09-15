# HealthBridge — Phase 1: Foundation Documentation

## 1. Overview

Phase 1 establishes the foundational full-stack architecture for **HealthBridge**, a centralized multi-hospital healthcare platform with patient-controlled consent and an authorization-aware AI copilot.

This phase intentionally delivers only the core architectural foundation, establishing:
- Monorepo structure with independent backend and frontend runtimes.
- Express REST API with centralized error handling, request validation primitives, and environment validation.
- MongoDB connection management via Mongoose with lifecycle event listeners.
- React frontend with Tailwind CSS and live health-check telemetry.
- Architectural boundary directories (`policies/`, `models/`, and `ai/*`) preparing the repository for subsequent phases without code rework.

---

## 2. Architecture at Phase 1

```text
Browser (React + Tailwind CSS)
       │
       │ HTTP GET /api/health
       ▼
Express API Gateway (src/app.js)
  ├── CORS Middleware (Client origin check)
  ├── JSON Body Parser
  ├── Request Logger (Morgan)
  ├── Routes Aggregator (src/routes/index.js)
  │     └── /api/health (src/routes/healthRoutes.js)
  │           └── Health Controller (src/controllers/healthController.js)
  │                 └── Health Service (src/services/healthService.js)
  ├── 404 Not Found Handler (src/middleware/notFoundHandler.js)
  └── Centralized Error Handler (src/middleware/errorHandler.js)
       │
       ▼
MongoDB Database (via Mongoose connection state)
```

---

## 3. Directory Layout & Module Responsibilities

```text
healthbridge/
├── backend/
│   ├── tests/
│   │   └── health.test.js          # Automated tests (Jest + Supertest)
│   └── src/
│       ├── server.js               # Process bootstrap, DB connect & HTTP listener
│       ├── app.js                  # Express application & middleware chain
│       ├── config/
│       │   ├── env.js              # Zod environment variable parsing & validation
│       │   └── database.js         # Mongoose connection manager & event listeners
│       ├── controllers/
│       │   └── healthController.js # Handles GET /api/health
│       ├── routes/
│       │   ├── index.js            # Main /api route registry
│       │   └── healthRoutes.js     # Health route definition
│       ├── services/
│       │   └── healthService.js    # Health status & DB status provider
│       ├── middleware/
│       │   ├── errorHandler.js     # Centralized error formatting (no leak in prod)
│       │   ├── notFoundHandler.js  # Clean 404 response generator
│       │   └── validate.js         # Zod schema validation middleware factory
│       ├── validators/
│       │   └── index.js            # Common validation primitives (ObjectId, etc.)
│       ├── errors/
│       │   └── AppError.js         # Standard HTTP error classes (AppError, NotFoundError, etc.)
│       ├── utils/
│       │   └── logger.js           # Structured console logger
│       ├── models/                 # Reserved for Phase 2+ Mongoose schemas
│       ├── policies/               # Reserved for Phase 3+ RBAC & consent policies
│       └── ai/                     # AI subsystem architectural boundary
│           ├── embeddings/         # Future chunking & text vectorization
│           ├── retrieval/          # Future vector DB retrieval & authorized filtering
│           ├── rag/                # Future grounded clinical generation
│           ├── tools/              # Future authorized tool definitions
│           ├── agents/             # Future doctor copilot agent loop
│           ├── guardrails/         # Future prompt injection & safety boundaries
│           └── evaluation/         # Future retrieval & groundedness benchmarks
└── frontend/
    ├── src/
    │   ├── App.jsx                 # HealthBridge dashboard & live health telemetry
    │   ├── main.jsx                # React root mount
    │   ├── index.css               # Tailwind CSS imports & global styles
    │   └── services/
    │       └── api.js              # Fetch client communicating with GET /api/health
```

---

## 4. Environment Variables

### Backend (`backend/.env`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `5000` | Port for the Express HTTP server |
| `NODE_ENV` | Enum (`development`, `production`, `test`) | `development` | Application runtime environment |
| `MONGODB_URI` | String | `mongodb://localhost:27017/healthbridge` | MongoDB connection URI |
| `CLIENT_URL` | String | `http://localhost:5173` | Allowed origin for frontend CORS |

### Frontend (`frontend/.env`)

| Variable | Type | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | String | `http://localhost:5000` | Base URL of the HealthBridge Express API |

---

## 5. API Specification: Health Endpoint

### `GET /api/health`

Exposes basic system metrics and database connection status.

**Success Response (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "healthbridge-api",
    "version": "0.1.0",
    "timestamp": "2026-09-15T06:05:00.000Z",
    "uptime": 45.12,
    "database": {
      "status": "connected",
      "connected": true
    }
  }
}
```

---

## 6. Local Development Workflow

### Starting the Backend
```bash
cd backend
npm install
npm run dev
```

### Starting the Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running Backend Tests
```bash
cd backend
npm test
```
