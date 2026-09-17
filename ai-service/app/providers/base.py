"""Base interface for embedding providers."""
from abc import ABC, abstractmethod
from typing import List


class EmbeddingProvider(ABC):
    """Abstract base class for all embedding providers."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the vector dimension produced by this provider."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the model identifier."""
        pass

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generate an embedding for a single text query or document string.

        Args:
            text: Input text string.

        Returns:
            List[float]: Normalized embedding vector.
        """
        pass

    @abstractmethod
    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for a batch of text documents.

        Args:
            texts: List of input text strings.

        Returns:
            List[List[float]]: List of normalized embedding vectors.
        """
        pass


class LLMProvider(ABC):
    """Abstract base class for LLM generation providers."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider strategy name."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the LLM model identifier."""
        pass

    @abstractmethod
    async def generate_grounded_answer(
        self,
        question: str,
        evidence: List[dict],
        system_prompt: str
    ) -> str:
        """Generate a clinical answer grounded in provided evidence items.

        Args:
            question: The user's clinical question.
            evidence: List of structured clinical evidence items.
            system_prompt: Grounding instructions and constraints.

        Returns:
            str: Generated textual response.
        """
        pass

    @abstractmethod
    async def select_tools_or_answer(
        self,
        question: str,
        allowed_tools: List[dict],
        system_prompt: str,
        patient_id: str = None
    ) -> dict:
        """Analyze clinical question against permitted tools and return either tool calls or direct answer.

        Args:
            question: The user's clinical question.
            allowed_tools: List of authorized tool definitions with parameter schemas.
            system_prompt: Grounding instructions and tool selection rules.
            patient_id: Optional authoritative patient ID.

        Returns:
            dict: { "type": "tool_call" | "direct_answer", "tool_calls": [...], "answer": "..." }
        """
        pass

    @abstractmethod
    async def plan_agent_step(
        self,
        question: str,
        patient_id: str = None,
        step_number: int = 1,
        retrieved_evidence: List[dict] = None,
        previous_steps: List[dict] = None,
        allowed_tools: List[dict] = None,
        system_prompt: str = ""
    ) -> dict:
        """Decide the next action in a bounded multi-step agent workflow.

        Args:
            question: The user's clinical question.
            patient_id: Authoritative patient context ID.
            step_number: Current step iteration (1-based).
            retrieved_evidence: Accumulated clinical evidence so far.
            previous_steps: List of prior step summaries.
            allowed_tools: Authorized read-only clinical tool definitions.
            system_prompt: Agent rules, grounding requirements, and safety boundaries.

        Returns:
            dict: { "action": "TOOL_CALL" | "FINAL", "tool": str, "arguments": dict, "answer": str, "citations": list }
        """
        pass



