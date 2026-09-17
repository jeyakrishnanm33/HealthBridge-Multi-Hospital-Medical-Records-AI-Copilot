"""FastAPI AI/Search Service Application entry point."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.providers.embedding_provider import get_embedding_provider
from app.providers.llm_provider import get_llm_provider
from app.vector_store.memory_store import MemoryVectorStore
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.indexing_service import IndexingService
from app.services.search_service import SearchService
from app.services.rag_service import RAGService

from app.routes.health import router as health_router
from app.routes.index_routes import router as index_router
from app.routes.search import router as search_router
from app.routes.rag import router as rag_router
from app.routes.tool_routes import router as tool_router
from app.routes.agent_routes import agent_router


class AppState:
    """Singleton container for application services and stores."""
    def __init__(self):
        settings = get_settings()
        self.settings = settings
        self.provider = get_embedding_provider(settings)
        self.embedding_service = EmbeddingService(self.provider)
        self.vector_store = MemoryVectorStore()
        self.chunking_service = ChunkingService()
        self.indexing_service = IndexingService(
            vector_store=self.vector_store,
            embedding_service=self.embedding_service,
            chunking_service=self.chunking_service
        )
        self.search_service = SearchService(
            vector_store=self.vector_store,
            embedding_service=self.embedding_service
        )
        self.llm_provider = get_llm_provider(settings)
        self.rag_service = RAGService(self.llm_provider)


app_state = AppState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown hooks."""
    yield


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title="HealthBridge AI, Search, Tool Calling & Agent Microservice",
        description="Provider-independent semantic retrieval, tool calling, agent orchestration, and RAG copilot microservice for HealthBridge",
        version="0.15.0",
        lifespan=lifespan
    )

    # Internal microservice CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register Routers
    app.include_router(health_router)
    app.include_router(index_router)
    app.include_router(search_router)
    app.include_router(rag_router)
    app.include_router(tool_router)
    app.include_router(agent_router)

    return app




app = create_app()


if __name__ == "__main__":
    import uvicorn
    settings = get_settings()
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
