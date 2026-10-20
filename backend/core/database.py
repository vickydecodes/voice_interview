from __future__ import annotations
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.core.config import settings

logger = logging.getLogger("database")

class DatabaseManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None

db_manager = DatabaseManager()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB at %s...", settings.MONGO_URI)
    db_manager.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_manager.db = db_manager.client[settings.DATABASE_NAME]
    
    # Initialize indexes
    try:
        await db_manager.db.users.create_index("email", unique=True)
        await db_manager.db.companies.create_index("name")
        await db_manager.db.interviews.create_index("user_id")
        await db_manager.db.interviews.create_index("company_id")
        logger.info("Connected to MongoDB successfully and verified indexes.")
    except Exception as e:
        logger.warning("Error creating MongoDB indexes: %s", e)

async def close_mongo_connection():
    if db_manager.client:
        logger.info("Closing MongoDB connection...")
        db_manager.client.close()
        db_manager.client = None
        db_manager.db = None
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    if db_manager.db is None:
        raise RuntimeError("Database connection has not been initialized.")
    return db_manager.db

def get_users_collection():
    return get_database()["users"]

def get_companies_collection():
    return get_database()["companies"]

def get_interviews_collection():
    return get_database()["interviews"]
