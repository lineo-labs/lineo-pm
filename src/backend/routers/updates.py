from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models.project import Project
from backend.db.models.update import Update
from backend.schemas.update import UpdateCreate, UpdateOut

router = APIRouter(prefix="/updates", tags=["updates"])


@router.get("", response_model=list[UpdateOut])
def list_updates(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Update)
    if project_id is not None:
        query = query.filter(Update.project_id == project_id)
    return query.order_by(Update.created_at.desc()).all()


@router.post("", response_model=UpdateOut, status_code=201)
def create_update(payload: UpdateCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update = Update(
        project_id=payload.project_id,
        text=payload.text,
    )
    db.add(update)
    db.commit()
    db.refresh(update)
    return update
