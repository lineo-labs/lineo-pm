"""Endpoints for project milestones (list, create, update, delete)."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.models.milestone import Milestone
from src.db.models.project import Project
from src.schemas.milestone import MilestoneCreate, MilestoneOut, MilestoneUpdate

router = APIRouter(prefix="/milestones", tags=["milestones"])


@router.get("", response_model=list[MilestoneOut])
def list_milestones(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """List milestones for a project ordered by target date.

    Args:
        project_id (int | None): Optional project id to filter milestones.
        db (Session): Database session provided by dependency.

    Returns:
        list[Milestone]: Ordered list of milestones.
    """
    query = db.query(Milestone)
    if project_id is not None:
        query = query.filter(Milestone.project_id == project_id)
    return query.order_by(Milestone.target_date.asc()).all()


@router.post("", response_model=MilestoneOut, status_code=201)
def create_milestone(payload: MilestoneCreate, db: Session = Depends(get_db)):
    """Create a milestone attached to a project.

    Args:
        payload (MilestoneCreate): Pydantic payload with milestone fields.
        db (Session): Database session provided by dependency.

    Returns:
        Milestone: The created milestone.
    """
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestone = Milestone(
        project_id=payload.project_id,
        title=payload.title,
        description=payload.description,
        target_date=payload.target_date,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.put("/{milestone_id}", response_model=MilestoneOut)
def update_milestone(milestone_id: int, payload: MilestoneUpdate, db: Session = Depends(get_db)):
    """Update fields of an existing milestone.

    Args:
        milestone_id (int): ID of the milestone to update.
        payload (MilestoneUpdate): Pydantic payload with updated fields.
        db (Session): Database session provided by dependency.

    Returns:
        Milestone: The updated milestone.
    """
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    fields_set = payload.model_fields_set
    if "project_id" in fields_set:
        milestone.project_id = payload.project_id
    if "title" in fields_set:
        milestone.title = payload.title
    if "description" in fields_set:
        milestone.description = payload.description
    if "target_date" in fields_set:
        milestone.target_date = payload.target_date

    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/{milestone_id}", status_code=204)
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    """Delete a milestone by ID.

    Args:
        milestone_id (int): ID of the milestone to delete.
        db (Session): Database session provided by dependency.
    """
    milestone = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(milestone)
    db.commit()
    return None
