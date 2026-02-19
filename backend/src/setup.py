"""Application configuration using Pydantic settings.

Defines the `Setup` settings container and instantiates `setup` used by
other modules to access configuration values such as the database URL.
"""

from pydantic_settings import BaseSettings


class Setup(BaseSettings):
    """Configuration settings for the application.

    Attributes:
        DATABASE_URL (str): Database connection URL.
    """

    DATABASE_URL: str = "postgresql+psycopg://lineo:lineo@localhost:5432/lineo"


setup = Setup()