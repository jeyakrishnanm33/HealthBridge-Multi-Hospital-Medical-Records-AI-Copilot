"""Pydantic schemas for medical record indexing."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IndexRecordRequest(BaseModel):
    """Request payload to index a single medical record."""
    medicalRecordId: str = Field(description="MongoDB Medical Record ID")
    patientId: str = Field(description="Patient ID")
    hospitalId: str = Field(description="Hospital ID")
    doctorId: str = Field(description="Authoring Doctor ID")
    recordType: str = Field(description="Record discriminator (VISIT, DIAGNOSIS, etc.)")
    recordDate: str = Field(description="Clinical event date (ISO string)")
    data: Dict[str, Any] = Field(default_factory=dict, description="Structured clinical payload")


class BatchIndexRequest(BaseModel):
    """Request payload to index multiple medical records."""
    records: List[IndexRecordRequest] = Field(description="List of records to index")


class IndexResponse(BaseModel):
    """Response returned upon indexing a record."""
    success: bool = True
    medicalRecordId: str
    indexedChunks: int


class BatchIndexResponse(BaseModel):
    """Response returned upon batch indexing."""
    success: bool = True
    totalRecords: int
    totalChunks: int


class DeleteIndexResponse(BaseModel):
    """Response returned upon deleting record vectors."""
    success: bool = True
    medicalRecordId: str
    deletedChunks: int
