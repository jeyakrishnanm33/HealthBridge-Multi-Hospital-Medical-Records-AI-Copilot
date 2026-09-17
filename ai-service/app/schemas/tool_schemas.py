"""Pydantic schemas for Clinical Tool Calling & Selection."""
from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field


class ToolDefinition(BaseModel):
    """Schema for a permitted read-only clinical tool."""
    name: str = Field(..., description="Unique tool identifier (e.g., get_medications)")
    description: str = Field(..., description="Tool clinical retrieval purpose")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="JSON Schema for tool arguments")


class ToolCall(BaseModel):
    """Structured tool execution request from the model."""
    tool: str = Field(..., description="Target tool name")
    arguments: Dict[str, Any] = Field(default_factory=dict, description="Validated arguments dictionary")


class ToolSelectionRequest(BaseModel):
    """Payload for internal tool selection."""
    question: str = Field(..., min_length=3, max_length=1000, description="Natural language clinical question")
    patientId: Optional[str] = Field(default=None, description="Authoritative patient identifier")
    allowedTools: List[ToolDefinition] = Field(default_factory=list, description="Permitted tools for current scope")


class ToolSelectionResponse(BaseModel):
    """Structured response containing either requested tool calls or direct grounded response."""
    type: Literal["tool_call", "direct_answer"] = Field(..., description="Response type")
    toolCalls: List[ToolCall] = Field(default_factory=list, description="List of structured tool execution requests")
    answer: Optional[str] = Field(default=None, description="Direct answer text if no tools needed")
    grounded: bool = Field(default=True, description="Grounding status indicator")
