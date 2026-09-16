"""Indexing service coordinating chunking, embedding, and vector persistence."""
from typing import List
from datetime import datetime, timezone

from app.schemas.indexing import IndexRecordRequest, IndexResponse, BatchIndexResponse, DeleteIndexResponse
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.vector_store.base import VectorStore, VectorRecord


class IndexingService:
    """Service to normalize, chunk, embed, and index clinical documents."""

    def __init__(
        self,
        vector_store: VectorStore,
        embedding_service: EmbeddingService,
        chunking_service: ChunkingService
    ):
        self._vector_store = vector_store
        self._embedding_service = embedding_service
        self._chunking_service = chunking_service

    async def index_record(self, record: IndexRecordRequest) -> IndexResponse:
        """Index or re-index a single medical record safely."""
        # Step 1: Remove existing chunks to prevent duplicates on update
        await self._vector_store.delete_by_record_id(record.medicalRecordId)

        # Step 2: Chunk the record
        chunks = self._chunking_service.chunk_record(record)
        if not chunks:
            return IndexResponse(medicalRecordId=record.medicalRecordId, indexedChunks=0)

        # Step 3: Embed chunks
        texts = [c.text for c in chunks]
        embeddings = await self._embedding_service.get_embeddings(texts)

        # Step 4: Build VectorRecords
        now_iso = datetime.now(timezone.utc).isoformat()
        vector_records: List[VectorRecord] = []
        for chunk, vec in zip(chunks, embeddings):
            vector_records.append(
                VectorRecord(
                    chunk_id=chunk.chunk_id,
                    medical_record_id=chunk.medical_record_id,
                    patient_id=chunk.patient_id,
                    hospital_id=chunk.hospital_id,
                    doctor_id=chunk.doctor_id,
                    record_type=chunk.record_type,
                    record_date=chunk.record_date,
                    vector=vec,
                    created_at=now_iso
                )
            )

        # Step 5: Store in VectorStore
        inserted = await self._vector_store.insert(vector_records)
        return IndexResponse(
            medicalRecordId=record.medicalRecordId,
            indexedChunks=inserted
        )

    async def batch_index(self, records: List[IndexRecordRequest]) -> BatchIndexResponse:
        """Batch index multiple medical records."""
        total_chunks = 0
        for rec in records:
            res = await self.index_record(rec)
            total_chunks += res.indexedChunks

        return BatchIndexResponse(
            totalRecords=len(records),
            totalChunks=total_chunks
        )

    async def delete_record(self, medical_record_id: str) -> DeleteIndexResponse:
        """Delete all vectors for a medical record."""
        deleted = await self._vector_store.delete_by_record_id(medical_record_id)
        return DeleteIndexResponse(
            medicalRecordId=medical_record_id,
            deletedChunks=deleted
        )
