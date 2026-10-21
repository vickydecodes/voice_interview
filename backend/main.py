from __future__ import annotations
import sys
from pathlib import Path

_BACKEND_DIR = Path(__file__).resolve().parent
_REPO_ROOT = _BACKEND_DIR.parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.config import settings
from backend.core.database import connect_to_mongo, close_mongo_connection
from backend.services.seed_service import seed_companies_if_empty
from backend.routers import auth, companies, interviews

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect DB and seed sample companies
    logger.info("Initializing %s backend...", settings.PROJECT_NAME)
    await connect_to_mongo()
    await seed_companies_if_empty()
    yield
    # Shutdown
    logger.info("Shutting down %s backend...", settings.PROJECT_NAME)
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack AI Interview Simulator Backend with OpenRouter and MongoDB",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
origins = list(settings.CORS_ORIGINS)
# Ensure wildcard fallback or explicit localhost variants are included
if "*" not in origins:
    origins.extend([
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "http://localhost:3000",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register routers
app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(interviews.router)


@app.get("/health", tags=["Health"])
@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": settings.DATABASE_NAME,
        "llm_provider": settings.LLM_PROVIDER,
        "model": settings.OPENROUTER_MODEL,
        "interview_model": settings.OPENROUTER_INTERVIEW_MODEL,
    }
