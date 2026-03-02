"""API routes for project CRUD operations.

Provides endpoints to list, create, retrieve, update and delete projects.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db.database import get_db
from src.db.models.project import Project
from src.db.models.scenario import Scenario
from src.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(tags=["project"])


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)):
    """List all projects ordered by ID.

    Args:
        db (Session): Database session provided by dependency.

    Returns:
        list[Project]: List of project instances.
    """
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
    # Auto-create a baseline Scenario for the new project
    baseline = Scenario(
        project_id=project.id,
        name=f"Baseline - {project.name}",
        description="Auto-created baseline scenario",
        is_baseline=True,
    )
    db.add(baseline)
    db.commit()
    db.refresh(baseline)
    return project
    """Create a new project from the provided payload.

    Args:
        payload (ProjectCreate): Pydantic payload with project fields.
        db (Session): Database session provided by dependency.

    Returns:
        Project: The created project instance.
    """


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
    """Retrieve a project by ID.

    Args:
        project_id (int): ID of the project to retrieve.
        db (Session): Database session provided by dependency.

    Returns:
        Project: The requested project.
    """


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
    """Update an existing project with new values.

    Args:
        project_id (int): ID of the project to update.
        payload (ProjectUpdate): Pydantic payload with updated fields.
        db (Session): Database session provided by dependency.

    Returns:
        Project: The updated project instance.
    """


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
    return None
    """Delete a project by ID.

    Args:
        project_id (int): ID of the project to delete.
        db (Session): Database session provided by dependency.
    """


@router.get("/project", response_model=ProjectOut)
def get_default_project(db: Session = Depends(get_db)):
    project = db.query(Project).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
    """Return the first (default) project.

    Args:
        db (Session): Database session provided by dependency.

    Returns:
        Project: The default project.
    """


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
    """Create or update the default project.

    If a project exists, update its fields; otherwise create a new one.

    Args:
        payload (ProjectUpdate): Pydantic payload with project fields.
        db (Session): Database session provided by dependency.

    Returns:
        Project: The created or updated project.
    """
