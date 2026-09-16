"""Base definitions and abstract interface for Vector Stores."""
from abc import ABC, abstractmethod
from typing import List, Optional
from pydantic import BaseModel, Field


class VectorRecord(BaseModel):
    """Represents a vector chunk stored with isolation metadata."""
    chunk_id: str = Field(description="Unique deterministic chunk ID")
    medical_record_id: str = Field(description="Parent Medical Record MongoDB ID")
    patient_id: str = Field(description="Patient Profile ID")
    hospital_id: str = Field(description="Hospital ID")
    doctor_id: str = Field(description="Authoring Doctor Profile ID")
    record_type: str = Field(description="Discriminator: VISIT, DIAGNOSIS, etc.")
    record_date: str = Field(description="Record clinical date")
    vector: List[float] = Field(description="Embedding vector")
    created_at: Optional[str] = Field(default=None, description="Timestamp")


class SearchFilters(BaseModel):
    """Metadata filter criteria for vector search."""
    patient_id: Optional[str] = None
    hospital_id: Optional[str] = None
    doctor_id: Optional[str] = None
    record_types: Optional[List[str]] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None


class SearchResult(BaseModel):
    """Result item returned by vector similarity search."""
    medical_record_id: str
    chunk_id: str
    record_type: str
    record_date: str
    score: float


class VectorStore(ABC):
    """Abstract interface for vector database operations."""

    @abstractmethod
    async def insert(self, records: List[VectorRecord]) -> int:
        """Insert or replace vector records in storage."""
        pass

    @abstractmethod
    async def delete_by_record_id(self, medical_record_id: str) -> int:
        """Delete all chunks associated with a medical record ID."""
        pass

    @abstractmethod
    async def search(
        self,
        query_vector: List[float],
        filters: SearchFilters,
        limit: int = 10
    ) -> List[SearchResult]:
        """Perform similarity search with metadata filtering."""
        pass

    @abstractmethod
    async def count(self) -> int:
        """Return total number of vector chunks stored."""
        pass

    @abstractmethod
    async def clear(self) -> None:
        """Clear all stored vectors (primarily for tests)."""
        pass
