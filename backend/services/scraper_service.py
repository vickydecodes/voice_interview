from __future__ import annotations
import logging
import re
from urllib.parse import urlparse
from typing import Dict, Any, Optional
import httpx
from bs4 import BeautifulSoup

from backend.models.company import CompanyAnalysis
from backend.services.ai_service import ai_service, OpenRouterError

logger = logging.getLogger("scraper_service")

MAX_SCRAPED_TEXT_LENGTH = 15000
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def normalize_url(raw_url: str) -> str:
    url = raw_url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    parsed = urlparse(url)
    if not parsed.netloc:
        raise ValueError(f"Invalid website URL format: '{raw_url}'")
    return url


async def scrape_company_website(url: str) -> Dict[str, Any]:
    """
    Scrapes title, meta description, headings, and visible text with a timeout,
    User-Agent header, and length cap.
    """
    normalized = normalize_url(url)
    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
            response = await client.get(normalized)
    except httpx.ConnectError:
        raise ValueError(f"Could not connect to {normalized}. Please check that the URL is correct and active.")
    except httpx.TimeoutException:
        raise ValueError(f"Connection to {normalized} timed out after 15 seconds. The server might be slow or blocking requests.")
    except Exception as e:
        raise ValueError(f"Failed to access {normalized}: {str(e)}")

    if response.status_code >= 400:
        if response.status_code == 403:
            raise ValueError(f"Access to {normalized} was blocked by the website (HTTP 403 Forbidden / Anti-bot protection).")
        if response.status_code == 404:
            raise ValueError(f"The URL {normalized} was not found (HTTP 404). Please verify the link.")
        raise ValueError(f"Received HTTP {response.status_code} while scraping {normalized}.")

    html_content = response.text
    if not html_content or len(html_content.strip()) < 50:
        raise ValueError(f"The website at {normalized} returned empty or insufficient content.")

    soup = BeautifulSoup(html_content, "html.parser")

    # Remove non-content elements
    for element in soup(["script", "style", "noscript", "svg", "nav", "footer", "iframe"]):
        element.extract()

    # Extract Title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Extract Meta Description
    meta_desc = ""
    desc_tag = (
        soup.find("meta", attrs={"name": "description"})
        or soup.find("meta", attrs={"property": "og:description"})
    )
    if desc_tag and desc_tag.get("content"):
        meta_desc = desc_tag["content"].strip()

    # Extract Headings
    headings = []
    for h in soup.find_all(["h1", "h2", "h3"]):
        h_text = h.get_text(separator=" ", strip=True)
        if h_text and len(h_text) > 3:
            headings.append(h_text)

    # Extract Visible Text
    raw_text = soup.get_text(separator="\n", strip=True)
    # Collapse multiple blank lines
    cleaned_lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    full_text = "\n".join(cleaned_lines)

    if len(full_text) > MAX_SCRAPED_TEXT_LENGTH:
        full_text = full_text[:MAX_SCRAPED_TEXT_LENGTH] + "\n...[truncated]"

    if not full_text and not meta_desc and not title:
        raise ValueError(f"Could not extract meaningful readable text from {normalized}.")

    return {
        "url": normalized,
        "title": title,
        "meta_description": meta_desc,
        "headings": headings[:15],
        "content_sample": full_text,
    }


COMPANY_ANALYSIS_SYSTEM_PROMPT = """You are an elite corporate intelligence analyst and technical interview coach.
Analyze the provided company website data (or company name) and assess its brand prestige, engineering culture, scale, and interview rigor.

You must return valid JSON with:
1. name: string (Company's canonical name)
2. industry: string (e.g. 'FinTech', 'Cloud Infrastructure', 'Enterprise SaaS', 'Consumer AI')
3. brand_summary: string (A sharp, one-line brand summary of what they do)
4. brand_identity: string (2-3 sentences on their market position, engineering reputation, and impact)
5. estimated_valuation_or_scale: string (e.g. '$70B+ Public Giant', '$5B Late Stage Unicorn', 'Series B Startup', 'Early Stage')
6. culture_signals: array of strings (3-5 key cultural tenets or engineering traits, e.g. ['Extreme Ownership', 'First-Principles Engineering', 'Customer Empathy'])
7. difficulty_level: string ('Easy', 'Medium', 'Hard', or 'Elite')
8. difficulty_score: integer between 1 and 10 (Easy: 1-4, Medium: 5-6, Hard: 7-8, Elite: 9-10)
9. difficulty_reasoning: string (Justify the difficulty based on valuation/scale, market reputation, talent bar, and interview rigor)
10. interview_style: string (e.g. 'Rigorous Algorithms + Large-Scale System Design', 'High-bar Behavioral + Deep Domain Dive', 'Practical Coding + Architecture')
11. focus_areas: array of strings (4-6 key technical/domain areas tested in interviews at this company)

Rules for difficulty:
- Elite (9-10): FAANG tier, Tier-1 AI labs, top fintech unicorns (Google, Stripe, OpenAI, Apple, Netflix). Extremely high bar, rigorous DSA/architecture and system design.
- Hard (7-8): Established tech companies, competitive scale-ups (Airbnb, Uber, Shopify, Datadog). Tough multi-round technical and architectural interviews.
- Medium (5-6): Growth-stage startups, mid-tier tech firms, consulting leaders. Solid core competency and domain testing.
- Easy (1-4): Early-stage agencies, smaller local companies with practical, conversational interviews."""

COMPANY_SCHEMA_HINT = """{
  "name": "Stripe",
  "industry": "Financial Infrastructure & Payments",
  "brand_summary": "Global financial infrastructure powering online commerce and digital payments.",
  "brand_identity": "Stripe is renowned for world-class API design, obsessive developer ergonomics, and exceptional engineering talent.",
  "estimated_valuation_or_scale": "$70B+ Scale",
  "culture_signals": ["Obsessive Craftsmanship", "API First", "Rigorous Thinkers", "Macro-Optimism"],
  "difficulty_level": "Elite",
  "difficulty_score": 9,
  "difficulty_reasoning": "High-volume distributed systems, zero-fault financial accuracy, and a legendary hiring bar known for intense practical coding and architecture rounds.",
  "interview_style": "Practical Bug Hunting, System Architecture & Integration Testing",
  "focus_areas": ["High-Availability Systems", "API Design", "Distributed Transactions", "Concurrency", "Security"]
}"""


async def analyze_company_data(scraped_data: Dict[str, Any], suggested_name: Optional[str] = None) -> CompanyAnalysis:
    """Sends scraped company content to OpenRouter to analyze and classify the company."""
    prompt_payload = f"""Target URL: {scraped_data.get('url')}
Suggested Name: {suggested_name or 'Auto-detect from content'}
Page Title: {scraped_data.get('title')}
Meta Description: {scraped_data.get('meta_description')}
Key Headings: {', '.join(scraped_data.get('headings', []))}

Website Body Content:
{scraped_data.get('content_sample', '')}
"""
    result_json = await ai_service.generate_json(
        system=COMPANY_ANALYSIS_SYSTEM_PROMPT,
        user=prompt_payload,
        schema_hint=COMPANY_SCHEMA_HINT,
    )

    # Normalize name if user supplied an explicit name override
    if suggested_name and suggested_name.strip():
        result_json["name"] = suggested_name.strip()

    # Enforce score bounds
    score = int(result_json.get("difficulty_score", 5))
    score = max(1, min(10, score))
    result_json["difficulty_score"] = score

    # Validate level against score
    if score >= 9:
        result_json["difficulty_level"] = "Elite"
    elif score >= 7:
        result_json["difficulty_level"] = "Hard"
    elif score >= 5:
        result_json["difficulty_level"] = "Medium"
    else:
        result_json["difficulty_level"] = "Easy"

    return CompanyAnalysis(**result_json)
