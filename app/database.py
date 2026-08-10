"""
database.py — SQLAlchemy engine/session setup.

Uses SQLite by default so the project runs with zero external setup
(`python3 seed_db.py` creates aqi.db right next to this file). To switch to
PostgreSQL for Phase 5's real deployment, just change DATABASE_URL to
something like:

    postgresql://user:password@localhost:5432/aqi_db

No other code changes needed — SQLAlchemy abstracts the rest.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./aqi.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
