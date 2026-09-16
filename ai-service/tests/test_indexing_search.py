"""Tests for Indexing, Re-indexing, Deletion, and Metadata Filtered Search."""
import pytest
from app.providers.embedding_provider import MockEmbeddingProvider
from app.vector_store.memory_store import MemoryVectorStore
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.indexing_service import IndexingService
from app.services.search_service import SearchService
from app.schemas.indexing import IndexRecordRequest
from app.schemas.search import SearchRequest, SearchFiltersPayload


@pytest.fixture
def test_stack():
    """Setup isolated service stack for testing."""
    provider = MockEmbeddingProvider(dimension=512)
    embedding_service = EmbeddingService(provider)
    vector_store = MemoryVectorStore()
    chunking_service = ChunkingService()
    indexing_service = IndexingService(
        vector_store=vector_store,
        embedding_service=embedding_service,
        chunking_service=chunking_service
    )
    search_service = SearchService(
        vector_store=vector_store,
        embedding_service=embedding_service
    )
    return {
        "vector_store": vector_store,
        "indexing_service": indexing_service,
        "search_service": search_service
    }


@pytest.mark.asyncio
async def test_indexing_and_reindexing(test_stack):
    """Indexing adds vectors, re-indexing replaces without duplicating."""
    idx = test_stack["indexing_service"]
    store = test_stack["vector_store"]

    record = IndexRecordRequest(
        medicalRecordId="rec_101",
        patientId="pat_101",
        hospitalId="hosp_101",
        doctorId="doc_101",
        recordType="VISIT",
        recordDate="2026-03-01",
        data={"reasonForVisit": "Initial consultation for migraine headaches"}
    )

    res1 = await idx.index_record(record)
    assert res1.success is True
    assert res1.indexedChunks >= 1
    assert await store.count() == res1.indexedChunks

    # Re-index same record with updated clinical content
    record.data["diagnosis"] = "Chronic Migraine with Aura"
    res2 = await idx.index_record(record)
    assert res2.success is True
    assert await store.count() == res2.indexedChunks  # Not doubled


@pytest.mark.asyncio
async def test_record_deletion(test_stack):
    """Deleting a record removes all its vectors."""
    idx = test_stack["indexing_service"]
    store = test_stack["vector_store"]

    record = IndexRecordRequest(
        medicalRecordId="rec_to_delete",
        patientId="pat_101",
        hospitalId="hosp_101",
        doctorId="doc_101",
        recordType="MEDICATION",
        recordDate="2026-03-02",
        data={"drugName": "Sumatriptan", "dosage": "50mg"}
    )
    await idx.index_record(record)
    assert await store.count() >= 1

    del_res = await idx.delete_record("rec_to_delete")
    assert del_res.success is True
    assert del_res.deletedChunks >= 1
    assert await store.count() == 0


@pytest.mark.asyncio
async def test_semantic_search_and_metadata_filtering(test_stack):
    """Search correctly filters across patientId, hospitalId, recordTypes, and date ranges."""
    idx = test_stack["indexing_service"]
    search = test_stack["search_service"]

    # Record 1: Patient A at Hospital 1 (Hypertension)
    await idx.index_record(IndexRecordRequest(
        medicalRecordId="rec_patA_01",
        patientId="pat_A",
        hospitalId="hosp_1",
        doctorId="doc_1",
        recordType="DIAGNOSIS",
        recordDate="2026-01-15",
        data={"description": "Essential hypertension stage 2", "notes": "High blood pressure readings"}
    ))

    # Record 2: Patient A at Hospital 1 (Asthma)
    await idx.index_record(IndexRecordRequest(
        medicalRecordId="rec_patA_02",
        patientId="pat_A",
        hospitalId="hosp_1",
        doctorId="doc_1",
        recordType="VISIT",
        recordDate="2026-02-20",
        data={"reasonForVisit": "Wheezing and shortness of breath", "diagnosis": "Bronchial Asthma"}
    ))

    # Record 3: Patient B at Hospital 2 (Hypertension)
    await idx.index_record(IndexRecordRequest(
        medicalRecordId="rec_patB_01",
        patientId="pat_B",
        hospitalId="hosp_2",
        doctorId="doc_2",
        recordType="DIAGNOSIS",
        recordDate="2026-03-05",
        data={"description": "Hypertensive heart disease", "notes": "Blood pressure elevated"}
    ))

    # Query 1: Search Patient A only for hypertension
    res1 = await search.search(SearchRequest(
        query="hypertension blood pressure",
        filters=SearchFiltersPayload(patientId="pat_A")
    ))
    record_ids_1 = [r.medicalRecordId for r in res1.results]
    assert "rec_patA_01" in record_ids_1
    assert "rec_patB_01" not in record_ids_1  # Strict isolation preserved!

    # Query 2: Filter by recordType VISIT for Patient A
    res2 = await search.search(SearchRequest(
        query="breathing respiratory",
        filters=SearchFiltersPayload(patientId="pat_A", recordTypes=["VISIT"])
    ))
    assert len(res2.results) == 1
    assert res2.results[0].medicalRecordId == "rec_patA_02"
    assert res2.results[0].recordType == "VISIT"

    # Query 3: Filter by date range
    res3 = await search.search(SearchRequest(
        query="hypertension",
        filters=SearchFiltersPayload(fromDate="2026-03-01", toDate="2026-03-31")
    ))
    record_ids_3 = [r.medicalRecordId for r in res3.results]
    assert "rec_patB_01" in record_ids_3
    assert "rec_patA_01" not in record_ids_3
