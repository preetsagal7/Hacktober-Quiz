"""
Hacktober 2026 — CyberQuiz FastAPI Application Entry Point
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import os

from app.core.config import settings
from app.core.database import init_db, AsyncSessionLocal
from app.core.seeder import seed_database
from app.core.question_bank import seed_questions
from app.api.v1 import admin_auth, admin, participant, quiz, public

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting Hacktober 2026 CyberQuiz backend...")

    # Initialize database tables
    await init_db()
    logger.info("Database tables initialized.")

    # Seed initial data
    async with AsyncSessionLocal() as session:
        await seed_database(session)
        await seed_questions(session)

    logger.info("Application ready. Environment: %s", settings.APP_ENV)
    yield
    logger.info("Application shutting down.")


app = FastAPI(
    title="Hacktober 2026 — CyberQuiz API",
    description="Backend API for the Hacktober 2026 Cybersecurity Quiz Challenge",
    version="1.0.0",
    lifespan=lifespan,
    # Disable docs in production for security
    docs_url="/api/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/api/redoc" if settings.APP_ENV != "production" else None,
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Global Error Handler ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )


# ─── API Routes ───
API_PREFIX = "/api/v1"

app.include_router(public.router, prefix=API_PREFIX)
app.include_router(admin_auth.router, prefix=API_PREFIX)
app.include_router(admin.router, prefix=API_PREFIX)
app.include_router(participant.router, prefix=API_PREFIX)
app.include_router(quiz.router, prefix=API_PREFIX)


# ─── Health Check ───
@app.get("/api/health")
async def health():
    return {"status": "ok", "event": settings.EVENT_NAME}


# ─── Static files (college logo, assets) ───
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
