"""Search service executing semantic queries with metadata filtering."""
from app.schemas.search import SearchRequest, SearchResponse, SearchResultItem
from app.services.embedding_service import EmbeddingService
from app.vector_store.base import VectorStore, SearchFilters


class SearchService:
    """Service to execute semantic retrieval queries."""

    def __init__(
        self,
        vector_store: VectorStore,
        embedding_service: EmbeddingService
    ):
        self._vector_store = vector_store
        self._embedding_service = embedding_service

    async def search(self, request: SearchRequest) -> SearchResponse:
        """Perform semantic search."""
        query_text = request.query.strip()
        if not query_text:
            return SearchResponse(query=request.query, totalResults=0, results=[])

        # Step 1: Embed query
        query_vector = await self._embedding_service.get_embedding(query_text)

        # Step 2: Build search filters
        filters_payload = request.filters
        record_types = [t.upper() for t in filters_payload.recordTypes] if (filters_payload and filters_payload.recordTypes) else None

        search_filters = SearchFilters(
            patient_id=filters_payload.patientId if filters_payload else None,
            hospital_id=filters_payload.hospitalId if filters_payload else None,
            doctor_id=filters_payload.doctorId if filters_payload else None,
            record_types=record_types,
            from_date=filters_payload.fromDate if filters_payload else None,
            to_date=filters_payload.toDate if filters_payload else None,
        )
        limit = filters_payload.limit if (filters_payload and filters_payload.limit) else 10

        # Step 3: Query vector store
        results = await self._vector_store.search(
            query_vector=query_vector,
            filters=search_filters,
            limit=limit
        )

        # Step 4: Map to response items
        items = [
            SearchResultItem(
                medicalRecordId=r.medical_record_id,
                chunkId=r.chunk_id,
                recordType=r.record_type,
                recordDate=r.record_date,
                score=r.score
            )
            for r in results
        ]

        return SearchResponse(
            query=request.query,
            totalResults=len(items),
            results=items
        )
