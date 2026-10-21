from __future__ import annotations
import logging
import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.config import settings
from backend.core.database import get_interviews_collection, get_companies_collection
from backend.core.security import get_current_user
from backend.models.interview import (
    InterviewCreateRequest,
    InterviewEvaluation,
    InterviewInDB,
    InterviewMessage,
    InterviewTurnRequest,
    InterviewTurnResponse,
)

from backend.services.ai_service import ai_service, OpenRouterError

router = APIRouter(prefix="/interviews", tags=["Interviews"])
logger = logging.getLogger("interviews_router")


def _format_interview_doc(doc: dict) -> InterviewInDB:
    doc_copy = doc.copy()
    doc_copy["id"] = str(doc_copy.pop("_id"))
    return InterviewInDB(**doc_copy)


def _build_interviewer_system_prompt(candidate: dict, company: dict) -> str:
    parsed_resume = candidate.get("parsed_resume", {})
    name = candidate.get("name", "Candidate")
    skills = ", ".join(parsed_resume.get("skills", [])[:15]) or "General Software Engineering"
    
    # Format experience highlights
    experiences = parsed_resume.get("experience", [])
    exp_summary = []
    for exp in experiences[:3]:
        highlights = "; ".join(exp.get("highlights", [])[:2])
        exp_summary.append(f"- {exp.get('role')} at {exp.get('company')} ({exp.get('duration')}): {highlights}")
    exp_str = "\n".join(exp_summary) if exp_summary else "Software Engineering professional"

    # Format project highlights
    projects = parsed_resume.get("projects", [])
    proj_summary = []
    for p in projects[:3]:
        tech = ", ".join(p.get("tech_stack", []))
        proj_summary.append(f"- {p.get('name')} ({tech}): {p.get('description')}")
    proj_str = "\n".join(proj_summary) if proj_summary else "Various software projects"

    comp_name = company.get("name", "Target Company")
    diff_level = company.get("difficulty_level", "Medium")
    diff_score = company.get("difficulty_score", 6)
    interview_style = company.get("interview_style", "Technical and Behavioral")
    focus_areas = ", ".join(company.get("focus_areas", []))
    brand_identity = company.get("brand_identity", "")

    return f"""You are an elite, highly professional AI Technical Interviewer conducting a real-time voice interview for {comp_name}.

COMPANY PROFILE:
- Company: {comp_name}
- Industry: {company.get('industry', 'Technology')}
- Difficulty Level: {diff_level} (Score {diff_score}/10)
- Brand & Culture: {brand_identity}
- Interview Style: {interview_style}
- Key Evaluation Focus Areas: {focus_areas}

CANDIDATE DOSSIER:
- Name: {name}
- Core Skills: {skills}
- Experience:
{exp_str}
- Projects:
{proj_str}

CRITICAL INTERVIEW GUIDELINES:
1. Difficulty Calibration: You MUST match the {diff_level} difficulty tier.
   - If 'Elite' or 'Hard' (e.g. Google, Stripe, Netflix): Be rigorous, press deeply on edge cases, scaling bottlenecks, race conditions, architecture trade-offs, and ownership principles. Do not accept vague surface-level buzzwords.
   - If 'Medium': Focus on sound fundamentals, clean code patterns, practical engineering choices, and collaborative problem-solving.
   - If 'Easy': Warm, encouraging, testing foundational concepts and baseline competencies.
2. Probe Weak Answers: If the candidate gives a superficial or generic answer, follow up directly on specific details, metrics, or architectural mechanisms they mentioned.
3. Content Mix: Seamlessly blend technical architecture/coding questions, deep-dives into their resume projects, and culture/behavioral scenarios relevant to {comp_name}.
4. One Question at a Time: NEVER ask multiple questions at once. Ask exactly one focused question or follow-up per response.
5. Spoken-Voice Friendly: Your reply is spoken aloud to the user using browser Text-to-Speech!
   - Keep answers concise, natural, and conversational (typically 2 to 4 sentences).
   - NEVER use markdown, bullet points, asterisks, numbered lists, emojis, code snippets, or quotes.
   - Speak naturally like a real human interviewer on a call."""


@router.post("", response_model=InterviewInDB, status_code=status.HTTP_201_CREATED)
async def create_interview_session(
    payload: InterviewCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Step 3: Creates a new voice interview session for the candidate and company.
    Generates the opening greeting and first question from the AI interviewer.
    """
    companies_col = get_companies_collection()
    company = await companies_col.find_one({"_id": payload.company_id})
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{payload.company_id}' not found.",
        )

    user_name = current_user.get("name") or "there"
    comp_name = company.get("name", "our company")
    diff_level = company.get("difficulty_level", "Medium")

    # Tailor opening based on difficulty
    if diff_level in ("Elite", "Hard"):
        opening_text = (
            f"Hello {user_name}, welcome to your interview with {comp_name}. "
            f"I will be evaluating your technical depth and problem-solving abilities today. "
            f"To begin, give me a concise overview of your background, and highlight the most technically complex project you have engineered."
        )
    else:
        opening_text = (
            f"Hello {user_name}, welcome to your interview with {comp_name}! "
            f"I am excited to speak with you today. "
            f"To get us started, could you briefly introduce yourself and share what interests you most about joining {comp_name}?"
        )

    initial_message = InterviewMessage(
        role="interviewer",
        text=opening_text,
        timestamp=datetime.utcnow(),
    )

    interviews_col = get_interviews_collection()
    interview_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Company snapshot to preserve company info even if edited later
    company_snapshot = {
        "id": str(company["_id"]),
        "name": company.get("name"),
        "initial": company.get("initial", "C"),
        "industry": company.get("industry"),
        "difficulty_level": company.get("difficulty_level"),
        "difficulty_score": company.get("difficulty_score"),
        "interview_style": company.get("interview_style"),
        "focus_areas": company.get("focus_areas", []),
        "brand_summary": company.get("brand_summary"),
        "brand_identity": company.get("brand_identity"),
    }

    interview_doc = {
        "_id": interview_id,
        "user_id": str(current_user["_id"]),
        "company_id": str(company["_id"]),
        "company_snapshot": company_snapshot,
        "messages": [initial_message.model_dump()],
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    await interviews_col.insert_one(interview_doc)
    logger.info("Created interview session %s for user %s at %s", interview_id, current_user.get("email"), comp_name)

    return _format_interview_doc(interview_doc)


@router.post("/{interview_id}/turn", response_model=InterviewTurnResponse)
async def process_interview_turn(
    interview_id: str,
    payload: InterviewTurnRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Submits candidate answer transcript, constructs context from resume & company profile,
    calls OpenRouter AI service, and returns next interviewer question.
    """
    answer_text = payload.answer.strip()
    if not answer_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate response transcript cannot be empty.",
        )

    interviews_col = get_interviews_collection()
    interview = await interviews_col.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{interview_id}' not found.",
        )

    if interview.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this interview session.",
        )

    # Append user turn
    candidate_message = InterviewMessage(
        role="candidate",
        text=answer_text,
        timestamp=datetime.utcnow(),
    )
    
    current_messages: List[dict] = interview.get("messages", [])
    current_messages.append(candidate_message.model_dump())

    # Build prompt messages for OpenRouter
    company = interview.get("company_snapshot", {})
    system_prompt = _build_interviewer_system_prompt(current_user, company)

    ai_messages = [{"role": "system", "content": system_prompt}]
    for msg in current_messages:
        role = "assistant" if msg["role"] == "interviewer" else "user"
        ai_messages.append({"role": role, "content": msg["text"]})

    # Call AI Service
    try:
        reply_text = await ai_service.chat(
            messages=ai_messages,
            model=settings.OPENROUTER_INTERVIEW_MODEL,
        )
    except OpenRouterError as ore:
        logger.error("OpenRouter error in interview turn: %s", ore)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Interviewer error: {ore.message}",
        )
    except Exception as e:
        logger.error("Unexpected error in interview turn: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate interviewer reply: {str(e)}",
        )

    # Clean any accidental formatting from AI reply
    clean_reply = reply_text.replace("*", "").replace("#", "").strip()

    interviewer_message = InterviewMessage(
        role="interviewer",
        text=clean_reply,
        timestamp=datetime.utcnow(),
    )
    current_messages.append(interviewer_message.model_dump())

    # Save to MongoDB
    now = datetime.utcnow()
    await interviews_col.update_one(
        {"_id": interview_id},
        {"$set": {"messages": current_messages, "updated_at": now}},
    )

    return InterviewTurnResponse(
        reply=clean_reply,
        messages=[InterviewMessage(**m) for m in current_messages],
    )


@router.get("/{interview_id}", response_model=InterviewInDB)
async def get_interview_session(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Retrieves the full interview session state and conversation transcript."""
    interviews_col = get_interviews_collection()
    interview = await interviews_col.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{interview_id}' not found.",
        )

    if interview.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this interview session.",
        )

    return _format_interview_doc(interview)


@router.post("/{interview_id}/complete", response_model=InterviewInDB)
async def complete_interview_session(
    interview_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Finalizes the interview, runs AI evaluation over candidate answers,
    and returns the evaluated interview session with ratings, verdict, and feedback.
    """
    interviews_col = get_interviews_collection()
    interview = await interviews_col.find_one({"_id": interview_id})
    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{interview_id}' not found.",
        )

    if interview.get("user_id") != str(current_user["_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this interview session.",
        )

    # If already completed with evaluation, return existing record
    if interview.get("status") == "completed" and interview.get("evaluation"):
        return _format_interview_doc(interview)

    messages = interview.get("messages", [])
    company = interview.get("company_snapshot", {})

    # Evaluate with AI Service
    evaluation_data = await ai_service.evaluate_interview(
        transcript_messages=messages,
        company=company,
        candidate=current_user,
    )

    now = datetime.utcnow()
    await interviews_col.update_one(
        {"_id": interview_id},
        {
            "$set": {
                "status": "completed",
                "evaluation": evaluation_data,
                "updated_at": now,
            }
        },
    )

    updated_doc = await interviews_col.find_one({"_id": interview_id})
    logger.info(
        "Evaluated interview %s for %s: Rating %s, Verdict: %s",
        interview_id,
        current_user.get("email"),
        evaluation_data.get("rating"),
        evaluation_data.get("verdict"),
    )
    return _format_interview_doc(updated_doc)

