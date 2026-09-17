# HealthBridge — Phase 16: Automated AI Evaluation Suite

## 1. Purpose & Scope

The HealthBridge AI Evaluation Suite provides a deterministic, automated evaluation framework verifying that the AI copilot pipeline:
1. **Retrieves relevant records** with high precision, recall, and hit rate.
2. **Enforces authoritative authorization boundaries** across RBAC, patient data isolation, and cross-hospital consent scopes.
3. **Guarantees LLM context isolation** ensuring unauthorized records never reach LLM prompts.
4. **Produces grounded clinical summaries** with verified citations.
5. **Deflects unsupported claims** safely without medical hallucinations.
6. **Selects appropriate tools** within bounded multi-step agent workflows.
7. **Neutralizes prompt injection attempts** without leaking data or bypassing policies.

> [!NOTE]
> **Evaluation Disclaimer**:
> This is a portfolio-scale evaluation suite using synthetic data. It is not a clinical validation system, medical safety certification, or production healthcare evaluation framework.

---

## 2. Evaluation Architecture

The evaluation pipeline evaluates the real Express authorization gateway, tool executor, agent orchestrator, and AI service providers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Evaluation Suite Runner                  │
└────────────────┬───────────────────────────────┬────────────────┘
                 │                               │
                 ▼                               ▼
    ┌─────────────────────────┐     ┌─────────────────────────┐
    │ Express Gateway & RBAC  │     │ FastAPI AI Microservice │
    │ ├─ Assistant Policies   │     │ ├─ Deterministic Tools  │
    │ ├─ Tool Executor        │     │ ├─ Agent Step Planner   │
    │ ├─ Agent Orchestrator   │     │ ├─ RAG Synthesis        │
    │ └─ Citation Gate        │     │ └─ Injection Defenses   │
    └────────────┬────────────┘     └────────────┬────────────┘
                 │                               │
                 ▼                               ▼
    ┌─────────────────────────────────────────────────────────┐
    │             Deterministic Assertions Engine             │
    │ ├─ assertRetrieval (Precision, Recall, Hit Rate)        │
    │ ├─ assertAuthorization (RBAC, Consent, Isolation)       │
    │ ├─ assertSecurityContextIsolation (Zero LLM Leaks)      │
    │ ├─ assertGrounding (Keywords & Citations)               │
    │ ├─ assertUnsupportedClaim (Zero Hallucinations)         │
    │ ├─ assertResponseStructure (Envelope & Zero-PHI Meta)   │
    │ ├─ assertToolSelection (Tool Match & Greeting Deflect)  │
    │ ├─ assertAgentBehavior (Step Sequences & Bounds Limits) │
    │ └─ assertPromptInjectionDefense (Neutralized Attacks)   │
    └────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
    ┌─────────────────────────────────────────────────────────┐
    │           Zero-PHI Metrics Aggregator & Report          │
    │ └─ Overall Pass Rate, Category Breakdown, Timing        │
    └─────────────────────────────────────────────────────────┘
```

---

## 3. Evaluation Dataset

The evaluation suite uses **synthetic fixtures only with ZERO PHI**. It contains 31 discrete evaluation cases across 9 categories with stable IDs:

| Category | Cases | Focus |
| :--- | :--- | :--- |
| `RETRIEVAL` | `RET-001` - `RET-005` | Precision, recall, and hit rate on visits, meds, labs, diagnoses, timeline |
| `AUTHORIZATION` | `AUTH-001` - `AUTH-009` | Same-hospital assigned doctor, unassigned doctor, cross-hospital consent scopes, expired/revoked consent, patient cross-access, admin exclusion |
| `CRITICAL_SECURITY`| `SEC-001` | Unauthorized medical records are completely excluded from candidate LLM context |
| `GROUNDING` | `GROUND-001` - `GROUND-002` | Answers contain verified factual evidence with matching citations |
| `UNSUPPORTED_CLAIMS`| `UNSUP-001` | Safe deflection for missing or unrecorded medical conditions (zero hallucinations) |
| `RESPONSE_STRUCTURE`| `STRUCT-001` | JSON envelope structure, required keys, zero PHI in metadata |
| `TOOL_SELECTION` | `TOOL-001` - `TOOL-007` | Query intent mapped to 6 tools, conversational greeting deflection |
| `AGENT_BEHAVIOR` | `AGENT-001` - `AGENT-003` | Multi-step reasoning sequence, server-side step limits, hallucinated citation stripping |
| `PROMPT_INJECTION` | `INJ-001` - `INJ-002` | Neutralization of system overrides and role escalation attempts |

---

## 4. Critical Security Invariant

The most vital security property evaluated in Phase 16 is:

```
Unauthorized record
       ↓
Express authorization check
       ↓
     DENIED
       ↓
Record NEVER reaches LLM prompt / context
```

### Explicit Test Verification (`SEC-001`):
The evaluation asserts that when a doctor queries a patient's records under a scope-restricted consent (e.g. `VISITS` only), unconsented records (e.g. `LAB_RESULT`) are filtered out during Express pre-execution authorization. The test captures the exact `evidence` payload passed to `aiServiceClient.generateGroundedAnswer` and verifies:

$$\text{unauthorizedRecordId} \notin \text{llmReceivedContext}$$

---

## 5. Metrics & Calculation Formulae

1. **Retrieval Precision**:
   $$\text{Precision} = \frac{\text{Relevant Retrieved Records}}{\text{Total Retrieved Records}}$$

2. **Retrieval Recall**:
   $$\text{Recall} = \frac{\text{Relevant Retrieved Records}}{\text{Expected Relevant Records}}$$

3. **Retrieval Hit Rate**:
   $$\text{Hit Rate} = \frac{\text{Queries with } \ge 1 \text{ Expected Record Retrieved}}{\text{Total Retrieval Queries}}$$

4. **Category Pass Rate**:
   $$\text{Pass Rate} = \frac{\text{Passed Cases}}{\text{Total Cases}} \times 100\%$$

---

## 6. How to Run the Evaluation Suite

### Backend Jest Test Suite
```bash
cd backend
npm test -- tests/aiEvaluation.test.js
```

### Full Backend Integration Suite (All 17 Suites)
```bash
cd backend
npm test -- --runInBand --forceExit
```

### AI Microservice Pytest Suite
```bash
cd ai-service
pytest -v
```

---

## 7. Example Zero-PHI Evaluation Report

```text
====================================================
       HEALTHBRIDGE AI EVALUATION SUITE RESULTS     
====================================================
Total Evaluation Cases: 31
Passed:                 31
Failed:                 0
Overall Pass Rate:      100%
----------------------------------------------------
RETRIEVAL METRICS:
  Precision:            100%
  Recall:               100%
  Hit Rate:             100%
----------------------------------------------------
CATEGORY BREAKDOWN:
  RETRIEVAL             : 5/5 passed (100%)
  AUTHORIZATION         : 9/9 passed (100%)
  CRITICAL_SECURITY     : 1/1 passed (100%)
  GROUNDING             : 2/2 passed (100%)
  UNSUPPORTED_CLAIMS    : 1/1 passed (100%)
  RESPONSE_STRUCTURE    : 1/1 passed (100%)
  TOOL_SELECTION        : 7/7 passed (100%)
  AGENT_BEHAVIOR        : 3/3 passed (100%)
  PROMPT_INJECTION      : 2/2 passed (100%)
====================================================
```
