from __future__ import annotations
import asyncio
import json
import logging
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse
import httpx

from backend.core.config import settings

logger = logging.getLogger("ai_service")

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


class OpenRouterError(Exception):
    """Custom exception for OpenRouter API errors with clear error messages."""
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[dict] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


def _clean_json_string(raw: str) -> str:
    """Strips markdown code fences and whitespace from a JSON response."""
    text = raw.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if match:
        text = match.group(1).strip()
    return text


class AIService:
    def __init__(self):
        self.default_model = settings.OPENROUTER_MODEL
        self.interview_model = settings.OPENROUTER_INTERVIEW_MODEL or settings.OPENROUTER_MODEL

    def _get_headers(self) -> Dict[str, str]:
        key = settings.OPENROUTER_API_KEY
        if not key or key.strip() in ("", "your_openrouter_api_key_here"):
            raise OpenRouterError(
                "OpenRouter API key is missing. Please set OPENROUTER_API_KEY in your .env file. "
                "Get a key at https://openrouter.ai/keys"
            )
        return {
            "Authorization": f"Bearer {key.strip()}",
            "HTTP-Referer": "https://ai-interview-simulator.local",
            "X-Title": "AI Interview Simulator",
            "Content-Type": "application/json",
        }

    async def _post_with_retry(self, payload: dict, max_retries: int = 3, timeout_seconds: float = 60.0) -> dict:
        """Post request with exponential backoff for 429 and 5xx errors."""
        headers = self._get_headers()
        backoff = 1.5

        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                    response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload)
                
                if response.status_code == 200:
                    return response.json()
                
                elif response.status_code == 401:
                    raise OpenRouterError(
                        "Invalid OpenRouter API Key. Please verify your OPENROUTER_API_KEY in backend/.env.",
                        status_code=401,
                    )
                
                elif response.status_code == 402:
                    raise OpenRouterError(
                        "OpenRouter credits exhausted or payment required. Please check your account credits at https://openrouter.ai/credits.",
                        status_code=402,
                    )
                
                elif response.status_code == 429:
                    error_msg = response.text
                    logger.warning("OpenRouter rate limited (429), attempt %d/%d: %s", attempt, max_retries, error_msg)
                    if attempt == max_retries:
                        raise OpenRouterError(
                            "OpenRouter rate limit reached (429). Please wait a moment or switch to another model.",
                            status_code=429,
                        )
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                
                elif response.status_code >= 500:
                    logger.warning("OpenRouter server error (%d), attempt %d/%d: %s", response.status_code, attempt, max_retries, response.text)
                    if attempt == max_retries:
                        raise OpenRouterError(
                            f"OpenRouter upstream server error ({response.status_code}). Please retry.",
                            status_code=response.status_code,
                        )
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                
                else:
                    err_json = {}
                    try:
                        err_json = response.json()
                    except Exception:
                        pass
                    msg = err_json.get("error", {}).get("message") or response.text or f"HTTP {response.status_code}"
                    raise OpenRouterError(f"OpenRouter error ({response.status_code}): {msg}", status_code=response.status_code)
            
            except httpx.TimeoutException:
                logger.warning("OpenRouter timeout on attempt %d/%d", attempt, max_retries)
                if attempt == max_retries:
                    raise OpenRouterError("OpenRouter request timed out after multiple attempts. Please try again.")
                await asyncio.sleep(backoff)
                backoff *= 2
            except OpenRouterError:
                raise
            except Exception as e:
                logger.error("Unexpected error contacting OpenRouter: %s", e)
                if attempt == max_retries:
                    raise OpenRouterError(f"Failed to communicate with OpenRouter: {str(e)}")
                await asyncio.sleep(backoff)
                backoff *= 2

        raise OpenRouterError("Failed to get response from OpenRouter after retries.")

    def _mock_generate_json(self, system: str, user: str, schema_hint: str) -> Dict[str, Any]:
        """Provides realistic offline mock responses for resume parsing and company analysis."""
        logger.info("AIService executing mock_generate_json")
        user_lower = user.lower()
        sys_lower = system.lower()

        # 1. Resume Parsing Mock
        if "resume" in sys_lower or "resume content" in user_lower:
            email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", user)
            email = email_match.group(0) if email_match else "alex.chen.dev@example.com"

            phone_match = re.search(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", user)
            phone = phone_match.group(0) if phone_match else "+1 (555) 234-5678"

            # Detect skills from text
            detected_skills = []
            skill_bank = [
                "Python", "FastAPI", "React", "TypeScript", "Node.js", "Docker", "Kubernetes",
                "PostgreSQL", "MongoDB", "Redis", "Distributed Systems", "REST APIs", "AWS",
                "GraphQL", "Microservices", "Git", "CI/CD", "Tailwind CSS"
            ]
            for s in skill_bank:
                if re.search(r"\b" + re.escape(s.lower()) + r"\b", user_lower):
                    detected_skills.append(s)
            if len(detected_skills) < 4:
                detected_skills = ["Python", "FastAPI", "React", "TypeScript", "Docker", "PostgreSQL", "Redis", "Distributed Systems"]

            return {
                "name": "Alex Chen",
                "email": email,
                "phone": phone,
                "location": "San Francisco, CA",
                "summary": "Senior Full-Stack Software Engineer with 6+ years of experience designing high-throughput distributed architectures, event-driven microservices, and reactive web platforms.",
                "skills": detected_skills,
                "experience": [
                    {
                        "company": "TechScale Solutions",
                        "role": "Senior Software Engineer",
                        "duration": "2022 - Present",
                        "highlights": [
                            "Architected high-throughput async processing pipeline handling 50M+ daily events using FastAPI and Redis",
                            "Reduced p99 API latency by 42% through connection pooling and caching strategy optimizations",
                            "Mentored cross-functional engineering teams on distributed system design and testing best practices"
                        ]
                    },
                    {
                        "company": "CloudForge Labs",
                        "role": "Software Engineer",
                        "duration": "2019 - 2022",
                        "highlights": [
                            "Engineered real-time data dashboards using React, TypeScript, and FastAPI serving 12,000+ monthly enterprise users",
                            "Implemented automated CI/CD deployment pipelines on Docker and Kubernetes"
                        ]
                    }
                ],
                "education": [
                    {
                        "institution": "University of California, Berkeley",
                        "degree": "B.S. in Computer Science",
                        "year": "2019"
                    }
                ],
                "projects": [
                    {
                        "title": "Distributed Task Orchestrator",
                        "description": "High-availability distributed job queue engine with leader election and at-least-once message delivery guarantees.",
                        "tech_stack": ["Python", "FastAPI", "Redis", "Docker", "Raft"]
                    },
                    {
                        "title": "Voice Interview Simulator Canvas",
                        "description": "Interactive Web Speech real-time audio interview simulator with automated transcript analysis.",
                        "tech_stack": ["React", "TypeScript", "FastAPI", "MongoDB", "Web Speech API"]
                    }
                ],
                "certifications": ["AWS Certified Solutions Architect"]
            }

        # 2. Company Analysis Mock
        if "company" in sys_lower or "target url:" in user_lower:
            url_match = re.search(r"Target URL:\s*([^\n]+)", user)
            raw_url = url_match.group(1).strip() if url_match else "https://example.com"

            name_match = re.search(r"Suggested Name:\s*([^\n]+)", user)
            suggested = name_match.group(1).strip() if name_match else ""
            if not suggested or suggested.lower() in ("auto-detect from content", "none"):
                # Infer from hostname
                hostname = urlparse(raw_url).hostname or "techscale.com"
                parts = hostname.replace("www.", "").split(".")
                suggested = parts[0].capitalize() if parts else "ScaleCorp"

            return {
                "name": suggested,
                "difficulty_level": "Hard",
                "difficulty_score": 8,
                "reasoning": f"{suggested} builds high-scale, mission-critical engineering services demanding deep distributed systems knowledge, operational reliability, and pragmatic technical tradeoffs.",
                "interview_style": "Rigorous architecture design, concurrency bottlenecks, failure modes, and proactive technical ownership.",
                "key_focus_areas": [
                    "Distributed Architecture & Low-Latency Data Ingestion",
                    "Concurrency Bottlenecks & Race Conditions",
                    "Production Incident Diagnostics & Graceful Degradation"
                ]
            }

        # Fallback generic JSON
        return {"status": "ok", "mock": True}

    def _mock_chat(self, messages: List[Dict[str, str]]) -> str:
        """Provides realistic conversational interview turns in mock mode."""
        logger.info("AIService executing mock_chat")
        user_turns = [m for m in messages if m.get("role") == "user"]
        turn_count = len(user_turns)

        if turn_count <= 1:
            return (
                "Hello, thanks for taking the time to speak with me today. "
                "I reviewed your resume and background, and your work on distributed systems and async services stands out. "
                "To get started, could you walk me through the architecture of the distributed task queue you built, "
                "and explain the primary latency and throughput constraints you faced?"
            )
        elif turn_count == 2:
            return (
                "That makes sense. When managing concurrent tasks across worker nodes, "
                "how did you ensure consistency and prevent duplicate processing when worker nodes crashed or suffered network partitions?"
            )
        elif turn_count == 3:
            return (
                "Good explanation. Let's suppose traffic spikes by ten times your normal baseline during peak hours. "
                "Where would your architecture experience the first bottlenecks, and how would you implement backpressure to protect downstream storage?"
            )
        elif turn_count == 4:
            return (
                "Understood. Shifting to team collaboration and technical tradeoffs, "
                "could you share an example of an architectural decision where you had to push back or compromise with team members to deliver a reliable solution on time?"
            )
        else:
            return (
                "Thank you for sharing those insights. You demonstrated strong system design depth and clear communication throughout our conversation. "
                "We have covered all the core technical areas I wanted to review today. "
                "Do you have any questions for me about our engineering architecture, team structure, or what we are building next?"
            )

    async def generate_json(
        self,
        system: str,
        user: str,
        schema_hint: str = "",
        model: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends request using response_format: {"type": "json_object"}
        with fallback that strips code fences and retries once on invalid JSON.
        Supports LLM_PROVIDER=mock for offline testing.
        """
        if settings.LLM_PROVIDER.lower() == "mock":
            return self._mock_generate_json(system, user, schema_hint)

        chosen_model = model or self.default_model
        system_content = system
        if schema_hint:
            system_content += f"\n\nYou MUST return valid JSON adhering strictly to this schema or structure:\n{schema_hint}\nDo NOT wrap with markdown fences or other explanations."

        messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user},
        ]

        payload = {
            "model": chosen_model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        # First attempt
        response_data = await self._post_with_retry(payload)
        choices = response_data.get("choices", [])
        if not choices:
            raise OpenRouterError("OpenRouter returned an empty choice list.")

        raw_content = choices[0].get("message", {}).get("content", "")
        cleaned = _clean_json_string(raw_content)

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning("First JSON parsing attempt failed (%s). Retrying with correction prompt...", e)

        # Retry once with explicit feedback
        retry_messages = [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user},
            {"role": "assistant", "content": raw_content},
            {
                "role": "user",
                "content": "Your previous response was not valid JSON. Please output strictly valid, well-formed JSON object only, without markdown fences or additional commentary.",
            },
        ]
        payload["messages"] = retry_messages

        retry_response_data = await self._post_with_retry(payload)
        retry_choices = retry_response_data.get("choices", [])
        if not retry_choices:
            raise OpenRouterError("OpenRouter returned an empty response on JSON retry.")

        retry_raw = retry_choices[0].get("message", {}).get("content", "")
        retry_cleaned = _clean_json_string(retry_raw)

        try:
            return json.loads(retry_cleaned)
        except json.JSONDecodeError as err:
            logger.error("Failed to parse JSON after retry. Raw response: %s", retry_raw)
            raise OpenRouterError(f"Failed to generate valid JSON from AI service: {err}")

    async def chat(self, messages: List[Dict[str, str]], model: Optional[str] = None) -> str:
        """Sends messages to OpenRouter (or mock) for conversational replies."""
        if settings.LLM_PROVIDER.lower() == "mock":
            return self._mock_chat(messages)

        chosen_model = model or self.interview_model
        payload = {
            "model": chosen_model,
            "messages": messages,
            "temperature": 0.7,
        }

        response_data = await self._post_with_retry(payload, timeout_seconds=45.0)
        choices = response_data.get("choices", [])
        if not choices:
            raise OpenRouterError("OpenRouter returned empty choices in conversation.")

        reply = choices[0].get("message", {}).get("content", "")
        return reply.strip()


ai_service = AIService()
