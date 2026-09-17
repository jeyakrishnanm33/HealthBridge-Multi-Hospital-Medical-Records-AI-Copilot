"""
Pydantic Schemas for Multi-Step Agent Orchestration
"""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from app.schemas.tool_schemas import ToolDefinition

AgentStepAction = Literal["TOOL_CALL", "FINAL"]

class AgentStepDecision(BaseModel):
    """
    Structured step decision from the LLM planner.
    """
    action: AgentStepAction = Field(
        ...,
        description="Action to take: 'TOOL_CALL' to request clinical data or 'FINAL' to output grounded response."
    )
    tool: Optional[str] = Field(
        None,
        description="Name of the selected clinical tool if action is 'TOOL_CALL'."
    )
    arguments: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Arguments for the selected clinical tool."
    )
    answer: Optional[str] = Field(
        None,
        description="Final answer if action is 'FINAL'."
    )
    citations: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="List of cited records if action is 'FINAL'."
    )
    thoughtSummary: Optional[str] = Field(
        None,
        description="Safe high-level intent summary (never reveals raw reasoning or secrets)."
    )

class AgentPlanStepRecord(BaseModel):
    """
    Record of a previous agent step.
    """
    stepNumber: int
    tool: Optional[str] = None
    resultCount: Optional[int] = None
    status: Optional[str] = None

class AgentPlanRequest(BaseModel):
    """
    Input payload for requesting the next agent step decision.
    """
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="User's natural language clinical question."
    )
    patientId: Optional[str] = Field(
        None,
        description="Target patient context ID."
    )
    stepNumber: int = Field(
        1,
        ge=1,
        le=10,
        description="Current step index (1-based)."
    )
    retrievedEvidence: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Accumulated clinical evidence from previously executed tools."
    )
    previousSteps: List[AgentPlanStepRecord] = Field(
        default_factory=list,
        description="Summary of previous steps taken in this workflow."
    )
    allowedTools: List[ToolDefinition] = Field(
        default_factory=list,
        description="List of authorized read-only clinical tools available for selection."
    )

class AgentPlanResponse(BaseModel):
    """
    Response returned by the LLM planner endpoint.
    """
    decision: AgentStepDecision
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Execution metadata such as provider, model, tokens."
    )
