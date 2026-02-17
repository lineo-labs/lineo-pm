"""Pydantic schemas for textual updates attached to projects/tasks."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UpdateBase(BaseModel):
    """Base fields for update creation and representation."""
    project_id: int
    text: str = Field(..., min_length=1)
    task_id: Optional[int] = None


class UpdateCreate(UpdateBase):
    """Schema for creating an update."""
    pass


class UpdateOut(UpdateBase):
    """Schema returned by the API representing an update."""
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
