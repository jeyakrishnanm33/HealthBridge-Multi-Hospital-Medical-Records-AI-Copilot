"""Tests for FastAPI HTTP endpoints and internal authentication."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app, app_state
from app.config.settings import get_settings


@pytest.fixture(autouse=True)
async def reset_store():
    """Reset vector store before each test."""
    await app_state.vector_store.clear()


@pytest.mark.asyncio
async def test_health_endpoint_public():
    """GET /health must return 200 without authentication."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "healthbridge-ai-service"
    assert "embeddingProvider" in data
    assert "totalVectors" in data


@pytest.mark.asyncio
async def test_internal_auth_enforcement():
    """Internal endpoints must reject requests without valid X-Internal-Service-Key."""
    settings = get_settings()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. No key -> 401
        res_no_key = await ac.post("/internal/search", json={"query": "test"})
        assert res_no_key.status_code == 401

        # 2. Wrong key -> 401
        res_wrong_key = await ac.post(
            "/internal/search",
            headers={"X-Internal-Service-Key": "invalid_wrong_key"},
            json={"query": "test"}
        )
        assert res_wrong_key.status_code == 401

        # 3. Valid key -> 200
        res_valid = await ac.post(
            "/internal/search",
            headers={"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY},
            json={"query": "test"}
        )
        assert res_valid.status_code == 200


@pytest.mark.asyncio
async def test_api_index_and_search_lifecycle():
    """End-to-end API lifecycle: index, search, delete."""
    settings = get_settings()
    headers = {"X-Internal-Service-Key": settings.INTERNAL_SERVICE_KEY}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Index a record
        index_res = await ac.post(
            "/internal/index",
            headers=headers,
            json={
                "medicalRecordId": "rec_api_01",
                "patientId": "pat_api_01",
                "hospitalId": "hosp_api_01",
                "doctorId": "doc_api_01",
                "recordType": "VISIT",
                "recordDate": "2026-03-10",
                "data": {
                    "reasonForVisit": "Severe chronic migraine and photophobia",
                    "diagnosis": "Migraine without aura"
                }
            }
        )
        assert index_res.status_code == 200
        assert index_res.json()["success"] is True
        assert index_res.json()["indexedChunks"] >= 1

        # 2. Search for the record
        search_res = await ac.post(
            "/internal/search",
            headers=headers,
            json={
                "query": "migraine headache photophobia",
                "filters": {
                    "patientId": "pat_api_01"
                }
            }
        )
        assert search_res.status_code == 200
        search_data = search_res.json()
        assert search_data["totalResults"] >= 1
        assert search_data["results"][0]["medicalRecordId"] == "rec_api_01"
        assert search_data["results"][0]["score"] > 0

        # 3. Batch indexing
        batch_res = await ac.post(
            "/internal/index/batch",
            headers=headers,
            json={
                "records": [
                    {
                        "medicalRecordId": "rec_api_02",
                        "patientId": "pat_api_01",
                        "hospitalId": "hosp_api_01",
                        "doctorId": "doc_api_01",
                        "recordType": "MEDICATION",
                        "recordDate": "2026-03-11",
                        "data": {"drugName": "Topiramate 25mg"}
                    }
                ]
            }
        )
        assert batch_res.status_code == 200
        assert batch_res.json()["totalRecords"] == 1

        # 4. Delete the record
        del_res = await ac.delete(
            "/internal/index/rec_api_01",
            headers=headers
        )
        assert del_res.status_code == 200
        assert del_res.json()["deletedChunks"] >= 1
