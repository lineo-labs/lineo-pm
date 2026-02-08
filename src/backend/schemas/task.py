from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    project_id: int
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = Field("todo", pattern="^(todo|in_progress|done)$")
    start_date: date
    end_date: date
    dependencies: List[int] = Field(default_factory=list)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    project_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(todo|in_progress|done)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    dependencies: Optional[List[int]] = None


class TaskOut(TaskBase):
    id: int
    order_index: int

    class Config:
        from_attributes = True


class TaskReorder(BaseModel):
    ordered_ids: List[int] = Field(..., min_items=1)
