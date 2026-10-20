from __future__ import annotations
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl


DifficultyLevel = Literal["Easy", "Medium", "Hard", "Elite"]


class CompanyAnalysis(BaseModel):
    name: str
    industry: str
    brand_summary: str
    brand_identity: str
    estimated_valuation_or_scale: str
    culture_signals: List[str] = Field(default_factory=list)
    difficulty_level: DifficultyLevel
    difficulty_score: int = Field(ge=1, le=10)
    difficulty_reasoning: str
    interview_style: str
    focus_areas: List[str] = Field(default_factory=list)


class CompanyCreateRequest(BaseModel):
    url: str
    name: Optional[str] = None


class CompanyInDB(BaseModel):
    id: str
    name: str
    website_url: Optional[str] = None
    initial: str
    industry: str
    brand_summary: str
    brand_identity: str
    estimated_valuation_or_scale: str
    culture_signals: List[str] = Field(default_factory=list)
    difficulty_level: DifficultyLevel
    difficulty_score: int
    difficulty_reasoning: str
    interview_style: str
    focus_areas: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
