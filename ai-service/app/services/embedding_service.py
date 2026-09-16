"""Embedding service managing provider interactions."""
from typing import List
from app.providers.base import EmbeddingProvider


class EmbeddingService:
    """Service to generate embeddings using the configured provider."""

    def __init__(self, provider: EmbeddingProvider):
        self._provider = provider

    @property
    def provider(self) -> EmbeddingProvider:
        return self._provider

    async def get_embedding(self, text: str) -> List[float]:
        """Embed a single text string."""
        return await self._provider.embed_text(text)

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of text strings."""
        return await self._provider.embed_documents(texts)
