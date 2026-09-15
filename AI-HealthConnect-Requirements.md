# AI HealthConnect — Project Requirements Document

**Status:** Phase 0 (Planning) — Locked
**Next:** Phase 1 — Implementation

---

## 1. Purpose

AI HealthConnect is a simulated multi-hospital health-record platform where hospitals manage their own patient records, authorized doctors access permitted longitudinal patient history through patient-controlled consent, and an AI copilot securely retrieves, summarizes, and answers questions about authorized medical information.

**One-line pitch (resume/interview):**
> Built a multi-hospital healthcare platform enabling consent-based access to longitudinal patient records, with an AI copilot using authorization-aware RAG and controlled tool calling to retrieve and summarize authorized medical information.

**What this is NOT:**
- Not ABDM or any real national health infrastructure — inspired by the interoperability problem, not a recreation of it.
- Not a real clinical system — no real-world medical use.
- Not an AI diagnostic system — the AI assists with information retrieval and summarization, never diagnosis or treatment decisions.
- Not a centralized database of real patient data — all data is synthetic.
- Not a full hospital-management suite — no billing, pharmacy inventory, insurance processing, etc.

---

## 2. Users & Roles

| Role | Scope | Core responsibility |
|---|---|---|
| **System Admin** | Platform-wide | Approves/rejects/suspends hospitals. Does **not** get automatic access to medical records. |
| **Hospital Admin** | One hospital | Manages doctors and hospital users. Operations role — **no clinical data access**. |
| **Doctor** | One (or more) hospitals | Creates clinical records, accesses authorized patients, uses AI copilot, requests cross-hospital access. |
| **Patient** | Own data | Views own records, grants/revokes consent, views access history. |

### Hospital Admin — explicit data boundary

| Data | Visible to Hospital Admin? |
|---|---|
| Patient name/ID | ✅ |
| Patient exists at hospital | ✅ |
| Record type / date / source hospital | ✅ |
| Medical record content, lab values, diagnoses, medications | ❌ |
| Another hospital's records | ❌ |

---

## 3. Core Lifecycles

**Hospital:** `PENDING → APPROVED / REJECTED`, `APPROVED → SUSPENDED` (reversible)
**Doctor (hospital membership):** `ACTIVE ⇄ INACTIVE`, controlled by Hospital Admin
**Patient–Hospital membership:** created on registration, remains `ACTIVE` for MVP (deactivation out of scope)
**Doctor–Patient assignment:** `ACTIVE → ENDED` — represents an explicit clinical relationship, required for same-hospital record access (hospital membership alone is not sufficient)
**Consent:** derived, not stored, from `grantedAt` / `expiresAt` / `revokedAt` (see §5)
**Access Request:** `PENDING → APPROVED / DENIED / CANCELLED / EXPIRED`

---

## 4. Authorization Model

Three distinct, separately-enforced concepts:

1. **Organization trust** — is this hospital allowed to participate? *(System Admin → hospital approval)*
2. **User authorization** — is this doctor an active, authorized user at that hospital, with an active clinical relationship to this patient? *(Hospital Admin management + doctor-patient assignment)*
3. **Patient data consent** — has the patient allowed this hospital to access these record categories, for this purpose, for this duration? *(Patient → consent, required only for cross-hospital access)*

**Same-hospital access chain:**
```
Active hospital membership → Hospital approved → Patient belongs to hospital
→ Doctor-patient assignment ACTIVE → ALLOW
```

**Cross-hospital access chain:**
```
Active hospital membership → Hospital approved → Patient has record elsewhere
→ Consent exists → Consent not revoked → Consent not expired
→ Requested record within consent scope → ALLOW
```

**Core principle (state this in every interview):**
> Security is enforced before data retrieval, not after. The LLM is never the security boundary — authorization happens in the application layer, before any data reaches the AI.

**Consent ≠ stored on MedicalRecord.** Consent is a separate, independently-changeable entity — a patient can revoke access without touching the underlying records.

**Doctor-patient assignment ≠ consent.** Assignment is an operational/clinical fact the hospital establishes for in-hospital care; consent is the patient-facing gate that specifically governs cross-hospital sharing, since that's where the real privacy risk lives.

---

## 5. Consent Design

- Stored fields: `patientId`, `hospitalId`, `purpose`, `scopes[]`, `grantedAt`, `expiresAt`, `revokedAt`
- **No stored `status` field.** Status is derived at request time:
  - `revokedAt != null` → REVOKED
  - `now >= expiresAt` → EXPIRED
  - otherwise → ACTIVE
- **Scopes (MVP):** VISITS, DIAGNOSES, MEDICATIONS, LAB_RESULTS, PRESCRIPTIONS, DOCUMENTS
- **Consent is hospital-scoped, not doctor-scoped** — granting Hospital B access doesn't require re-granting per doctor; RBAC + assignment govern which doctors inside that hospital can actually use it.
- **Access Requests** precede consent — a doctor requests access, the patient reviews and approves/denies scope, approval creates the Consent record. Frontend never creates consent directly.
- **Duplicate request rule:** one PENDING request per doctor + patient + hospital + scope combination; re-requesting returns the existing request.

---

## 6. AI Boundaries

**AI CAN:** summarize medical history, retrieve relevant authorized records, answer questions grounded in those records, compare historical values, summarize documents, generate timelines, cite sources.

**AI CANNOT:** diagnose, prescribe, make treatment decisions, override permissions, grant itself access, retrieve unauthorized records.

**Response principle:**
> If evidence exists in authorized records → answer with sources.
> If evidence is insufficient → say so explicitly ("I couldn't find a relevant record in the authorized records"), never fabricate.

**Data boundary:** the AI never receives "the database." It receives only what the doctor's request has already been authorized + consented to access:
```
Request → Authorization → Consent → Permitted records → Retrieval → AI
```
If a doctor asks for something outside consent scope, the restricted records are **never retrieved and never reach the LLM** — this is not an LLM-level refusal, it's an application-level filtering decision made before generation.

**RAG filtering:** filter-before-retrieval (scope vector search itself to permitted record IDs) rather than retrieve-then-filter, so unauthorized content never transiently enters the LLM's context window.

---

## 7. Audit Logging

**Log:** actor, actorRole, hospitalId, patientId, action, resourceType, resourceId, purpose, result, reasonCode, timestamp. Denials are logged too, with a reason code (e.g. `CONSENT_EXPIRED`).

**Never log:** medical record content, lab values, diagnosis text, medication details, document contents, full AI prompts, AI-generated responses.

**AI interactions** get a separate collection (`ai_interactions`) from general audit logs (`audit_logs`) — one answers "what did the AI system do operationally" (retrieval stats, tool calls, latency, token usage), the other answers "who accessed what and was it allowed." `retrievedRecordIds` is **required** on every successful AI retrieval event — this is what later powers evaluation ("did the AI only use authorized records").

**Error responses** must not leak authorization metadata (e.g. never reveal *why* access was denied to an unauthorized requester in a way that confirms the existence of a relationship they shouldn't know about).

**Out of scope for MVP:** anomaly/rate-based detection of repeated denials — noted as a stated future-work item, not a silent gap, since the audit schema already supports adding it later.

---

## 8. Database Model (MongoDB / Mongoose)

**12 collections:**

1. `users` — auth identity (email, passwordHash, role, status)
2. `hospitals` — status: PENDING / APPROVED / REJECTED / SUSPENDED
3. `hospital_memberships` — user ↔ hospital, with its own role/status (unique per user+hospital)
4. `patients` — global patient identity, linked via `userId`
5. `patient_hospital_memberships` — patient ↔ hospital, with hospital-specific patient ID (unique per patient+hospital)
6. `doctor_patient_assignments` — explicit clinical relationship (doctorId, patientId, hospitalId, status: ACTIVE/ENDED)
7. `medical_records` — polymorphic via **Mongoose discriminators** (VISIT / DIAGNOSIS / MEDICATION / LAB_RESULT / PRESCRIPTION / DOCUMENT), each with type-specific validated `content`
8. `medical_documents` — uploaded file metadata; actual files in external storage, not embedded in Mongo
9. `consents` — patient ↔ hospital, scoped, status derived (not stored)
10. `access_requests` — PENDING/APPROVED/DENIED/CANCELLED/EXPIRED
11. `audit_logs` — access decisions, metadata only
12. `ai_interactions` — AI operational metadata, metadata only

**Key design decision:** patient identity is **global** (one `patients` document), never duplicated per hospital. Hospital-specific relationships and identifiers live in `patient_hospital_memberships`. Records are owned by their source hospital (`hospitalId` on `medical_records`) but reference the global `patientId`.

**Indexes:** `unique(email)` on users; `unique(userId, hospitalId)` on hospital_memberships; `unique(patientId, hospitalId)` on patient_hospital_memberships; `(patientId, recordDate)` and `(patientId, hospitalId, recordDate)` on medical_records; compound indexes on consents and medical_records covering the authorization-path query patterns (`{patientId, hospitalId}` at minimum) since these run on every protected request.

**Why MongoDB over PostgreSQL:** medical records are naturally polymorphic across record types, and the project is already document-API-oriented. Relationships are kept in separate collections rather than embedded, to stay maintainable. For a real production system, PostgreSQL would be worth evaluating for stronger transactional/relational guarantees.

---

## 9. System Architecture

```
React (Doctor / Patient / Hospital Admin / System Admin UI)
        │
   REST / HTTPS
        │
        ▼
Express Backend
  ├── Authentication (JWT) ─┐
  ├── Validation (Zod)      ├─► Authorization (Consent + RBAC via policies/)
  ├── Controllers           │
  ├── Services              │
  ├── AI Module ─────────────┘   ← RAG, tools, LLM calls — lives inside Express (MVP)
  └── Audit Service
        │
   ┌────┴────┐
   ▼         ▼
MongoDB   Vector DB
              │
         RAG Pipeline (chunk → embed → index → retrieve → generate)
              │
             LLM
```

**Request lifecycle (every protected route):**
```
Route → Authentication middleware → Validation → Authorization (policies/)
→ Controller → Service → Database → Response
```

**AI request lifecycle:**
```
Doctor → POST /api/ai/chat → Authentication → Authorization → Consent check
→ Determine accessible records → Retrieval (filtered to authorized IDs)
→ RAG → Grounded prompt → LLM → Response validation → Audit → Return
```

React never calls the AI subsystem directly — Express is the sole security gateway.

**Multi-tenant isolation:** every hospital-scoped query must filter by `hospitalId`, not just `patientId`, to prevent accidental cross-tenant leakage.

**Error format:** consistent structured errors (`{success: false, error: {code, message}}`) that never leak internal authorization reasoning to unauthorized requesters.

---

## 10. REST API Surface (representative)

```
POST /api/auth/register | login | logout
GET  /api/auth/me

POST /api/admin/hospitals/:id/approve | reject | suspend | reactivate

POST /api/hospitals/:id/doctors
GET  /api/hospitals/:id/doctors

GET  /api/patients/me | me/records | me/consents | me/access-history
GET  /api/patients/:patientId | :patientId/records
POST /api/patients/:patientId/records

POST /api/access-requests
POST /api/access-requests/:id/approve | deny | cancel

GET  /api/records/:id   (never a raw DB lookup — always through the authorization service)

POST /api/ai/chat
```

---

## 11. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite, Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose (discriminators for record polymorphism) |
| Auth | JWT + bcrypt |
| Validation | Zod |
| AI (MVP) | Inside Express, as an internal module — not a separate service |
| LLM / Embeddings | LLM API + embedding API |
| Vector DB | Qdrant (or a simpler alternative if it reduces ops overhead) |
| RAG | Hand-built pipeline (chunking, embedding, retrieval, generation) — no framework initially |
| Testing | Jest + Supertest |
| Version control | Git + GitHub |

**Deliberately not used (initially):** LangChain/LlamaIndex (build the pipeline by hand first, evaluate frameworks after), a separate FastAPI service (AI logic starts as a well-isolated Express module; extractable later if a real need emerges), Kubernetes, Kafka, Redis (unless a concrete need arises), Docker (added once components work independently).

---

## 12. Scope Tiers

### 🟢 Must-have (defines project success)
React · Express · MongoDB · JWT/RBAC · Doctor-patient assignments · Hospital approval · Patient consent · Access requests · Medical records · Cross-hospital authorization · Audit logging · Clean service/policy separation · LLM integration · Embeddings · Vector DB · RAG · **Authorization-aware retrieval** · Grounded responses with source citation · Basic AI guardrails · AI audit metadata

### 🟡 Should-have (build if MVP is stable, don't let them delay it)
Tool calling (`get_patient`, `get_visits`, `search_records`, etc., always routed through backend authorization) · Simple AI agent loop (reason → tool → observe → answer) · Extracting AI into a separate FastAPI service · **AI evaluation** (protect this one especially — cheap once RAG works, and it's the strongest "AI reliability" signal in the project)

### 🟠 Optional (only if everything above already works)
Docker Compose · Swagger/OpenAPI docs · Reranking · Advanced observability dashboard · Sophisticated guardrail framework

### ❌ Explicitly excluded
Kubernetes, Kafka, multiple databases, complex microservices, LangChain/LlamaIndex "for the resume," elaborate agent frameworks, five different monitoring tools, billing/pharmacy/insurance modules, real identity-matching/deduplication across hospitals (synthetic explicit linking only).

---

## 13. Security Test Plan (Phase 9)

Deliberately attempt to break the system before calling it done:

- Unauthorized doctor accessing a patient with no assignment/consent
- Unapproved or suspended hospital attempting access
- Expired consent → must deny
- Revoked consent → must deny immediately
- Cross-hospital leakage → Hospital B must never see Hospital A's unconsented records
- Prompt injection via a malicious uploaded document ("ignore previous instructions...") → must be treated as inert data, never obeyed
- Tool abuse → AI attempting a tool call the user isn't authorized for → backend rejects regardless of LLM intent
- Data leakage between patients in AI responses

---

## 14. Evaluation Plan (Phase 10 — should-have, protect if scope tightens)

Synthetic eval set (~50-100 question/expected-record pairs), scoring:

- **Retrieval:** relevant-record recall, irrelevant-record rejection
- **Generation:** groundedness, factual consistency with source records, completeness
- **Safety:** correct denial of unauthorized-scope questions, prompt-injection resistance, correct refusal on insufficient evidence ("I couldn't find enough information") rather than fabrication
- **Tool/agent (if built):** correct tool selection, correct arguments, task completion rate

---

## 15. Build Order (Phase 1 onward — vertical slices, not horizontal layers)

1. Auth + hospital/doctor/patient foundation, no AI — login → dashboard → patient → record working end-to-end
2. Consent + cross-hospital access request/approval flow
3. AI chat (no record access yet) → then authorization-aware RAG over real records
4. Tool calling → agent loop (should-have tier)
5. Evaluation + security testing
6. Observability, polish, deployment, documentation

Each phase should leave something genuinely working and demoable — never spend extended time on infrastructure before there's an end-to-end slice to show for it.

---

## 16. Hero Demo Script (for interviews / recruiters)

1. System Admin approves Hospital A and Hospital B.
2. Hospital A onboards Doctor Arun; Patient John registers and gets records at Hospital A.
3. John later visits Hospital B. Doctor at Hospital B searches for John, sees he has records elsewhere, but access is denied — no consent yet.
4. Doctor requests access. John reviews the request (requesting hospital, purpose, specific record categories) and grants scoped, time-limited consent.
5. Doctor now sees John's permitted history — and only the permitted categories.
6. Doctor asks the AI copilot: *"Summarize John's relevant medical history."* → grounded, cited summary from authorized records only.
7. Doctor asks something outside available records → AI explicitly says it couldn't find sufficient information, rather than inventing an answer.
8. John revokes consent. Doctor's next request is denied immediately.
9. Every step above is visible in the audit log.

This single flow demonstrates: full-stack CRUD, RBAC, multi-tenant isolation, consent-based authorization, authorization-aware RAG, grounded/non-hallucinating AI, and auditability — in about two minutes.

---

## 17. Interview Talking Points (pre-built answers)

- **"Why did you separate authentication, authorization, and consent?"** → They're different concerns: authentication identifies the user, authorization determines permitted actions, consent is an additional patient-controlled policy layer specifically for cross-hospital data. Keeping them separate means each can change independently — e.g., revoking consent doesn't touch 100 medical records, because consent was never stored on the record itself.
- **"How do you prevent the AI from leaking unauthorized data?"** → The LLM is never the security boundary. Authorization and consent are resolved in the application layer before any record is retrieved; the AI physically never receives records outside that permitted set, even if a vector search would otherwise have returned something relevant-but-unauthorized.
- **"Why MongoDB over PostgreSQL?"** → Medical records are naturally polymorphic across types, and the project is document-API-oriented already. For a real production system, I'd evaluate PostgreSQL for stronger transactional guarantees.
- **"Why not give all doctors in a hospital access to all its patients?"** → Hospital membership alone doesn't establish a clinical relationship. Explicit doctor-patient assignments create a finer authorization boundary and leave room to extend toward departments or more granular clinical permissions later.
- **"Is this HIPAA/ABDM compliant?"** → No — it demonstrates the architectural patterns real healthcare interoperability systems use (consent, RBAC, audit, tenant isolation), using entirely synthetic data. It's a portfolio system inspired by the interoperability problem, not a compliance implementation.

---

*This document reflects Phase 0 (0.1 – 0.6), locked before implementation. Any changes to these decisions during Phase 1+ should be made deliberately and noted here, not silently drifted into.*
