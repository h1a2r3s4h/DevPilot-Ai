from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    OPENROUTER_API_KEY: str
    REDIS_URL: str

    class Config:
        env_file = Path(__file__).parent.parent.parent / ".env"
        env_file_encoding = "utf-8"

settings = Settings()