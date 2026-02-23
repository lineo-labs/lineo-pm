"""Pydantic schemas for tasks and task-related API payloads."""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    """Base fields shared by task create/update schemas."""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = Field("todo", pattern="^(todo|in_progress|done)$")
    start_date: date
    end_date: date
    dependencies: List[int] = Field(default_factory=list)


class TaskCreate(TaskBase):
    """Schema for creating a task."""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating task fields (partial update support)."""
    scenario_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(todo|in_progress|done)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    dependencies: Optional[List[int]] = None


class TaskOut(TaskBase):
    """Schema returned by the API representing a task."""
    id: int
    order_index: int
    scenario_id: int

    class Config:
        from_attributes = True


class TaskReorder(BaseModel):
    """Payload for reordering tasks by explicit ID list."""
    ordered_ids: List[int] = Field(..., min_items=1)
