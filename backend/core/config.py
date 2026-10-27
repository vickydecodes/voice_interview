from __future__ import annotations
import json
import os
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # App
    PROJECT_NAME: str = "AI Interview Simulator"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_interview_simulator"
    
    # JWT Authentication
    JWT_SECRET: str = "ai-interview-simulator-jwt-secret-key-2026-secure"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # LLM & OpenRouter
    LLM_PROVIDER: str = "openrouter"
    LLM_MODEL: Optional[str] = None
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "nvidia/nemotron-3.5-lightning:free"
    OPENROUTER_INTERVIEW_MODEL: Optional[str] = None
    OPENROUTER_FALLBACK_MODELS: List[str] = [
        "nvidia/nemotron-3.5-lightning:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
        "cohere/north-mini-code:free",
    ]
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    class Config:
        env_file = (str(BASE_DIR / ".env"), ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

# Post-processing: Handle CORS if passed as json string or comma-separated
raw_cors = os.getenv("CORS_ORIGINS")
if raw_cors:
    try:
        parsed = json.loads(raw_cors)
        if isinstance(parsed, list):
            settings.CORS_ORIGINS = parsed
    except Exception:
        settings.CORS_ORIGINS = [item.strip() for item in raw_cors.split(",") if item.strip()]

# Sync LLM_MODEL with OPENROUTER_MODEL / OPENROUTER_INTERVIEW_MODEL
if settings.LLM_MODEL:
    if not os.getenv("OPENROUTER_MODEL"):
        settings.OPENROUTER_MODEL = settings.LLM_MODEL
    if not os.getenv("OPENROUTER_INTERVIEW_MODEL"):
        settings.OPENROUTER_INTERVIEW_MODEL = settings.LLM_MODEL
elif not settings.OPENROUTER_INTERVIEW_MODEL:
    settings.OPENROUTER_INTERVIEW_MODEL = settings.OPENROUTER_MODEL
