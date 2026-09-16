# HealthBridge Phase 12: Embeddings & Semantic Clinical Search

## 1. Executive Summary

Phase 12 introduces the **AI & Semantic Clinical Search foundation** for HealthBridge. It establishes a dedicated, provider-independent semantic indexing and retrieval microservice (`ai-service`) alongside an authorization-aware API gateway in the Express backend.

Crucially, **the vector store and AI service do NOT act as the source of clinical authorization truth**. The Express backend remains the strict security and policy boundary governing RBAC, patient self-access, doctor-patient assignments, multi-hospital isolation, cross-hospital patient consent, and immutable audit trails.

---

## 2. System Architecture

```text
React Frontend (Doctor / Patient)
       │
       ▼ (JWT Authenticated REST API)
Express Backend / API Gateway
       │ ├── Authentication & RBAC (Patient, Doctor, Admin)
       │ ├── Clinical Authorization Policies (Assignments, Affiliations, Consents)
       │ ├── Audit Trail (SEMANTIC_SEARCH_PERFORMED / DENIED - Zero PHI)
       │ └── Domain Event Bus (Async Indexing on Record Create/Update/Delete)
       │
       ▼ (Internal Service Auth: X-Internal-Service-Key)
AI / Search Service (Python + FastAPI)
       ├── Embedding Providers (Mock / OpenAI Abstraction)
       ├── Deterministic Chunking Engine (6 Discriminator Record Types)
       └── Vector Store (In-Memory / Cosine Similarity with Metadata Filters)
              │
              ▼ (Returns record IDs, chunk IDs, discriminator types, similarity scores)
Express Backend hydrates and validates authoritative records from MongoDB
       │
       ▼ (Sanitized Records + Relevance Confidence Scores)
React Frontend
```

---

## 3. Core Principles & Privacy Guarantees

1. **Security Boundary Enforcement**: The React frontend **NEVER** calls the FastAPI AI service directly. All search requests flow through Express where caller identity and clinical permissions are evaluated first.
2. **Administrative Exclusion**: Neither `SYSTEM_ADMIN` nor `HOSPITAL_ADMIN` has access to clinical searches or medical record content, enforcing `ADMIN_CLINICAL_ACCESS_RESTRICTED`.
3. **Patient Data Isolation**: Patients can only search their own records. Cross-patient searches by patients or unauthorized doctors are rejected with `403 Forbidden`.
4. **Cross-Hospital Consent Enforcement**: Doctors can only search cross-hospital records if active, approved, unexpired patient consent exists covering the requested record type scopes.
5. **Zero-PHI Observability**: Search queries containing sensitive clinical terms, symptoms, or diagnoses are **never** placed into audit metadata, error logs, notification payloads, or URL parameters.
6. **Non-Blocking Indexing Failure Semantics**: Failures in the embedding provider, vector database, or AI service network **never** cause clinical transactions (e.g., creating medical records or scheduling appointments) to fail.

---

## 4. Embedding Provider Abstraction

The AI service defines an abstract interface `EmbeddingProvider` allowing seamless swapping between providers via environment variables:

```python
class EmbeddingProvider(ABC):
    @property
    @abstractmethod
    def dimension(self) -> int: ...

    @property
    @abstractmethod
    def model_name(self) -> str: ...

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]: ...

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]: ...
```

### Supported Providers:
* **MockEmbeddingProvider (`mock`)**: Zero-dependency deterministic provider utilizing hashing and n-grams to produce unit-normalized vectors. Ensures fast, offline, and reliable CI test execution without external API keys.
* **OpenAIEmbeddingProvider (`openai`)**: Integrates with OpenAI's `text-embedding-3-small` / `text-embedding-3-large` embedding models.

---

## 5. Clinical Document Representation & Deterministic Chunking

Structured Mongoose discriminators are transformed into deterministic textual representations preserving clinical semantic context:

| Record Discriminator | Formatted Searchable Content |
| :--- | :--- |
| **`VISIT`** | Reason for visit, symptoms, diagnosis, vital signs (BP, HR, temp), clinical notes. |
| **`DIAGNOSIS`** | ICD code, condition description, category, severity, status, clinical notes. |
| **`MEDICATION`** | Medicine name, dosage, frequency, route, duration, instructions. |
| **`LAB_RESULT`** | Test name, category, structured panel results (value, unit, reference range, flag), conclusion. |
| **`PRESCRIPTION`** | Prescribed medications list, dosages, schedules, validity period, instructions. |
| **`DOCUMENT`** | Document type, title, summary, file description, metadata. |

### Chunking Mechanics
* Deterministic chunk IDs: `{medicalRecordId}_chunk_{index}`.
* Every vector record retains isolation metadata: `medical_record_id`, `patient_id`, `hospital_id`, `doctor_id`, `record_type`, and `record_date`.

---

## 6. API Contracts

### AI Service Internal Endpoints (`ai-service/`)

Protected by `X-Internal-Service-Key` header:

* `GET /health`: Public status check and vector store metrics.
* `POST /internal/index`: Index or replace vectors for a clinical record.
* `POST /internal/index/batch`: Bulk index multiple clinical records.
* `DELETE /internal/index/{medicalRecordId}`: Delete vectors for a record.
* `POST /internal/search`: Semantic similarity search with metadata filtering.

### Express Backend Clinical Search (`backend/`)

* **Endpoint**: `POST /api/search/clinical`
* **Headers**: `Authorization: Bearer <JWT>`
* **Request Body**:
  ```json
  {
    "query": "hypertension and elevated blood pressure",
    "patientId": "6aaa9a9edbb1121a74b4c902",
    "recordTypes": ["VISIT", "DIAGNOSIS", "MEDICATION"],
    "fromDate": "2026-01-01",
    "toDate": "2026-12-31",
    "limit": 10
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Clinical search completed successfully",
    "data": {
      "query": "hypertension and elevated blood pressure",
      "totalResults": 3,
      "results": [
        {
          "id": "6aaa...",
          "recordType": "VISIT",
          "recordDate": "2026-02-10T00:00:00.000Z",
          "score": 0.94,
          "chunkId": "6aaa..._chunk_0",
          "diagnosis": "Essential Hypertension Stage 1",
          "doctor": { "fullName": "Dr. Alice Carter", "specialization": "CARDIOLOGY" },
          "hospital": { "name": "General Hospital Alpha" }
        }
      ]
    }
  }
  ```

---

## 7. Verification & Test Suite Summary

* **FastAPI AI Service**: 15 Pytest unit & integration tests passing (`0 failures`).
* **Express Backend Test Suite**: 13 Jest test suites, 336 tests passing (`0 failures`).
* **Frontend Production Build**: Vite production bundle compiled with `0 errors`.
