"""SQLAlchemy base declarative class for ORM models.

Provides the `Base` declarative base used by all database models in the
application.
"""

from sqlalchemy.orm import declarative_base

Base = declarative_base()