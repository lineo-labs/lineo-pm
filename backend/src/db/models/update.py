"""Database model for text updates associated with projects/tasks.

The `Update` model stores textual updates or comments and their creation
timestamp.
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text

from src.db.models.base import Base


class Update(Base):
    """Represent a textual update or comment.

    Attributes:
        id (int): Primary key.
        project_id (int): ID of the project the update belongs to.
        task_id (int | None): Optional task ID associated with the update.
        text (str): Update text.
        created_at (datetime): Creation timestamp.
    """
    __tablename__ = "updates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), index=True, nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.id"), index=True, nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
