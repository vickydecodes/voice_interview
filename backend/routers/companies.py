from __future__ import annotations
import logging
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from backend.core.database import get_companies_collection
from backend.core.security import get_current_user
from backend.models.company import CompanyCreateRequest, CompanyInDB, CompanyAnalysis
from backend.services.scraper_service import scrape_company_website, analyze_company_data
from backend.services.ai_service import OpenRouterError

router = APIRouter(prefix="/companies", tags=["Companies"])
logger = logging.getLogger("companies_router")


def _format_company_doc(doc: dict) -> CompanyInDB:
    doc_copy = doc.copy()
    doc_copy["id"] = str(doc_copy.pop("_id"))
    return CompanyInDB(**doc_copy)


@router.get("", response_model=List[CompanyInDB])
async def list_companies():
    """Returns all companies available for interviews, sorted by creation date."""
    companies_col = get_companies_collection()
    cursor = companies_col.find({}).sort("created_at", -1)
    companies = []
    async for doc in cursor:
        companies.append(_format_company_doc(doc))
    return companies


@router.post("", response_model=CompanyInDB, status_code=status.HTTP_201_CREATED)
async def create_company_from_url(
    payload: CompanyCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Submits a company website URL (and optional name):
    1. Scrapes the site with BeautifulSoup (with User-Agent, timeout, length cap).
    2. Sends scraped content to OpenRouter to analyze the company profile & difficulty.
    3. Saves to MongoDB and returns the company for instant display.
    """
    raw_url = payload.url.strip() if payload.url else ""
    if not raw_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Website URL is required.",
        )

    # 1. Scrape the website
    try:
        scraped_data = await scrape_company_website(raw_url)
    except ValueError as ve:
        logger.warning("Scraping error for %s: %s", raw_url, ve)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve),
        )
    except Exception as e:
        logger.error("Unexpected error scraping %s: %s", raw_url, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scrape website: {str(e)}",
        )

    # 2. Analyze with OpenRouter
    try:
        analysis: CompanyAnalysis = await analyze_company_data(
            scraped_data=scraped_data,
            suggested_name=payload.name,
        )
    except OpenRouterError as ore:
        logger.error("AI analysis error for %s: %s", raw_url, ore)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Company AI Analysis failed: {ore.message}",
        )
    except Exception as e:
        logger.error("Error analyzing company with AI: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze company details: {str(e)}",
        )

    # 3. Save to MongoDB
    companies_col = get_companies_collection()
    company_id = str(uuid.uuid4())
    name = analysis.name.strip()
    initial = (name[0] if name else "C").upper()

    company_doc = {
        "_id": company_id,
        "name": name,
        "website_url": scraped_data["url"],
        "initial": initial,
        "industry": analysis.industry,
        "brand_summary": analysis.brand_summary,
        "brand_identity": analysis.brand_identity,
        "estimated_valuation_or_scale": analysis.estimated_valuation_or_scale,
        "culture_signals": analysis.culture_signals,
        "difficulty_level": analysis.difficulty_level,
        "difficulty_score": analysis.difficulty_score,
        "difficulty_reasoning": analysis.difficulty_reasoning,
        "interview_style": analysis.interview_style,
        "focus_areas": analysis.focus_areas,
        "created_at": datetime.utcnow(),
    }

    await companies_col.insert_one(company_doc)
    logger.info("Saved new company '%s' (Difficulty: %s) to DB", name, analysis.difficulty_level)

    return _format_company_doc(company_doc)


@router.get("/{company_id}", response_model=CompanyInDB)
async def get_company_by_id(company_id: str):
    """Retrieves full profile for a single company."""
    companies_col = get_companies_collection()
    doc = await companies_col.find_one({"_id": company_id})
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found.",
        )
    return _format_company_doc(doc)
