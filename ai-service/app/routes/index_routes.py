"""Internal indexing endpoints."""
from fastapi import APIRouter, Depends, status

from app.routes.auth import verify_internal_service_key
from app.schemas.indexing import (
    IndexRecordRequest,
    IndexResponse,
    BatchIndexRequest,
    BatchIndexResponse,
    DeleteIndexResponse,
)

router = APIRouter(
    prefix="/internal/index",
    tags=["Internal Indexing"],
    dependencies=[Depends(verify_internal_service_key)]
)


@router.post("", response_model=IndexResponse, status_code=status.HTTP_200_OK)
async def index_medical_record(
    record: IndexRecordRequest
):
    """Index or re-index a single clinical record."""
    from app.main import app_state
    return await app_state.indexing_service.index_record(record)


@router.post("/batch", response_model=BatchIndexResponse, status_code=status.HTTP_200_OK)
async def batch_index_medical_records(
    batch: BatchIndexRequest
):
    """Batch index multiple clinical records."""
    from app.main import app_state
    return await app_state.indexing_service.batch_index(batch.records)


@router.delete("/{medical_record_id}", response_model=DeleteIndexResponse, status_code=status.HTTP_200_OK)
async def delete_medical_record_index(
    medical_record_id: str
):
    """Remove all vectors associated with a medical record."""
    from app.main import app_state
    return await app_state.indexing_service.delete_record(medical_record_id)
