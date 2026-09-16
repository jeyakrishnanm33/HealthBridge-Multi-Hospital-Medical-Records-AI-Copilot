"""Internal search endpoints."""
from fastapi import APIRouter, Depends, status

from app.routes.auth import verify_internal_service_key
from app.schemas.search import SearchRequest, SearchResponse

router = APIRouter(
    prefix="/internal/search",
    tags=["Internal Search"],
    dependencies=[Depends(verify_internal_service_key)]
)


@router.post("", response_model=SearchResponse, status_code=status.HTTP_200_OK)
async def semantic_search(
    request: SearchRequest
):
    """Execute semantic retrieval over authorized clinical vectors."""
    from app.main import app_state
    return await app_state.search_service.search(request)
