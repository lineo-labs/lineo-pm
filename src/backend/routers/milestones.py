from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models.milestone import Milestone
from backend.db.models.project import Project
from backend.schemas.milestone import MilestoneCreate, MilestoneOut, MilestoneUpdate

router = APIRouter(prefix="/milestones", tags=["milestones"])


@router.get("", response_model=list[MilestoneOut])
def list_milestones(
    project_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(Milestone)
    if project_id is not None:
        query = query.filter(Milestone.project_id == project_id)
    return query.order_by(Milestone.target_date.asc()).all()


@router.post("", response_model=MilestoneOut, status_code=201)
def create_milestone(payload: MilestoneCreate, db: Session = Depends(get_db)):
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
