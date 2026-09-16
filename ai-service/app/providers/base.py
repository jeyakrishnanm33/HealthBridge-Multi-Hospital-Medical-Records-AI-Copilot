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
