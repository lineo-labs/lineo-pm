from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UpdateBase(BaseModel):
    project_id: int
    text: str = Field(..., min_length=1)
    task_id: Optional[int] = None


class UpdateCreate(UpdateBase):
    pass


class UpdateOut(UpdateBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
