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


class InterviewInDB(BaseModel):
    id: str
    user_id: str
    company_id: str
    company_snapshot: Dict[str, Any]
    messages: List[InterviewMessage] = Field(default_factory=list)
    status: Literal["active", "completed"] = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
