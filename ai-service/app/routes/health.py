"""Health check endpoints."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.config.settings import Settings, get_settings
from app.vector_store.base import VectorStore

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "healthbridge-ai-service"
    environment: str
    embeddingProvider: str
    embeddingModel: str
    vectorStoreType: str
    totalVectors: int


@router.get("/health", response_model=HealthResponse)
async def health_check(
    settings: Settings = Depends(get_settings),
):
    from app.main import app_state
    count = await app_state.vector_store.count() if hasattr(app_state, "vector_store") else 0
    return HealthResponse(
        status="healthy",
        environment=settings.ENV,
        embeddingProvider=settings.EMBEDDING_PROVIDER,
        embeddingModel=settings.EMBEDDING_MODEL,
        vectorStoreType=settings.VECTOR_STORE,
        totalVectors=count
    )
