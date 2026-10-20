from __future__ import annotations
import logging
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.core.database import get_users_collection
from backend.core.security import create_access_token, get_current_user
from backend.models.user import AuthResponse, ParsedResume, UserInDB, UserOut
from backend.services.resume_parser import parse_resume_content
from backend.services.ai_service import OpenRouterError

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger("auth_router")


@router.post("/resume", response_model=AuthResponse)
async def upload_resume_and_authenticate(file: UploadFile = File(...)):
    """
    Step 1: Upload resume (PDF or DOCX). The resume is the identity.
    Extracts text, parses structured data with OpenRouter, creates or updates
    user in MongoDB, and issues a JWT token.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file selected for upload.",
        )

    filename_lower = file.filename.lower()
    if not (filename_lower.endswith(".pdf") or filename_lower.endswith(".docx")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Please upload a PDF (.pdf) or Word (.docx) document.",
        )

    try:
        content = await file.read()
        if not content or len(content) < 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty or corrupted. Please try again with a valid resume.",
            )
        
        # Parse resume through AI service
        parsed_resume: ParsedResume = await parse_resume_content(file.filename, content)
        
    except ValueError as ve:
        logger.warning("Resume format/extraction error: %s", ve)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except OpenRouterError as ore:
        logger.error("AI service error during resume parsing: %s", ore)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Parsing Error: {ore.message}",
        )
    except Exception as e:
        logger.error("Unexpected error parsing resume: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while parsing your resume: {str(e)}",
        )

    # Upsert user in MongoDB
    users_col = get_users_collection()
    now = datetime.utcnow()
    existing_user = await users_col.find_one({"email": parsed_resume.email})

    if existing_user:
        user_id = str(existing_user["_id"])
        update_data = {
            "name": parsed_resume.name or existing_user.get("name", "Candidate"),
            "phone": parsed_resume.phone,
            "parsed_resume": parsed_resume.model_dump(),
            "updated_at": now,
        }
        await users_col.update_one({"_id": user_id}, {"$set": update_data})
        user_in_db = {
            "id": user_id,
            "email": parsed_resume.email,
            "name": update_data["name"],
            "phone": update_data["phone"],
            "parsed_resume": parsed_resume,
            "created_at": existing_user.get("created_at", now),
            "updated_at": now,
        }
    else:
        user_id = str(uuid.uuid4())
        new_user_dict = {
            "_id": user_id,
            "email": parsed_resume.email,
            "name": parsed_resume.name or "Candidate",
            "phone": parsed_resume.phone,
            "parsed_resume": parsed_resume.model_dump(),
            "created_at": now,
            "updated_at": now,
        }
        await users_col.insert_one(new_user_dict)
        user_in_db = {
            "id": user_id,
            "email": parsed_resume.email,
            "name": new_user_dict["name"],
            "phone": new_user_dict["phone"],
            "parsed_resume": parsed_resume,
            "created_at": now,
            "updated_at": now,
        }

    # Issue JWT token
    token_payload = {
        "sub": user_id,
        "email": parsed_resume.email,
        "name": user_in_db["name"],
    }
    access_token = create_access_token(token_payload)

    user_out = UserOut(
        id=user_id,
        email=user_in_db["email"],
        name=user_in_db["name"],
        phone=user_in_db.get("phone"),
        parsed_resume=parsed_resume,
        created_at=user_in_db["created_at"],
        updated_at=user_in_db["updated_at"],
    )

    return AuthResponse(access_token=access_token, token_type="bearer", user=user_out)


@router.get("/me", response_model=UserOut)
async def get_current_user_profile(current_user: dict = Depends(get_current_user)):
    """Protected endpoint to retrieve authenticated user profile and parsed resume."""
    return UserOut(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        phone=current_user.get("phone"),
        parsed_resume=ParsedResume(**current_user.get("parsed_resume", {})),
        created_at=current_user["created_at"],
        updated_at=current_user["updated_at"],
    )
