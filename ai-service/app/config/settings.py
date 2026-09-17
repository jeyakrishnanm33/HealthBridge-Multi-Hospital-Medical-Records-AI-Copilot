"""Application configuration module using Pydantic Settings."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Literal, Optional


class Settings(BaseSettings):
    """HealthBridge AI Service Settings."""
    PORT: int = Field(default=8000, description="FastAPI Server Port")
    HOST: str = Field(default="0.0.0.0", description="FastAPI Server Host")
    ENV: str = Field(default="development", description="Environment: development, test, production")

    # Internal authentication key
    INTERNAL_SERVICE_KEY: str = Field(
        default="hb_internal_secret_key_change_in_production_32char",
        description="Internal API authentication secret header"
    )

    # Embedding configuration
    EMBEDDING_PROVIDER: Literal["mock", "openai"] = Field(
        default="mock",
        description="Embedding provider strategy"
    )
    EMBEDDING_MODEL: str = Field(
        default="text-embedding-3-small",
        description="Embedding model name"
    )
    EMBEDDING_DIMENSION: int = Field(
        default=1536,
        description="Vector dimension"
    )
    OPENAI_API_KEY: Optional[str] = Field(
        default=None,
        description="OpenAI API Key (required if EMBEDDING_PROVIDER=openai)"
    )

    # Vector store configuration
    VECTOR_STORE: Literal["memory"] = Field(
        default="memory",
        description="Vector store type"
    )

    # LLM configuration
    LLM_PROVIDER: Literal["mock", "openai"] = Field(
        default="mock",
        description="LLM provider strategy (mock or openai)"
    )
    LLM_MODEL: str = Field(
        default="gpt-4o-mini",
        description="LLM model identifier"
    )
    RAG_MIN_SIMILARITY: float = Field(
        default=0.55,
        description="Minimum cosine similarity threshold for evidence inclusion"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


def get_settings() -> Settings:
    """Return a fresh instance of settings."""
    return Settings()

