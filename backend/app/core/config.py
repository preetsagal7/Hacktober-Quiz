import os
import secrets
from typing import List, Tuple
from pydantic_settings import BaseSettings

_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_ROOT_DIR = os.path.dirname(_BASE_DIR)

# Canonical SQLite database path in backend directory
_DEFAULT_DB_FILE = os.path.join(_BASE_DIR, "cyberquiz.db").replace("\\", "/")
_DEFAULT_DB_URL = f"sqlite+aiosqlite:///{_DEFAULT_DB_FILE}"

_ENV_FILES: Tuple[str, ...] = (
    os.path.join(_BASE_DIR, ".env"),
    os.path.join(_ROOT_DIR, ".env"),
    ".env",
)


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    APP_SECRET_KEY: str = secrets.token_hex(32)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Database
    DATABASE_URL: str = _DEFAULT_DB_URL

    # JWT
    JWT_SECRET_KEY: str = secrets.token_hex(32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 1

    # Admin Credentials
    INITIAL_ADMIN_ID: str = ""
    INITIAL_ADMIN_PASSWORD: str = ""
    ADMIN_GMAIL: str = "preetsagal7@gmail.com"

    # Supabase Auth
    SUPABASE_URL: str = "https://qjckcykrovgbfbuvezdwf.supabase.co"
    SUPABASE_ANON_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqY2tjeWtyb3ZnZmJ1dmV6ZHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzNzIxMjMsImV4cCI6MjEwNzk0ODEyM30.4pL_e_9Rcft9Kl4iMmTK20xPivLKk8BU5SHpAJ6OVIU"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    LOGIN_RATE_LIMIT: str = "5/minute"

    # Event
    EVENT_NAME: str = "Hacktober 2026"
    EVENT_TIMEZONE: str = "Asia/Kolkata"

    # Certificate
    CERT_SIGNING_SECRET: str = secrets.token_hex(16)

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL.strip()
        # Handle Render / standard postgres url formats
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and not (
            url.startswith("postgresql+asyncpg://") or url.startswith("postgresql+psycopg://")
        ):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        # asyncpg expects ssl= rather than sslmode=
        if "postgresql+asyncpg://" in url and "sslmode=" in url:
            url = url.replace("sslmode=require", "ssl=require").replace("sslmode=prefer", "ssl=prefer").replace("sslmode=disable", "ssl=disable")

        # Normalize relative sqlite URLs so CWD differences don't create blank databases
        if url in ("sqlite+aiosqlite:///./cyberquiz.db", "sqlite+aiosqlite:///cyberquiz.db"):
            return _DEFAULT_DB_URL
        return url

    class Config:
        env_file = _ENV_FILES
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

