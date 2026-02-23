"""Pydantic schemas for task relations and possible-relation responses."""

from typing import Optional, Literal

from pydantic import BaseModel, Field


class RelationBase(BaseModel):
    """Base fields for relation schemas.

    Only finish-to-start ('FS') relations are supported currently.
    """
    scenario_id: int
    source_task_id: int
    destination_task_id: int
    relation_type: Literal["FS"] = "FS"  # only "Finish to Start" supported for now


class RelationCreate(RelationBase):
    """Schema for creating a relation."""
    pass


class RelationUpdate(BaseModel):
    """Schema for partially updating a relation."""
    scenario_id: Optional[int] = None
    source_task_id: Optional[int] = None
    destination_task_id: Optional[int] = None
    relation_type: Optional[Literal["FS"]] = None


class RelationOut(RelationBase):
    """Schema returned by the API representing a relation."""
    id_relation: int

    class Config:
        from_attributes = True


# Response model for /relations/possible endpoint
from src.schemas.task import TaskOut


class PossibleRelationsOut(BaseModel):
    """Response containing possible and active relations for a task."""
    possible: list[TaskOut]
    active: list[RelationOut]

    class Config:
        from_attributes = True
