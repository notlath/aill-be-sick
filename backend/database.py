"""
database.py
Centralized database connection module using SQLAlchemy.
Provides a singleton engine factory for consistent database access.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

# Singleton engine instance
_engine = None


def get_db_engine(db_url=None, pool_size=5):
    """
    Get or create SQLAlchemy engine with connection pooling.

    Args:
        db_url: Database URL (optional, uses DATABASE_URL env var if not provided)
        pool_size: Connection pool size (default: 5)

    Returns:
        SQLAlchemy Engine instance

    Raises:
        ValueError: If DATABASE_URL is not set and db_url is not provided
    """
    global _engine

    if _engine is not None:
        return _engine

    if db_url is None:
        db_url = os.getenv("DATABASE_URL")

    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set")

    # Fix for Supabase transaction pooler + psycopg2:
    # psycopg2 rejects unknown query parameters like 'pgbouncer=true'
    if "pgbouncer=true" in db_url:
        db_url = db_url.replace("?pgbouncer=true", "").replace("&pgbouncer=true", "")

    # Create engine with connection pooling
    # - pool_pre_ping: Verify connections before using them
    # - pool_size: Number of connections to maintain
    # - max_overflow: Additional connections beyond pool_size
    _engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=pool_size,
        max_overflow=10,
        echo=False,  # Set to True for SQL logging during development
    )

    return _engine


def reset_engine():
    """
    Reset the singleton engine (useful for testing).
    """
    global _engine
    if _engine:
        _engine.dispose()
        _engine = None
