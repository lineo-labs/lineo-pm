"""Database model for task entities.

Defines the `Task` SQLAlchemy model storing per-task data including
status, dates and dependencies.
"""

from sqlalchemy import JSON, Column, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from src.db.models.base import Base


class Task(Base):
    """Represent a task belonging to a scenario.

    Tasks are associated to a single `Scenario` via `scenario_id`. Multiple
    scenarios may contain tasks with similar content but each task row is
    unique (unique primary key). Attributes:
        id (int): Primary key.
        scenario_id (int): ID of the parent scenario.
        title (str): Task title.
        description (str | None): Optional description.
        status (str): Task status (e.g. "todo", "done").
        start_date (date): Task start date.
        end_date (date): Task end date.
        order_index (int): Ordering index within the scenario.
            dependencies (list): JSON list of dependency task ids (within same scenario).
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    # project association removed: tasks now belong to scenarios
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="todo")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    dependencies = Column(JSON, nullable=False, default=list)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), index=True, nullable=False)
    # relationship back to scenario (required)
    scenario = relationship("Scenario", back_populates="tasks")
