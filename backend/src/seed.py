"""Helpers to create default/sample data for development.

These functions are used on startup to ensure a default project and a set
of sample tasks, updates and milestones exist in development environments.
"""

from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from src.db.models.project import Project
from src.db.models.scenario import Scenario
from src.db.models.task import Task
from src.db.models.update import Update
from src.db.models.milestone import Milestone


def ensure_default_project(db: Session) -> Project:
    """Ensure a default project exists, creating one if necessary.

    Args:
        db (Session): Database session used to query/create the project.

    Returns:
        Project: The existing or newly created default project.
    """
    project = db.query(Project).first()
    if project:
        return project

    today = date.today()
    project = Project(
        name="lineo-pm",
        description="MVP build for the initial release",
        start_date=today - timedelta(days=6),
        end_date=today + timedelta(days=21),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def ensure_default_scenario(db: Session, project: Project) -> Scenario:
    """Ensure there is a baseline scenario for the given project."""
    sc = db.query(Scenario).filter(Scenario.project_id == project.id, Scenario.is_baseline == True).first()
    if sc:
        return sc

    sc = Scenario(
        project_id=project.id,
        name="Baseline",
        description="Automatically created baseline scenario",
        is_baseline=True,
    )
    db.add(sc)
    db.commit()
    db.refresh(sc)
    return sc


def ensure_sample_tasks(db: Session, scenario_id: int) -> list[Task]:
    """Create a set of sample tasks attached to a scenario when none exist."""
    existing = db.query(Task).filter(Task.scenario_id == scenario_id).count()
    if existing:
        return db.query(Task).filter(Task.scenario_id == scenario_id).order_by(Task.order_index.asc()).all()

    today = date.today()
    tasks = [
        Task(
            scenario_id=scenario_id,
            title="Kickoff and scope alignment",
            description="Align on MVP scope, priorities, and success metrics",
            status="done",
            start_date=today - timedelta(days=6),
            end_date=today - timedelta(days=5),
            order_index=1,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="Design task list UX",
            description="Define layout, inline editing, and DnD behavior",
            status="done",
            start_date=today - timedelta(days=5),
            end_date=today - timedelta(days=3),
            order_index=2,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="Implement backend CRUD",
            description="FastAPI + PostgreSQL CRUD for projects and tasks",
            status="in_progress",
            start_date=today - timedelta(days=2),
            end_date=today + timedelta(days=2),
            order_index=3,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="Gantt interactions",
            description="Drag to move and resize tasks with date sync",
            status="todo",
            start_date=today + timedelta(days=2),
            end_date=today + timedelta(days=7),
            order_index=4,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
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
    """Create sample update records for a project if none exist.

    Args:
        db (Session): Database session used to query/create updates.
        project_id (int): Project id to attach updates to.
        tasks (list[Task]): Existing tasks to reference in some updates.

    Returns:
        list[Update]: List of updates ordered by creation time (desc).
    """
    existing = db.query(Update).filter(Update.project_id == project_id).count()
    if existing:
        return db.query(Update).filter(Update.project_id == project_id).order_by(Update.created_at.desc()).all()

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
    """Create sample milestones for a project if none exist.

    Args:
        db (Session): Database session used to query/create milestones.
        project_id (int): Project id to attach milestones to.

    Returns:
        list[Milestone]: Ordered list of milestones.
    """
    existing = db.query(Milestone).filter(Milestone.project_id == project_id).count()
    if existing:
        return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.target_date.asc()).all()

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
    return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.target_date.asc()).all()


def ensure_second_project(db: Session) -> Project:
    """Ensure a second demo project exists, creating one if necessary.

    Args:
        db (Session): Database session used to query/create the project.

    Returns:
        Project: The existing or newly created second project.
    """
    project = db.query(Project).filter(Project.name == "Mobile App Launch").first()
    if project:
        return project

    today = date.today()
    project = Project(
        name="Mobile App Launch",
        description="Cross-platform mobile app development and launch initiative",
        start_date=today - timedelta(days=14),
        end_date=today + timedelta(days=60),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def ensure_second_project_tasks(db: Session, scenario_id: int) -> list[Task]:
    """Create sample tasks for the second project scenario."""
    existing = db.query(Task).filter(Task.scenario_id == scenario_id).count()
    if existing:
        return db.query(Task).filter(Task.scenario_id == scenario_id).order_by(Task.order_index.asc()).all()

    today = date.today()
    tasks = [
        Task(
            scenario_id=scenario_id,
            title="Requirements and technical architecture",
            description="Define app requirements, platform strategy (iOS/Android/Web), architecture patterns",
            status="done",
            start_date=today - timedelta(days=14),
            end_date=today - timedelta(days=10),
            order_index=1,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="Design UI mockups and prototypes",
            description="Create wireframes, high-fidelity designs, and interactive prototypes",
            status="done",
            start_date=today - timedelta(days=10),
            end_date=today - timedelta(days=6),
            order_index=2,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="Setup build pipeline and CI/CD",
            description="Configure build environments, automated testing, deployment pipelines",
            status="in_progress",
            start_date=today - timedelta(days=5),
            end_date=today + timedelta(days=3),
            order_index=3,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="Core feature implementation",
            description="Implement authentication, data sync, offline capabilities",
            status="todo",
            start_date=today + timedelta(days=1),
            end_date=today + timedelta(days=20),
            order_index=4,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="Beta testing and QA",
            description="User acceptance testing, bug fixes, performance optimization",
            status="todo",
            start_date=today + timedelta(days=18),
            end_date=today + timedelta(days=35),
            order_index=5,
            dependencies=[],
        ),
        Task(
            scenario_id=scenario_id,
            title="App store submission and launch",
            description="Store listing creation, review process, production deployment",
            status="todo",
            start_date=today + timedelta(days=33),
            end_date=today + timedelta(days=45),
            order_index=6,
            dependencies=[],
        ),
    ]
    db.add_all(tasks)
    db.commit()
    return db.query(Task).filter(Task.scenario_id == scenario_id).order_by(Task.order_index.asc()).all()


def ensure_second_project_updates(db: Session, project_id: int, tasks: list[Task]) -> list[Update]:
    """Create sample updates for the second project.

    Args:
        db (Session): Database session used to query/create updates.
        project_id (int): Project id to attach updates to.
        tasks (list[Task]): Existing tasks to reference in some updates.

    Returns:
        list[Update]: List of updates ordered by creation time (desc).
    """
    existing = db.query(Update).filter(Update.project_id == project_id).count()
    if existing:
        return db.query(Update).filter(Update.project_id == project_id).order_by(Update.created_at.desc()).all()

    now = datetime.utcnow()
    task_lookup = {task.title: task.id for task in tasks}
    updates = [
        Update(
            project_id=project_id,
            text="Stakeholder kickoff completed. Product vision aligned across iOS, Android, and Web teams.",
            created_at=now - timedelta(days=10, hours=8),
        ),
        Update(
            project_id=project_id,
            task_id=task_lookup.get("Design UI mockups and prototypes"),
            text="All major user flows designed. Design system tokens finalized. Ready for dev handoff.",
            created_at=now - timedelta(days=5, hours=12),
        ),
        Update(
            project_id=project_id,
            task_id=task_lookup.get("Setup build pipeline and CI/CD"),
            text="CI/CD pipelines operational. Automated testing gates in place. Code coverage at 78%.",
            created_at=now - timedelta(days=2, hours=4),
        ),
        Update(
            project_id=project_id,
            text="Started core feature sprints. OAuth2 authentication module complete. Offline sync in progress.",
            created_at=now - timedelta(hours=18),
        ),
    ]
    db.add_all(updates)
    db.commit()
    return db.query(Update).filter(Update.project_id == project_id).order_by(Update.created_at.desc()).all()


def ensure_second_project_milestones(db: Session, project_id: int) -> list[Milestone]:
    """Create sample milestones for the second project.

    Args:
        db (Session): Database session used to query/create milestones.
        project_id (int): Project id to attach milestones to.

    Returns:
        list[Milestone]: Ordered list of milestones.
    """
    existing = db.query(Milestone).filter(Milestone.project_id == project_id).count()
    if existing:
        return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.target_date.asc()).all()

    today = date.today()
    milestones = [
        Milestone(
            project_id=project_id,
            title="Design system complete",
            description="UI components library and design tokens finalized",
            target_date=today - timedelta(days=6),
        ),
        Milestone(
            project_id=project_id,
            title="CI/CD pipelines operational",
            description="Automated builds and testing infrastructure ready",
            target_date=today + timedelta(days=3),
        ),
        Milestone(
            project_id=project_id,
            title="Core features working",
            description="MVP features implemented and integrated",
            target_date=today + timedelta(days=20),
        ),
        Milestone(
            project_id=project_id,
            title="Beta launch",
            description="Internal and external beta testing begins",
            target_date=today + timedelta(days=35),
        ),
        Milestone(
            project_id=project_id,
            title="Public release",
            description="Live in all app stores with marketing push",
            target_date=today + timedelta(days=45),
        ),
    ]
    db.add_all(milestones)
    db.commit()
    return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.target_date.asc()).all()
