"""In-memory Vector Store implementation with cosine similarity and metadata filtering."""
import asyncio
from typing import Dict, List, Optional
import numpy as np

from app.vector_store.base import VectorStore, VectorRecord, SearchFilters, SearchResult


class MemoryVectorStore(VectorStore):
    """In-memory vector store utilizing NumPy for cosine similarity computation."""

    def __init__(self):
        # Key: chunk_id, Value: VectorRecord
        self._records: Dict[str, VectorRecord] = {}
        self._lock = asyncio.Lock()

    async def insert(self, records: List[VectorRecord]) -> int:
        """Insert or replace vector records."""
        async with self._lock:
            for rec in records:
                self._records[rec.chunk_id] = rec
            return len(records)

    async def delete_by_record_id(self, medical_record_id: str) -> int:
        """Delete all chunks belonging to the given medical record ID."""
        async with self._lock:
            to_delete = [
                chunk_id for chunk_id, rec in self._records.items()
                if rec.medical_record_id == medical_record_id
            ]
            for chunk_id in to_delete:
                del self._records[chunk_id]
            return len(to_delete)

    async def search(
        self,
        query_vector: List[float],
        filters: SearchFilters,
        limit: int = 10
    ) -> List[SearchResult]:
        """Perform cosine similarity search with strict metadata filtering."""
        async with self._lock:
            if not self._records:
                return []

            candidate_records: List[VectorRecord] = []

            # Step 1: Metadata filtering
            for rec in self._records.values():
                if filters.patient_id and rec.patient_id != filters.patient_id:
                    continue
                if filters.hospital_id and rec.hospital_id != filters.hospital_id:
                    continue
                if filters.doctor_id and rec.doctor_id != filters.doctor_id:
                    continue
                if filters.record_types and rec.record_type not in filters.record_types:
                    continue
                if filters.from_date and rec.record_date < filters.from_date:
                    continue
                if filters.to_date and rec.record_date > filters.to_date:
                    continue

                candidate_records.append(rec)

            if not candidate_records:
                return []

            # Step 2: Compute cosine similarity
            q_vec = np.array(query_vector, dtype=np.float64)
            q_norm = np.linalg.norm(q_vec)
            if q_norm > 0:
                q_vec = q_vec / q_norm

            doc_matrix = np.array([r.vector for r in candidate_records], dtype=np.float64)
            # Normalize doc matrix rows
            doc_norms = np.linalg.norm(doc_matrix, axis=1, keepdims=True)
            doc_norms[doc_norms == 0] = 1.0
            norm_doc_matrix = doc_matrix / doc_norms

            # Dot product is cosine similarity
            scores = np.dot(norm_doc_matrix, q_vec)

            # Build results
            results: List[SearchResult] = []
            for i, rec in enumerate(candidate_records):
                raw_score = float(scores[i])
                # Clamp score to [0.0, 1.0] for clean confidence interpretation
                clamped_score = max(0.0, min(1.0, (raw_score + 1.0) / 2.0 if raw_score < 0 else raw_score))
                results.append(SearchResult(
                    medical_record_id=rec.medical_record_id,
                    chunk_id=rec.chunk_id,
                    record_type=rec.record_type,
                    record_date=rec.record_date,
                    score=round(clamped_score, 4)
                ))

            # Step 3: Sort by score descending and deduplicate by medical_record_id preserving highest score
            results.sort(key=lambda x: x.score, reverse=True)

            # Deduplicate by medical_record_id while keeping highest chunk score
            seen_records = set()
            deduped_results: List[SearchResult] = []
            for r in results:
                if r.medical_record_id not in seen_records:
                    seen_records.add(r.medical_record_id)
                    deduped_results.append(r)
                if len(deduped_results) >= limit:
                    break

            return deduped_results

    async def count(self) -> int:
        """Return total vector count."""
        async with self._lock:
            return len(self._records)

    async def clear(self) -> None:
        """Clear all stored vectors."""
        async with self._lock:
            self._records.clear()
