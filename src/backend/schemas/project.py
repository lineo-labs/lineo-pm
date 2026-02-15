"""Pydantic schemas for project API payloads and responses."""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    """Base fields shared by project create/update schemas."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    start_date: date
    end_date: date


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""
    pass


class ProjectUpdate(ProjectBase):
    """Schema for updating a project."""
    pass


class ProjectOut(ProjectBase):
    """Schema returned by the API representing a project."""
    id: int

    class Config:
        from_attributes = True
