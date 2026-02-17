"""Pydantic schemas for milestone API payloads and responses."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class MilestoneBase(BaseModel):
    """Base fields shared by milestone create/update schemas."""
    project_id: int
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: date


class MilestoneCreate(MilestoneBase):
    """Schema for creating a milestone."""
    pass


class MilestoneUpdate(BaseModel):
    """Schema for updating milestone fields (partial update support)."""
    project_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: Optional[date] = None


class MilestoneOut(MilestoneBase):
    """Schema returned by the API representing a milestone."""
    id: int

    class Config:
        from_attributes = True
