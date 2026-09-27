"""
PhytoVision-X Backend API
FastAPI entrypoint with routing, CORS, DB lifecycle, and static files.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db, close_db
import app.models  # Ensure all models are registered with Base metadata
from app.api import (
    auth,
    fields,
    analyze,
    satellite,
    chat,
    alerts,
    risk,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown."""
    # Startup: ensure upload dir and initialize tables
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await init_db()
    yield
    # Shutdown: close DB connections
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Based Plant Disease Early Warning Platform using UAV, Satellite, and Leaf Imagery",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
raw_origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
origins = []
for entry in raw_origins:
    if entry:
        for url in entry.split(","):
            cleaned = url.strip()
            if cleaned and cleaned not in origins:
                origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not settings.DEBUG else ["*"],
    allow_origin_regex=r"https:\/\/.*\.vercel\.app" if not settings.DEBUG else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
settings.upload_path.mkdir(parents=True, exist_ok=True)

# Static file serving for uploads (heatmaps, uploaded images, UAV scans)
app.mount("/uploads", StaticFiles(directory=str(settings.upload_path)), name="uploads")

# Include API routers
app.include_router(auth.router)
app.include_router(fields.router)
app.include_router(analyze.router)
app.include_router(satellite.router)
app.include_router(chat.router)
app.include_router(alerts.router)
app.include_router(risk.router)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """System health and configuration status."""
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "demo_mode": settings.DEMO_MODE,
        "model_type": settings.MODEL_TYPE,
        "model_loaded": settings.model_weights_path.exists(),
    }
