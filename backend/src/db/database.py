"""Database engine and session utilities.

This module builds the SQLAlchemy engine, exposes a session factory and
provides helpers to initialise the database schema.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.setup import setup
from src.db.models.base import Base


def _build_engine():
    """Create and return a SQLAlchemy engine based on configuration.

    Returns:
        Engine: Configured SQLAlchemy engine.
    """
    database_url = setup.DATABASE_URL
    if database_url.startswith("sqlite"):
        return create_engine(
            database_url,
            echo=True,
            connect_args={"check_same_thread": False},
        )
    return create_engine(database_url, echo=True)


engine = _build_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Initialise database tables from SQLAlchemy models.

    This will import the models package to ensure all model classes are
    registered on the `Base` metadata and then create any missing tables.
    """
    print(f"Creating database tables in {setup.DATABASE_URL} ...")
    from src.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("Done.")


def get_db():
    """Yield a database session and ensure it is closed afterwards.

    Yields:
        Session: SQLAlchemy session for database operations.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()