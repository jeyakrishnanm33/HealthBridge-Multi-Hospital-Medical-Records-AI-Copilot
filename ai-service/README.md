# HealthBridge AI & Clinical Search Service

FastAPI-based semantic indexing and retrieval microservice for HealthBridge.

## Architecture

* **Provider Abstraction**: Pluggable embedding providers (`MockEmbeddingProvider`, `OpenAIEmbeddingProvider`).
* **Deterministic Chunking**: Structured representation and chunking for all 6 clinical discriminator types (`VISIT`, `DIAGNOSIS`, `MEDICATION`, `LAB_RESULT`, `PRESCRIPTION`, `DOCUMENT`).
* **Vector Store**: Cosine similarity vector index with strict metadata filtering (`patient_id`, `hospital_id`, `doctor_id`, `record_type`, date ranges).
* **Security & Auth**: Protected via `X-Internal-Service-Key` header. Direct frontend access is prohibited.

## Endpoints

* `GET /health`: Public health check, vector store count, and provider info.
* `POST /internal/index`: Index or replace vectors for a clinical record.
* `POST /internal/index/batch`: Bulk index clinical records.
* `DELETE /internal/index/{medicalRecordId}`: Remove vectors for a clinical record.
* `POST /internal/search`: Semantic similarity search returning IDs and scores.

## Setup & Testing

```bash
pip install -r requirements.txt
pytest tests/ -v
```
