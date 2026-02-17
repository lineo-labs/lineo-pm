"""Database model for task entities.

Defines the `Task` SQLAlchemy model storing per-task data including
status, dates and dependencies.
"""

from sqlalchemy import JSON, Column, Date, ForeignKey, Integer, String, Text

from src.db.models.base import Base


class Task(Base):
    """Represent a task belonging to a project.

    Attributes:
        id (int): Primary key.
        project_id (int): ID of the parent project.
        title (str): Task title.
        description (str | None): Optional description.
        status (str): Task status (e.g. "todo", "done").
        start_date (date): Task start date.
        end_date (date): Task end date.
        order_index (int): Ordering index within the project/task list.
        dependencies (list): JSON list of dependency identifiers.
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="todo")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    dependencies = Column(JSON, nullable=False, default=list)
