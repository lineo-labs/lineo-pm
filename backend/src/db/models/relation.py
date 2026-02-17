"""Database model for task relations.

Models a relationship between two tasks (e.g., finish-to-start). The
database columns use legacy names (`origin`, `target`, `relation`) which
are mapped to clearer attribute names on the model.
"""

from sqlalchemy import Column, ForeignKey, Integer, String

from src.db.models.base import Base


class Relation(Base):
    """Represent a relation between two tasks.

    Attributes:
        id_relation (int): Primary key.
        source_task_id (int): ID of the source/origin task.
        destination_task_id (int): ID of the destination/target task.
        relation_type (str): Relation type code (e.g. "FS").
    """
    __tablename__ = "relations"
    id_relation = Column("id", Integer, primary_key=True, index=True)
    # DB columns are named `origin` and `target` for the related task ids
    source_task_id = Column("origin", Integer, ForeignKey("tasks.id"), nullable=False)
    destination_task_id = Column("target", Integer, ForeignKey("tasks.id"), nullable=False)
    # relation column stores the relation type
    relation_type = Column("relation", String(16), nullable=False, default="FS")
