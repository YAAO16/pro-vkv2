from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173"]
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    class Config:
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if isinstance(self.ALLOWED_ORIGINS, str):
            self.ALLOWED_ORIGINS = json.loads(self.ALLOWED_ORIGINS)


settings = Settings()