"""Pydantic schemas for milestone API payloads and responses.

This module defines data validation schemas for milestone management endpoints:
- `MilestoneCreate`: Request body for creating new milestones
- `MilestoneUpdate`: Request body for updating existing milestones
- `MilestoneOut`: Response body returned by API after operations

Milestones represent critical dates or deliverables in a project timeline.
They serve as reference points for project planning and tracking.
"""

from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class MilestoneBase(BaseModel):
    """Base fields shared by milestone create/update schemas.
    
    Contains the core milestone information required for both creation
    and updates. Serves as parent class for MilestoneCreate.
    
    Attributes:
        project_id: ID of the project this milestone belongs to
        title: Milestone name/title (1-255 characters)
        description: Optional detailed description of the milestone
        target_date: Target completion date for this milestone
    """
    project_id: int
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: date


class MilestoneCreate(MilestoneBase):
    """Schema for creating a new milestone.
    
    Request body for POST /projects/{project_id}/milestones
    
    Inherits all base fields from MilestoneBase.
    Used when the frontend sends a request to create a milestone.
    
    Example:
        {
            "project_id": 1,
            "title": "Alpha Release",
            "description": "Initial product release to beta testers",
            "target_date": "2024-06-15"
        }
    """
    pass


class MilestoneUpdate(BaseModel):
    """Schema for updating milestone fields (partial update support).
    
    Request body for PATCH /milestones/{milestone_id}
    
    All fields are optional, allowing partial updates without requiring
    all fields to be specified. Only provided fields will be updated.
    
    Attributes:
        project_id: (Optional) Project ID - can reassign to different project
        title: (Optional) New milestone title (1-255 characters if provided)
        description: (Optional) New description or clear with null
        target_date: (Optional) New target completion date
    
    Example (update only title and date):
        {
            "title": "Beta Release",
            "target_date": "2024-07-01"
        }
    """
    project_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    target_date: Optional[date] = None


class MilestoneOut(MilestoneBase):
    """Schema returned by the API representing a milestone.
    
    Response body from:
    - POST /projects/{project_id}/milestones (create)
    - PATCH /milestones/{milestone_id} (update)
    - GET /projects/{project_id}/milestones (list)
    - GET /milestones/{milestone_id} (get single)
    
    Includes all base fields plus the database-generated ID.
    
    Attributes:
        id: Database ID of the milestone (automatically generated)
        project_id: ID of the project this milestone belongs to
        title: Milestone name/title
        description: Optional detailed description
        target_date: Target completion date
    
    Example:
        {
            "id": 42,
            "project_id": 1,
            "title": "Alpha Release",
            "description": "Initial product release to beta testers",
            "target_date": "2024-06-15"
        }
    
    Note:
        ORM mode (`from_attributes=True`) enabled for SQLAlchemy compatibility.
        This allows direct conversion from database models to this schema.
    """
    id: int

    class Config:
        """Pydantic configuration for SQLAlchemy ORM compatibility."""
        from_attributes = True
