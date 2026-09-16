"""Embedding provider implementations for mock and OpenAI strategies."""
import hashlib
import math
import re
from typing import List, Optional
import httpx
import numpy as np

from app.providers.base import EmbeddingProvider
from app.config.settings import Settings


class MockEmbeddingProvider(EmbeddingProvider):
    """Deterministic, zero-dependency embedding provider for local testing and offline use.

    Produces unit-normalized vectors where semantically overlapping terms have high cosine similarity.
    """

    def __init__(self, dimension: int = 1536, model_name: str = "mock-clinical-embed-1536"):
        self._dimension = dimension
        self._model_name = model_name

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    def _generate_vector(self, text: str) -> List[float]:
        """Generate a deterministic normalized vector for text."""
        if not text or not text.strip():
            # Return zero vector with unit norm on first dimension for empty text
            vec = [0.0] * self._dimension
            vec[0] = 1.0
            return vec

        # Initialize dense vector accumulator
        vec = np.zeros(self._dimension, dtype=np.float64)

        # Normalize text and tokenize into words and bi-grams
        tokens = re.findall(r"\w+", text.lower())
        if not tokens:
            vec[0] = 1.0
            return vec.tolist()

        # Add unigrams
        for token in tokens:
            # Hash token to a bucket index
            token_hash = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
            idx = token_hash % self._dimension
            sign = 1.0 if (token_hash // self._dimension) % 2 == 0 else -1.0
            vec[idx] += sign * 1.0

        # Add bigrams for local semantic context
        for i in range(len(tokens) - 1):
            bigram = f"{tokens[i]}_{tokens[i+1]}"
            bigram_hash = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
            idx = bigram_hash % self._dimension
            sign = 1.0 if (bigram_hash // self._dimension) % 2 == 0 else -1.0
            vec[idx] += sign * 0.75

        # Also add whole string hash signature to break ties
        full_hash = int(hashlib.md5(text.encode("utf-8")).hexdigest(), 16)
        for i in range(8):
            idx = (full_hash + i * 97) % self._dimension
            vec[idx] += 0.2

        # L2 normalize
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return [float(x) for x in vec]

    async def embed_text(self, text: str) -> List[float]:
        return self._generate_vector(text)

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._generate_vector(t) for t in texts]


class OpenAIEmbeddingProvider(EmbeddingProvider):
    """OpenAI Embedding Provider using official REST endpoints."""

    def __init__(
        self,
        api_key: Optional[str],
        model: str = "text-embedding-3-small",
        dimension: int = 1536
    ):
        if not api_key or not api_key.strip():
            raise ValueError(
                "OpenAIEmbeddingProvider requires a valid OPENAI_API_KEY. "
                "Ensure OPENAI_API_KEY is configured in your environment or switch EMBEDDING_PROVIDER=mock."
            )
        self._api_key = api_key
        self._model = model
        self._dimension = dimension
        self._base_url = "https://api.openai.com/v1/embeddings"

    @property
    def dimension(self) -> int:
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model

    async def embed_text(self, text: str) -> List[float]:
        results = await self.embed_documents([text])
        return results[0]

    async def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self._base_url,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self._model,
                    "input": texts,
                    "dimensions": self._dimension
                }
            )

            if response.status_code != 200:
                raise RuntimeError(
                    f"OpenAI Embedding API error ({response.status_code}): {response.text}"
                )

            data = response.json()
            embeddings = [item["embedding"] for item in data["data"]]
            return embeddings


def get_embedding_provider(settings: Settings) -> EmbeddingProvider:
    """Factory to instantiate the configured embedding provider."""
    provider_type = (settings.EMBEDDING_PROVIDER or "").lower().strip()

    if provider_type == "mock":
        return MockEmbeddingProvider(
            dimension=settings.EMBEDDING_DIMENSION,
            model_name=settings.EMBEDDING_MODEL
        )
    elif provider_type == "openai":
        return OpenAIEmbeddingProvider(
            api_key=settings.OPENAI_API_KEY,
            model=settings.EMBEDDING_MODEL,
            dimension=settings.EMBEDDING_DIMENSION
        )
    else:
        raise ValueError(
            f"Unsupported or missing EMBEDDING_PROVIDER '{provider_type}'. Supported: ['mock', 'openai']"
        )
