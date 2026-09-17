# HealthBridge — Phase 14: Controlled Tool Calling & Clinical Data Tools

## 1. Architecture Overview

Phase 14 evolves the Phase 13 Clinical Assistant into a secure, controlled 2-stage tool calling pipeline. Rather than allowing an autonomous agent loop or direct database access from an external AI service, the architecture enforces strict boundary controls:

```
[User Natural Language Question]
               │
               ▼
[Express Gateway /api/clinical-assistant/ask]
   ├─ RBAC / Context Validation
   │
   ▼
[FastAPI AI Microservice (/internal/rag/select-tools)]
   ├─ Tool Definition Schema Matching
   ├─ Direct Non-Clinical Answer / Prompt-Injection Defenses
   └─ Selects max 2 tools (e.g. get_medications, get_recent_visits)
               │
               ▼
[Express Tool Execution Engine]
   ├─ Pre-execution Authorization Check (Doctor Assignment / Patient Scope Consent)
   ├─ Zod Argument Schema Validation
   ├─ Controlled Read-Only Mongoose Retrieval
   ├─ Execution Timeout & Max Item Bounds
   └─ Zero-PHI Audit Logging (CLINICAL_TOOL_REQUESTED / CLINICAL_TOOL_EXECUTED)
               │
               ▼
[FastAPI AI Microservice (/internal/rag/answer)]
   ├─ Grounded Answer Generation with Source Citations
   └─ Zero Hallucination Guarantee
```

---

## 2. Clinical Data Retrieval Tools

HealthBridge provides 6 read-only deterministic clinical data tools:

| Tool Name | Scope Required | Description |
| :--- | :--- | :--- |
| `get_recent_visits` | `VISITS` | Fetches recent clinical encounter records, symptoms, notes, and vital signs |
| `get_diagnoses` | `DIAGNOSES` | Fetches diagnoses with optional status filter (`PROVISIONAL`, `CONFIRMED`, `RESOLVED`) |
| `get_medications` | `MEDICATIONS` | Fetches medication records with optional status filter (`ACTIVE`, `COMPLETED`, `DISCONTINUED`) |
| `get_lab_results` | `LAB_RESULTS` | Fetches lab results with test name substring search and interpretation filters |
| `get_prescriptions` | `PRESCRIPTIONS` | Fetches prescription records and medication dosages |
| `get_clinical_timeline` | Consent Boundaries | Chronological multi-record timeline bounded by doctor active scopes |

---

## 3. Security & Safety Invariants

1. **Deterministic Execution**:
   - Strictly read-only tools. No mutation, deletion, or creation capabilities exist.
   - Max 2 tool calls allowed per question (`AI_TOOL_CALL_MAX = 2`).
   - Hard execution timeout per tool call (`AI_TOOL_EXECUTION_TIMEOUT_MS = 5000`).
2. **Sole Authorization Authority**:
   - Express validates authorization *before* executing any tool query against MongoDB.
   - Administrative roles (`SYSTEM_ADMIN`, `HOSPITAL_ADMIN`) are strictly forbidden from clinical tool execution (`403 ADMIN_CLINICAL_ACCESS_RESTRICTED`).
   - Patients can only execute tools on their own records (`403 PATIENT_ISOLATION_VIOLATION`).
   - Doctors require an active clinical assignment or valid unrevoked/unexpired consent matching the required scope (`403 DOCTOR_CLINICAL_ACCESS_RESTRICTED` or `CONSENT_SCOPE_RESTRICTED`).
3. **Zero-PHI Audit Trail**:
   - Audit logs capture `CLINICAL_TOOL_REQUESTED`, `CLINICAL_TOOL_EXECUTED`, `CLINICAL_TOOL_DENIED`, and `CLINICAL_TOOL_FAILURE`.
   - Audit metadata includes tool name, argument keys, result counts, and durations. Question text, medical records, notes, and diagnoses are strictly excluded.
