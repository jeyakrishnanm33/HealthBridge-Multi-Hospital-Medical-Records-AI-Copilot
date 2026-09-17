"""Internal Tool Calling & Selection Routes."""
from fastapi import APIRouter, Depends, status

from app.routes.auth import verify_internal_service_key
from app.schemas.tool_schemas import ToolSelectionRequest, ToolSelectionResponse

router = APIRouter(
    prefix="/internal/rag",
    tags=["Internal RAG Tool Selection"],
    dependencies=[Depends(verify_internal_service_key)]
)


@router.post("/select-tools", response_model=ToolSelectionResponse, status_code=status.HTTP_200_OK)
async def select_tools_endpoint(
    request: ToolSelectionRequest
):
    """Analyze clinical question against permitted tools and return structured tool calls or direct answer."""
    from app.main import app_state
    from app.services.rag_service import SYSTEM_PROMPT

    allowed_tool_dicts = [t.model_dump() for t in request.allowedTools]
    result = await app_state.llm_provider.select_tools_or_answer(
        question=request.question,
        allowed_tools=allowed_tool_dicts,
        system_prompt=SYSTEM_PROMPT,
        patient_id=request.patientId
    )

    return ToolSelectionResponse(
        type=result.get("type", "direct_answer"),
        toolCalls=result.get("toolCalls", []),
        answer=result.get("answer"),
        grounded=result.get("grounded", True)
    )
