from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models.project import Project
from backend.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(tags=["project"])


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).order_by(Project.id.asc()).all()


@router.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(
        name=payload.name,
        description=payload.description,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.name = payload.name
    project.description = payload.description
    project.start_date = payload.start_date
    project.end_date = payload.end_date
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return None


@router.get("/project", response_model=ProjectOut)
def get_default_project(db: Session = Depends(get_db)):
    project = db.query(Project).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/project", response_model=ProjectOut)
def upsert_default_project(payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = db.query(Project).first()
    if project:
        project.name = payload.name
        project.description = payload.description
        project.start_date = payload.start_date
        project.end_date = payload.end_date
    else:
        project = Project(
            name=payload.name,
            description=payload.description,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )
        db.add(project)
    db.commit()
    db.refresh(project)
    return project
