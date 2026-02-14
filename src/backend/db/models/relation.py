from sqlalchemy import Column, ForeignKey, Integer, String

from backend.db.models.base import Base


class Relation(Base):
    __tablename__ = "relations"
    id_relation = Column("id", Integer, primary_key=True, index=True)
    # DB columns are named `origin` and `target` for the related task ids
    source_task_id = Column("origin", Integer, ForeignKey("tasks.id"), nullable=False)
    destination_task_id = Column("target", Integer, ForeignKey("tasks.id"), nullable=False)
    # relation column stores the relation type
    relation_type = Column("relation", String(16), nullable=False, default="fs")
