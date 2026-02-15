"""Endpoints to list and create textual updates for projects/tasks."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models.project import Project
from backend.db.models.task import Task
from backend.db.models.update import Update
from backend.schemas.update import UpdateCreate, UpdateOut

router = APIRouter(prefix="/updates", tags=["updates"])


@router.get("", response_model=list[UpdateOut])
def list_updates(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """List updates for a project, newest first.

    Args:
        project_id (int | None): Optional project id to filter updates.
        db (Session): Database session provided by dependency.

    Returns:
        list[Update]: List of updates ordered by creation time (desc).
    """
    query = db.query(Update)
    if project_id is not None:
        query = query.filter(Update.project_id == project_id)
    return query.order_by(Update.created_at.desc()).all()


@router.post("", response_model=UpdateOut, status_code=201)
def create_update(payload: UpdateCreate, db: Session = Depends(get_db)):
    """Create a textual update attached to a project (and optional task).

    Args:
        payload (UpdateCreate): Pydantic payload for the update.
        db (Session): Database session provided by dependency.

    Returns:
        Update: The created update record.
    """
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.task_id is not None:
        task = db.query(Task).filter(Task.id == payload.task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        if task.project_id != payload.project_id:
            raise HTTPException(status_code=400, detail="Task does not belong to project")

    update = Update(
        project_id=payload.project_id,
        task_id=payload.task_id,
        text=payload.text,
    )
    db.add(update)
    db.commit()
    db.refresh(update)
    return update
