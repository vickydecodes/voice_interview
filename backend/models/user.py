from __future__ import annotations
from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ExperienceItem(BaseModel):
    role: str = ""
    company: str = ""
    duration: str = ""
    highlights: List[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    year: str = ""
    details: Optional[str] = None


class ProjectItem(BaseModel):
    name: str = ""
    description: str = ""
    tech_stack: List[str] = Field(default_factory=list)


class ParsedResume(BaseModel):
    name: str = "Candidate"
    email: str = "candidate@example.com"
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    experience: List[ExperienceItem] = Field(default_factory=list)
    projects: List[ProjectItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    summary: str = ""


class UserInDB(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    parsed_resume: ParsedResume
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    parsed_resume: ParsedResume
    created_at: datetime
    updated_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
