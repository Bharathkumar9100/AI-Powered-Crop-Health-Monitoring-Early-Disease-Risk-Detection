"""
PhytoVision-X Configuration
Loads settings from environment variables with sensible defaults.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from .env file."""

    # --- Application ---
    APP_NAME: str = "PhytoVision-X Enterprise"
    DEMO_MODE: bool = False
    DEBUG: bool = False

    # --- Security ---
    SECRET_KEY: str = "dev-secret-key-change-in-production-please"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # --- Database ---
    DATABASE_URL: str = "sqlite+aiosqlite:///./phytovision.db"

    # --- ML Model ---
    MODEL_PATH: str = "models/plant_disease_model"
    MODEL_TYPE: str = "mobilenet_v2"

    # --- File Upload ---
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = ".jpg,.jpeg,.png,.webp,.tiff"

    # --- AI Chatbot ---
    GEMINI_API_KEY: Optional[str] = None

    # --- Satellite & NDVI Analysis ---
    COPERNICUS_CLIENT_ID: Optional[str] = None
    COPERNICUS_CLIENT_SECRET: Optional[str] = None
    PLANETARY_COMPUTER_API_KEY: Optional[str] = None
    SENTINEL_DATA_PROVIDER: str = "copernicus"  # copernicus, stac, demo
    SENTINEL_MAX_CLOUD_COVER: float = 20.0
    SENTINEL_SEARCH_DAYS_BACK: int = 30
    NDVI_HEALTHY_THRESHOLD: float = 0.60
    NDVI_MODERATE_THRESHOLD: float = 0.35

    # --- Weather ---
    WEATHER_API_URL: str = "https://api.open-meteo.com/v1/forecast"

    # --- CORS ---
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def upload_path(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def model_weights_path(self) -> Path:
        p = Path(self.MODEL_PATH)
        if p.exists():
            return p
        # Check relative to backend/app/config.py (workspace root)
        root_dir = Path(__file__).resolve().parent.parent.parent
        p_root = root_dir / self.MODEL_PATH
        if p_root.exists():
            return p_root
        p_parent = Path.cwd().parent / self.MODEL_PATH
        if p_parent.exists():
            return p_parent
        return p

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_SIZE_MB * 1024 * 1024

    @property
    def has_gemini_key(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY.strip())

    @property
    def has_satellite_credentials(self) -> bool:
        return bool(self.COPERNICUS_CLIENT_ID and self.COPERNICUS_CLIENT_SECRET)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
