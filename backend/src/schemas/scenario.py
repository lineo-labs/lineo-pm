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


class ScenarioTaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = Field("todo", pattern="^(todo|in_progress|done)$")
    start_date: date
    end_date: date
    order_index: int = 0
    dependencies: List[int] = Field(default_factory=list)
    overrides: Optional[dict] = None
    task_id: Optional[int] = None


class ScenarioTaskCreate(ScenarioTaskBase):
    pass


class ScenarioTaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(todo|in_progress|done)$")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    order_index: Optional[int] = None
    dependencies: Optional[List[int]] = None
    overrides: Optional[dict] = None
    task_id: Optional[int] = None


class ScenarioTaskOut(ScenarioTaskBase):
    id: int
    scenario_id: int
    task_id: Optional[int]

    class Config:
        from_attributes = True
