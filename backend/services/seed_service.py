from __future__ import annotations
import logging
import uuid
from datetime import datetime
from backend.core.database import get_companies_collection

logger = logging.getLogger("seed_service")

SAMPLE_COMPANIES = [
    {
        "_id": "seed-comp-google",
        "name": "Google",
        "website_url": "https://about.google",
        "initial": "G",
        "industry": "Search, Cloud & Artificial Intelligence",
        "brand_summary": "Organizing the world's information and making it universally accessible and useful.",
        "brand_identity": "Google is an undisputed tech titan with planetary-scale infrastructure, world-leading AI research (DeepMind), and the gold standard for computer science rigor.",
        "estimated_valuation_or_scale": "$2.2T+ Public Tech Titan",
        "culture_signals": ["Googliness & Respect", "Planetary Scale", "Data-Driven Consensus", "Technical Depth"],
        "difficulty_level": "Elite",
        "difficulty_score": 10,
        "difficulty_reasoning": "Planetary-scale distributed systems, multi-round algorithm tests with strict runtime/space complexity constraints, and Googleyness behavioral rubric.",
        "interview_style": "Algorithmic Problem Solving (LeetCode Hard) & Large-Scale Distributed Architecture",
        "focus_areas": ["Data Structures & Algorithms", "Planetary Scale Architecture", "Concurrency & Threading", "Googliness & Leadership"],
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "seed-comp-stripe",
        "name": "Stripe",
        "website_url": "https://stripe.com",
        "initial": "S",
        "industry": "Financial Infrastructure & Payments",
        "brand_summary": "Economic infrastructure for the internet, powering millions of businesses worldwide.",
        "brand_identity": "Stripe is celebrated for its developer-first ethos, pristine APIs, high operational excellence, and unmatched engineering craftsmanship.",
        "estimated_valuation_or_scale": "$70B+ Private Giant",
        "culture_signals": ["Craftsmanship & Quality", "API-First Mentality", "High Velocity", "Macro Optimism"],
        "difficulty_level": "Elite",
        "difficulty_score": 9,
        "difficulty_reasoning": "Renowned for practical coding sessions with real codebases, strict idempotency and fault-tolerance standards, and intense culture fit interviews.",
        "interview_style": "Practical Bug Hunting, Real-world System Architecture & API Design",
        "focus_areas": ["Distributed Financial Transactions", "API Ergonomics", "Idempotency & Resilience", "Observability & Debugging"],
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "seed-comp-netflix",
        "name": "Netflix",
        "website_url": "https://netflix.com",
        "initial": "N",
        "industry": "Streaming Media & Entertainment Tech",
        "brand_summary": "World-leading streaming entertainment service with over 260 million paid memberships.",
        "brand_identity": "Pioneers of chaos engineering, microservices, and a high-performance culture that rewards stunning colleagues with immense autonomy.",
        "estimated_valuation_or_scale": "$300B+ Public Giant",
        "culture_signals": ["Freedom & Responsibility", "Context Not Control", "Highly Aligned Loosely Coupled", "Keeper Test"],
        "difficulty_level": "Hard",
        "difficulty_score": 8,
        "difficulty_reasoning": "Only hires seasoned senior/staff engineers. Strong focus on high-throughput media streaming pipelines, resilience, and intense culture alignment.",
        "interview_style": "Senior-Level System Architecture, Chaos Resilience & Culture Alignment",
        "focus_areas": ["High Throughput Microservices", "Chaos Engineering & Failover", "Caching & CDN Strategy", "Senior Ownership & Candor"],
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "seed-comp-airbnb",
        "name": "Airbnb",
        "website_url": "https://airbnb.com",
        "initial": "A",
        "industry": "Travel, Hospitality & Marketplace",
        "brand_summary": "Global two-sided marketplace connecting travelers with unique homes and experiences.",
        "brand_identity": "A design-forward tech company known for high consumer polish, robust marketplace algorithms, and a core mission around belonging.",
        "estimated_valuation_or_scale": "$90B+ Public Enterprise",
        "culture_signals": ["Champion the Mission", "Be a Host", "Simplify", "Craft & Design Excellence"],
        "difficulty_level": "Hard",
        "difficulty_score": 7,
        "difficulty_reasoning": "Rigorous cross-functional interviews including dedicated Core Values rounds, frontend/backend architecture, and complex marketplace concurrency.",
        "interview_style": "Practical Systems Architecture, Full-Stack Product Sense & Core Values",
        "focus_areas": ["Two-Sided Marketplaces", "Search & Recommendation Ranking", "Event-Driven Messaging", "Belonging Core Values"],
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "seed-comp-spotify",
        "name": "Spotify",
        "website_url": "https://spotify.com",
        "initial": "S",
        "industry": "Audio Streaming & Music Technology",
        "brand_summary": "Unlocking the potential of human creativity by giving millions of artists the opportunity to live off their art.",
        "brand_identity": "Famous for the Spotify Squad model, real-time audio delivery protocols, and machine learning recommendation engines.",
        "estimated_valuation_or_scale": "$60B+ Audio Leader",
        "culture_signals": ["Autonomous Squads", "Playful & Collaborative", "Fast Iteration", "Passionate About Sound"],
        "difficulty_level": "Medium",
        "difficulty_score": 6,
        "difficulty_reasoning": "Solid technical fundamentals, domain-driven design, collaborative team dynamics, and audio stream buffering problems.",
        "interview_style": "Collaborative Coding, Domain Modeling & Team Compatibility",
        "focus_areas": ["Data Streaming Pipelines", "Client-Server Audio Sync", "Collaborative Problem Solving", "Modern Web Architecture"],
        "created_at": datetime.utcnow(),
    },
    {
        "_id": "seed-comp-linear",
        "name": "Linear",
        "website_url": "https://linear.app",
        "initial": "L",
        "industry": "Productivity & Developer Tools",
        "brand_summary": "The issue tracking tool you'll actually enjoy using, built for high-performance software teams.",
        "brand_identity": "Beloved by elite startups for extreme UI responsiveness, local-first offline sync engine, and minimalist keyboard-driven design.",
        "estimated_valuation_or_scale": "$400M+ Hyper-Efficient Scaleup",
        "culture_signals": ["Extreme Product Taste", "Local-First Architecture", "Speed as a Feature", "Small Elite Team"],
        "difficulty_level": "Medium",
        "difficulty_score": 5,
        "difficulty_reasoning": "Evaluates candidate craftsmanship, UI latency sensitivity, WebSockets/local storage syncing, and product passion.",
        "interview_style": "Taste-Driven Architecture, Practical Full-Stack & Speed Optimization",
        "focus_areas": ["Local-First Sync Engines", "Frontend Latency & 60fps Rendering", "State Management", "Developer Ergonomics"],
        "created_at": datetime.utcnow(),
    },
]


async def seed_companies_if_empty():
    """Seeds sample companies if the companies collection has zero records."""
    companies_col = get_companies_collection()
    count = await companies_col.count_documents({})
    if count == 0:
        logger.info("Companies collection is empty. Seeding %d sample companies...", len(SAMPLE_COMPANIES))
        await companies_col.insert_many(SAMPLE_COMPANIES)
        logger.info("Sample companies seeded successfully.")
    else:
        logger.info("Companies collection already contains %d records. Skipping seed.", count)
