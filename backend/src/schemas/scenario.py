"""Pydantic schemas for scenarios and scenario-tasks."""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ScenarioBase(BaseModel):
    project_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ScenarioCreate(ScenarioBase):
    pass


class ScenarioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ScenarioOut(ScenarioBase):
    id: int
    is_baseline: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


# scenario-tasks have been unified into `Task` model. Use Task schemas
# from `src.schemas.task` for scenario-attached task payloads and responses.
