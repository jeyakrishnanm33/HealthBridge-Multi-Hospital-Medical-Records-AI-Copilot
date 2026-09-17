"""Pydantic schemas for RAG clinical assistant request and response validation."""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ClinicalEvidenceItem(BaseModel):
    """Structured clinical evidence item passed from Express backend."""
    recordId: str = Field(..., description="Authoritative MongoDB record ID")
    recordType: str = Field(..., description="Discriminator record type (VISIT, DIAGNOSIS, etc.)")
    recordDate: Optional[str] = Field(default=None, description="ISO timestamp or date string")
    hospitalName: Optional[str] = Field(default=None, description="Source hospital facility name")
    doctorName: Optional[str] = Field(default=None, description="Authoring clinician name/specialization")
    clinicalContent: Dict[str, Any] = Field(default_factory=dict, description="Structured clinical payload")
    score: Optional[float] = Field(default=None, description="Cosine similarity score from vector retrieval")


class RAGAnswerRequest(BaseModel):
    """Request payload for internal RAG answer generation."""
    question: str = Field(..., min_length=3, max_length=1000, description="Natural language clinical question")
    patientId: Optional[str] = Field(default=None, description="Authoritative patient identifier")
    evidence: List[ClinicalEvidenceItem] = Field(default_factory=list, description="Hydrated authorized evidence items")


class EvidenceSource(BaseModel):
    """Clean citation source for frontend evidence cards."""
    recordId: str
    recordType: str
    recordDate: Optional[str] = None
    relevanceScore: Optional[float] = None
    hospitalName: Optional[str] = None


class RAGAnswerMetadata(BaseModel):
    """Operational generation metadata."""
    retrievedCount: int
    provider: str
    model: str


class RAGAnswerResponse(BaseModel):
    """Structured response returned to Express backend."""
    answer: str = Field(..., description="Grounded clinical answer or insufficient evidence statement")
    grounded: bool = Field(..., description="True if answer is supported by retrieved evidence")
    sources: List[EvidenceSource] = Field(default_factory=list, description="Citations of utilized records")
    metadata: RAGAnswerMetadata = Field(..., description="Operational metadata")
