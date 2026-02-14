from typing import Optional

from pydantic import BaseModel, Field


class RelationBase(BaseModel):
    project_id: int
    source_task_id: int
    destination_task_id: int
    relation_type: str = Field("fs", min_length=1, max_length=16)


class RelationCreate(RelationBase):
    pass


class RelationUpdate(BaseModel):
    project_id: Optional[int] = None
    source_task_id: Optional[int] = None
    destination_task_id: Optional[int] = None
    relation_type: Optional[str] = None


class RelationOut(RelationBase):
    id_relation: int

    class Config:
        from_attributes = True
