"""Integration tests for internal RAG endpoints and service."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.config.settings import get_settings

settings = get_settings()
AUTH_HEADERS = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY}


@pytest.mark.asyncio
async def test_rag_endpoint_auth_enforcement():
    """POST /internal/rag/answer must reject unauthorized callers with 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # No header
        resp = await client.post(
            "/internal/rag/answer",
            json={"question": "What is my latest blood pressure?", "evidence": []}
        )
        assert resp.status_code == 401

        # Invalid header
        resp_invalid = await client.post(
            "/internal/rag/answer",
            headers={"X-Internal-Service-Key": "invalid_wrong_secret"},
            json={"question": "What is my latest blood pressure?", "evidence": []}
        )
        assert resp_invalid.status_code == 401


@pytest.mark.asyncio
async def test_rag_endpoint_empty_evidence_flow():
    """POST /internal/rag/answer with empty evidence returns ungrounded insufficient statement."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/internal/rag/answer",
            headers=AUTH_HEADERS,
            json={
                "question": "What are my recent lab results?",
                "patientId": "patient-123",
                "evidence": []
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["grounded"] is False
        assert len(data["sources"]) == 0
        assert "insufficient" in data["answer"].lower()
        assert data["metadata"]["retrievedCount"] == 0


@pytest.mark.asyncio
async def test_rag_endpoint_grounded_answer_with_sources():
    """POST /internal/rag/answer generates grounded answer and citation sources."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        evidence = [
            {
                "recordId": "rec_lab_99",
                "recordType": "LAB_RESULT",
                "recordDate": "2026-09-10T08:30:00.000Z",
                "hospitalName": "St. Jude Hospital",
                "doctorName": "Dr. Sarah Adams",
                "clinicalContent": {
                    "testName": "HbA1c",
                    "value": "7.4",
                    "unit": "%",
                    "interpretation": "ABNORMAL"
                },
                "score": 0.94
            }
        ]

        resp = await client.post(
            "/internal/rag/answer",
            headers=AUTH_HEADERS,
            json={
                "question": "What was my recent HbA1c lab result?",
                "patientId": "pat_1",
                "evidence": evidence
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["grounded"] is True
        assert len(data["sources"]) == 1
        assert data["sources"][0]["recordId"] == "rec_lab_99"
        assert data["sources"][0]["recordType"] == "LAB_RESULT"
        assert data["sources"][0]["relevanceScore"] == 0.94
        assert "HbA1c" in data["answer"]
        assert "7.4" in data["answer"]
