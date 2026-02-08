import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.setup import setup
from backend.db.models.base import Base

def _build_engine():
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
    print(f"Creating database tables in {setup.DATABASE_URL} ...")
    from backend.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    print("Done.")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()