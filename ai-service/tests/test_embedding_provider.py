"""Tests for embedding provider abstractions and strategies."""
import pytest
import numpy as np

from app.config.settings import Settings
from app.providers.embedding_provider import (
    MockEmbeddingProvider,
    OpenAIEmbeddingProvider,
    get_embedding_provider,
)


@pytest.mark.asyncio
async def test_mock_embedding_provider_dimension_and_norm():
    """Mock provider should return unit-normalized vectors of expected dimension."""
    provider = MockEmbeddingProvider(dimension=1536)
    assert provider.dimension == 1536
    assert provider.model_name == "mock-clinical-embed-1536"

    vec = await provider.embed_text("Patient diagnosed with acute hypertension")
    assert len(vec) == 1536
    norm = np.linalg.norm(vec)
    assert pytest.approx(norm, rel=1e-3) == 1.0


@pytest.mark.asyncio
async def test_mock_embedding_provider_determinism():
    """Identical text must generate identical embeddings."""
    provider = MockEmbeddingProvider(dimension=512)
    text = "Follow up visit for diabetes type 2 management"

    vec1 = await provider.embed_text(text)
    vec2 = await provider.embed_text(text)
    assert vec1 == vec2


@pytest.mark.asyncio
async def test_mock_embedding_provider_batch():
    """Batch document embedding should match individual embeddings."""
    provider = MockEmbeddingProvider(dimension=256)
    texts = [
        "Patient presents with chest pain and shortness of breath",
        "Routine dental checkup and cleaning",
        "Blood pressure recorded at 140/90 mmHg"
    ]

    batch_vecs = await provider.embed_documents(texts)
    assert len(batch_vecs) == 3

    for text, vec in zip(texts, batch_vecs):
        single_vec = await provider.embed_text(text)
        assert vec == single_vec


@pytest.mark.asyncio
async def test_mock_embedding_semantic_overlap():
    """Semantically related phrases should have higher similarity than unrelated phrases."""
    provider = MockEmbeddingProvider(dimension=512)

    query = await provider.embed_text("hypertension and high blood pressure")
    related = await provider.embed_text("patient has severe hypertension with high blood pressure reading")
    unrelated = await provider.embed_text("fractured tibia bone following orthopedic trauma")

    sim_related = np.dot(query, related)
    sim_unrelated = np.dot(query, unrelated)

    assert sim_related > sim_unrelated


def test_openai_provider_missing_key_raises_error():
    """OpenAI provider must fail fast if API key is not supplied."""
    with pytest.raises(ValueError, match="OpenAIEmbeddingProvider requires a valid OPENAI_API_KEY"):
        OpenAIEmbeddingProvider(api_key=None)


def test_get_embedding_provider_factory():
    """Factory must return appropriate provider based on settings."""
    # Mock
    settings_mock = Settings(EMBEDDING_PROVIDER="mock", EMBEDDING_DIMENSION=512)
    provider_mock = get_embedding_provider(settings_mock)
    assert isinstance(provider_mock, MockEmbeddingProvider)
    assert provider_mock.dimension == 512

    # OpenAI with key
    settings_openai = Settings(
        EMBEDDING_PROVIDER="openai",
        OPENAI_API_KEY="sk-test-key",
        EMBEDDING_DIMENSION=1536
    )
    provider_openai = get_embedding_provider(settings_openai)
    assert isinstance(provider_openai, OpenAIEmbeddingProvider)

    # Unsupported in Settings Pydantic schema raises ValidationError
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        Settings(EMBEDDING_PROVIDER="unsupported_xyz")  # type: ignore

    # Direct factory call with dummy object
    class DummySettings:
        EMBEDDING_PROVIDER = "custom_unknown"

    with pytest.raises(ValueError, match="Unsupported or missing EMBEDDING_PROVIDER"):
        get_embedding_provider(DummySettings())  # type: ignore
