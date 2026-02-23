"""Database model for scenario entities.

Defines the `Scenario` SQLAlchemy model which represents a saved scenario
configuration belonging to a project.
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.orm import relationship

from src.db.models.base import Base


class Scenario(Base):
    """Represent a scenario tied to a project.

    Attributes:
        id (int): Primary key.
        project_id (int): ID of the parent project.
        name (str): Scenario name.
        description (str | None): Optional description.
        created_at (datetime): Timestamp when scenario was created.
    """
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    # mark whether this scenario is the baseline; default False at Python and DB level
    is_baseline = Column(Boolean, nullable=False, default=False, server_default=text('false'))
    # tasks belonging to this scenario
    tasks = relationship("Task", back_populates="scenario", cascade="all, delete-orphan")
