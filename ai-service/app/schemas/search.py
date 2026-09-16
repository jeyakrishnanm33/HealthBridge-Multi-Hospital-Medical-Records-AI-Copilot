"""Pydantic schemas for semantic clinical search."""
from typing import List, Optional
from pydantic import BaseModel, Field


class SearchFiltersPayload(BaseModel):
    """Filter criteria applied during semantic retrieval."""
    patientId: Optional[str] = Field(default=None, description="Patient Profile ID scope")
    hospitalId: Optional[str] = Field(default=None, description="Hospital ID scope")
    doctorId: Optional[str] = Field(default=None, description="Doctor Profile ID scope")
    recordTypes: Optional[List[str]] = Field(default=None, description="Subset of record types to search")
    fromDate: Optional[str] = Field(default=None, description="Lower bound date string")
    toDate: Optional[str] = Field(default=None, description="Upper bound date string")
    limit: Optional[int] = Field(default=10, ge=1, le=50, description="Max results")


class SearchRequest(BaseModel):
    """Search request containing query and filters."""
    query: str = Field(min_length=1, max_length=500, description="Search query text")
    filters: Optional[SearchFiltersPayload] = Field(default_factory=SearchFiltersPayload)


class SearchResultItem(BaseModel):
    """Identifiers and relevance score for a retrieved clinical record."""
    medicalRecordId: str
    chunkId: str
    recordType: str
    recordDate: str
    score: float


class SearchResponse(BaseModel):
    """Semantic search response payload."""
    query: str
    totalResults: int
    results: List[SearchResultItem]
