"""Generate simple CRUD API routes dynamically for all registered models.

This module inspects SQLAlchemy model mappers and exposes a set of generic
CRUD endpoints for each model. It is intended for development/testing use.
"""

from fastapi import APIRouter
from src.db.database import SessionLocal
from pydantic import BaseModel
from sqlalchemy.orm import Session
from src.db.models.base import Base


def get_all_models():
    """Yield all SQLAlchemy model classes registered on the declarative base."""
    for mapper in Base.registry.mappers:
        yield mapper.class_


def generate_crud_routes():
    """Create and return an `APIRouter` with generic CRUD endpoints.

    Returns:
        APIRouter: Router containing create/read/update/delete endpoints for
            each discovered model.
    """
    router = APIRouter()

    def get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    for model in get_all_models():
        model_name = model.__name__.lower()

        # Pydantic schema dinamico
        schema = type(
            f"{model.__name__}Schema",
            (BaseModel,),
            {col.name: (col.type.python_type, None) for col in model.__table__.columns}
        )

        # --- CREATE ---
        @router.post(f"/{model_name}/create")
        def create_item(item: schema, db: Session = next(get_db())):
            obj = model(**item.dict())
            db.add(obj)
            db.commit()
            db.refresh(obj)
            return obj

        # --- READ ALL ---
        @router.get(f"/{model_name}/all")
        def read_all(db: Session = next(get_db())):
            return db.query(model).all()

        # --- READ ONE ---
        @router.get(f"/{model_name}/{{item_id}}")
        def read_item(item_id: int, db: Session = next(get_db())):
            return db.query(model).get(item_id)

        # --- UPDATE ---
        @router.put(f"/{model_name}/{{item_id}}")
        def update_item(item_id: int, item: schema, db: Session = next(get_db())):
            obj = db.query(model).get(item_id)
            for key, value in item.dict().items():
                setattr(obj, key, value)
            db.commit()
            return obj

        # --- DELETE ---
        @router.delete(f"/{model_name}/{{item_id}}")
        def delete_item(item_id: int, db: Session = next(get_db())):
            obj = db.query(model).get(item_id)
            db.delete(obj)
            db.commit()
            return {"status": "deleted"}

    return router


router = generate_crud_routes()