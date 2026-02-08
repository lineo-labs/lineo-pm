from datetime import date

from sqlalchemy.orm import Session

from backend.db.models.project import Project
from backend.db.models.task import Task


def ensure_default_project(db: Session) -> Project:
    project = db.query(Project).first()
    if project:
        return project

    project = Project(
        name="Novux PM",
        description="Default project for v0.1",
        start_date=date.today(),
        end_date=date.today(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def ensure_sample_tasks(db: Session, project_id: int) -> list[Task]:
    existing = db.query(Task).count()
    if existing:
        return db.query(Task).order_by(Task.order_index.asc()).all()

    tasks = [
        Task(
            project_id=project_id,
            title="Kickoff",
            description="Project kickoff & alignment",
            status="done",
            start_date=date.today(),
            end_date=date.today(),
            order_index=1,
            dependencies=[],
        ),
        Task(
            project_id=project_id,
            title="Design task list",
            description="Define the first backlog",
            status="in_progress",
            start_date=date.today(),
            end_date=date.today(),
            order_index=2,
            dependencies=[1],
        ),
        Task(
            project_id=project_id,
            title="Ship MVP backend",
            description="CRUD + basic timeline",
            status="todo",
            start_date=date.today(),
            end_date=date.today(),
            order_index=3,
            dependencies=[2],
        ),
    ]
    db.add_all(tasks)
    db.commit()
    return db.query(Task).order_by(Task.order_index.asc()).all()
