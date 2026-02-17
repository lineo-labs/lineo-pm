"""Database model for project entities.

This module defines the `Project` SQLAlchemy model used to store
project metadata such as name, description and start/end dates.
"""

from sqlalchemy import Column, Date, Integer, String, Text

from src.db.models.base import Base


class Project(Base):
    """Represent a project in the database.

    Attributes:
        id (int): Primary key.
        name (str): Project name.
        description (str | None): Optional project description.
        start_date (date): Project start date.
        end_date (date): Project end date.
    """
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
