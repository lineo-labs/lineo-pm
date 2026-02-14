from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from backend.db.models.project import Project
from backend.db.models.task import Task
from backend.db.models.update import Update
from backend.db.models.milestone import Milestone


def ensure_default_project(db: Session) -> Project:
    project = db.query(Project).first()
    if project:
        return project

    today = date.today()
    project = Project(
        name="lines-pm",
        description="MVP build for the initial release",
        start_date=today - timedelta(days=6),
        end_date=today + timedelta(days=21),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def ensure_sample_tasks(db: Session, project_id: int) -> list[Task]:
    existing = db.query(Task).count()
    if existing:
        return db.query(Task).order_by(Task.order_index.asc()).all()

    today = date.today()
    tasks = [
        Task(
            project_id=project_id,
            title="Kickoff and scope alignment",
            description="Align on MVP scope, priorities, and success metrics",
            status="done",
            start_date=today - timedelta(days=6),
            end_date=today - timedelta(days=5),
            order_index=1,
            dependencies=[],
        ),
        Task(
            project_id=project_id,
            title="Design task list UX",
            description="Define layout, inline editing, and DnD behavior",
            status="done",
            start_date=today - timedelta(days=5),
            end_date=today - timedelta(days=3),
            order_index=2,
            dependencies=[],
        ),
        Task(
            project_id=project_id,
            title="Implement backend CRUD",
            description="FastAPI + PostgreSQL CRUD for projects and tasks",
            status="in_progress",
            start_date=today - timedelta(days=2),
            end_date=today + timedelta(days=2),
            order_index=3,
            dependencies=[],
        ),
        Task(
            project_id=project_id,
            title="Gantt interactions",
            description="Drag to move and resize tasks with date sync",
            status="todo",
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=7),
            order_index=4,
            dependencies=[],
        ),
        Task(
            project_id=project_id,
            title="Polish UI states",
            description="Empty states, error handling, and loading feedback",
            status="todo",
            start_date=today + timedelta(days=6),
            end_date=today + timedelta(days=12),
            order_index=5,
            dependencies=[],
        ),
    ]
    db.add_all(tasks)
    db.commit()
    return db.query(Task).order_by(Task.order_index.asc()).all()


def ensure_sample_updates(db: Session, project_id: int, tasks: list[Task]) -> list[Update]:
    existing = db.query(Update).count()
    if existing:
        return db.query(Update).order_by(Update.created_at.desc()).all()

    now = datetime.utcnow()
    task_lookup = {task.title: task.id for task in tasks}
    updates = [
        Update(
            project_id=project_id,
            text="Kickoff completed. MVP scope locked and priorities agreed.",
            created_at=now - timedelta(days=5, hours=4),
        ),
        Update(
            project_id=project_id,
            task_id=task_lookup.get("Design task list UX"),
            text="Task list layout approved. Inline editing feels good.",
            created_at=now - timedelta(days=3, hours=6),
        ),
        Update(
            project_id=project_id,
            task_id=task_lookup.get("Implement backend CRUD"),
            text="CRUD endpoints wired. Need to add updates table migration.",
            created_at=now - timedelta(days=1, hours=3),
        ),
        Update(
            project_id=project_id,
            text="Next focus: gantt interactions and basic polish.",
            created_at=now - timedelta(hours=6),
        ),
    ]
    db.add_all(updates)
    db.commit()
    return db.query(Update).order_by(Update.created_at.desc()).all()


def ensure_sample_milestones(db: Session, project_id: int) -> list[Milestone]:
    existing = db.query(Milestone).count()
    if existing:
        return db.query(Milestone).order_by(Milestone.target_date.asc()).all()

    today = date.today()
    milestones = [
        Milestone(
            project_id=project_id,
            title="MVP scope locked",
            description="All core v0.1 items confirmed",
            target_date=today - timedelta(days=5),
        ),
        Milestone(
            project_id=project_id,
            title="Backend CRUD ready",
            description="API + DB schema stable",
            target_date=today + timedelta(days=2),
        ),
        Milestone(
            project_id=project_id,
            title="Gantt interactions",
            description="Drag and resize synced",
            target_date=today + timedelta(days=7),
        ),
        Milestone(
            project_id=project_id,
            title="Polish pass",
            description="UI copy, empty states, and performance",
            target_date=today + timedelta(days=12),
        ),
    ]
    db.add_all(milestones)
    db.commit()
    return db.query(Milestone).order_by(Milestone.target_date.asc()).all()
