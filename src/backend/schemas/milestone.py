from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class MilestoneBase(BaseModel):
    project_id: int
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: date


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneUpdate(BaseModel):
    project_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: Optional[date] = None


class MilestoneOut(MilestoneBase):
    id: int

    class Config:
        from_attributes = True
