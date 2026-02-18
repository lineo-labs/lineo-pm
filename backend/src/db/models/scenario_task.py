"""Database model for scenario task entries.

Defines the `ScenarioTask` SQLAlchemy model which models tasks as part of a
scenario (may reference an existing task or be a scenario-specific item).
"""

from sqlalchemy import JSON, Column, Date, ForeignKey, Integer, String, Text

from src.db.models.base import Base


class ScenarioTask(Base):
    """Represent a task within a scenario.

    Attributes:
        id (int): Primary key.
        scenario_id (int): ID of the parent scenario.
        task_id (int | None): Optional reference to an existing task.
        title (str): Task title.
        description (str | None): Optional description.
        status (str): Task status (e.g. "todo", "in_progress").
        start_date (date): Task start date.
        end_date (date): Task end date.
        order_index (int): Ordering index within the scenario.
        overrides (dict | None): JSON object with override values.
        dependencies (list[int]): JSON list of predecessor scenario-task ids.
    """
    __tablename__ = "scenario_tasks"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"), index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="todo")
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    order_index = Column(Integer, nullable=False, default=0)
    dependencies = Column(JSON, nullable=False, default=list)
    overrides = Column(JSON, nullable=True, default=dict)
