from pydantic_settings import BaseSettings

class Setup(BaseSettings):

    DATABASE_URL: str = "postgresql+psycopg://novux:novux@localhost:5432/novux"

setup = Setup()