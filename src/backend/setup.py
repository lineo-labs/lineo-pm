from pydantic_settings import BaseSettings

class Setup(BaseSettings):

    DATABASE_URL: str = "postgresql+psycopg://lines:lines@localhost:5432/lines"

setup = Setup()