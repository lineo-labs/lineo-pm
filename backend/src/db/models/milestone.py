"""Database model for milestone entities.

Defines the `Milestone` SQLAlchemy model used to represent project
milestones with target dates and descriptions.
"""

from sqlalchemy import Column, Date, ForeignKey, Integer, String, Text

from src.db.models.base import Base


class Milestone(Base):
    """Represent a project milestone.

    Attributes:
        id (int): Primary key.
        project_id (int): ID of the parent project.
        title (str): Milestone title.
        description (str | None): Optional description.
        target_date (date): Target date for the milestone.
    """
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_date = Column(Date, nullable=False)
