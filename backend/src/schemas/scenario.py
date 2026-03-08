"""Pydantic schemas for scenarios and scenario-tasks.

These schemas define the payloads used to create, update and retrieve
Scenario entities through the API.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ScenarioBase(BaseModel):
    """Base schema containing common fields shared by scenario models.

    This schema represents the core attributes of a scenario and is reused
    by other schemas such as `ScenarioCreate` and `ScenarioOut`.
    """

    project_id: int
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class ScenarioCreate(ScenarioBase):
    """Schema used when creating a new scenario.

    Inherits all fields from `ScenarioBase`. The payload must contain the
    project identifier and the scenario name.
    """

    pass


class ScenarioUpdate(BaseModel):
    """Schema used to update an existing scenario.

    All fields are optional to allow partial updates.
    Only the fields provided in the request will be updated.
    """

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None


class ScenarioOut(ScenarioBase):
    """Schema returned by the API when retrieving a scenario.

    Extends `ScenarioBase` with system-managed fields such as the
    scenario identifier, baseline flag, and creation timestamp.
    """

    id: int
    is_baseline: bool = False
    created_at: datetime

    class Config:
        """Pydantic configuration enabling ORM compatibility."""

        from_attributes = True


# scenario-tasks have been unified into `Task` model. Use Task schemas
# from `src.schemas.task` for scenario-attached task payloads and responses.