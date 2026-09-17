"""Internal RAG Clinical Assistant generation routes."""
from fastapi import APIRouter, Depends, status

from app.routes.auth import verify_internal_service_key
from app.schemas.rag_schemas import RAGAnswerRequest, RAGAnswerResponse

router = APIRouter(
    prefix="/internal/rag",
    tags=["Internal RAG Assistant"],
    dependencies=[Depends(verify_internal_service_key)]
)


@router.post("/answer", response_model=RAGAnswerResponse, status_code=status.HTTP_200_OK)
async def generate_rag_answer(
    request: RAGAnswerRequest
):
    """Generate a grounded clinical response from authorized evidence payload."""
    from app.main import app_state
    return await app_state.rag_service.answer_question(request)
