from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base


_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def init_engine(database_url: str) -> None:
    global _engine
    if _engine is not None:
        return
    _engine = create_engine(database_url, pool_pre_ping=True)


def init_session_factory() -> None:
    global _SessionLocal
    if _engine is None:
        raise RuntimeError("Engine not initialized. Call init_engine first.")
    if _SessionLocal is not None:
        return
    _SessionLocal = sessionmaker(bind=_engine, autocommit=False, autoflush=False)


def create_all() -> None:
    if _engine is None:
        raise RuntimeError("Engine not initialized.")
    Base.metadata.create_all(bind=_engine)


@contextmanager
def db_session() -> Iterator[Session]:
    if _SessionLocal is None:
        raise RuntimeError("Session factory not initialized.")
    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

