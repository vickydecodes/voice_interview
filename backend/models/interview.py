from __future__ import annotations
from datetime import datetime
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field


MessageRole = Literal["interviewer", "candidate", "system"]


class InterviewMessage(BaseModel):
    role: MessageRole
    text: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class InterviewCreateRequest(BaseModel):
    company_id: str


class InterviewTurnRequest(BaseModel):
    answer: str


class InterviewTurnResponse(BaseModel):
    reply: str
    messages: List[InterviewMessage]


class InterviewEvaluation(BaseModel):
    rating: float = Field(default=7.0, ge=1.0, le=10.0, description="Overall rating out of 10")
    verdict: str = Field(default="Hire", description="Recommendation: Strong Hire, Hire, Lean Hire, or Needs Practice")
    summary: str = Field(default="", description="Concise feedback summary paragraph")
    strengths: List[str] = Field(default_factory=list, description="Key candidate strengths observed")
    improvements: List[str] = Field(default_factory=list, description="Targeted areas for growth")


class InterviewInDB(BaseModel):
    id: str
    user_id: str
    company_id: str
    company_snapshot: Dict[str, Any]
    messages: List[InterviewMessage] = Field(default_factory=list)
    status: Literal["active", "completed"] = "active"
    evaluation: Optional[InterviewEvaluation] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

