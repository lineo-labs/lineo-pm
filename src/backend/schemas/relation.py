from typing import Optional, Literal

from pydantic import BaseModel, Field


class RelationBase(BaseModel):
    project_id: int
    source_task_id: int
    destination_task_id: int
    relation_type: Literal["FS"] = "FS" # only "Finish to Start" supported for now


class RelationCreate(RelationBase):
    pass


class RelationUpdate(BaseModel):
    project_id: Optional[int] = None
    source_task_id: Optional[int] = None
    destination_task_id: Optional[int] = None
    relation_type: Optional[Literal["FS"]] = None


class RelationOut(RelationBase):
    id_relation: int

    class Config:
        from_attributes = True
