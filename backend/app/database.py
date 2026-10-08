"""
PhytoVision-X Database Configuration
Async SQLAlchemy engine and session management.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    # SQLite-specific: enable WAL mode for better concurrency
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that provides a database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def _safe_add_column(connection, table_name: str, column_name: str, column_type: str):
    """Safely add column to SQLite table if it does not already exist."""
    try:
        cursor = connection.connection.cursor()
        cursor.execute(f"PRAGMA table_info({table_name});")
        existing_cols = [row[1] for row in cursor.fetchall()]
        if column_name not in existing_cols:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type};")
    except Exception:
        pass


def _migrate_schema_sync(connection):
    """Synchronous schema sync with non-destructive ALTER TABLE additions."""
    Base.metadata.create_all(connection)
    if "sqlite" in settings.DATABASE_URL:
        _safe_add_column(connection, "fields", "boundary_geojson", "TEXT")
        _safe_add_column(connection, "satellite_observations", "image_id", "VARCHAR(255)")
        _safe_add_column(connection, "satellite_observations", "latitude", "FLOAT")
        _safe_add_column(connection, "satellite_observations", "longitude", "FLOAT")
        _safe_add_column(connection, "satellite_observations", "field_geometry", "TEXT")
        _safe_add_column(connection, "satellite_observations", "rgb_image_path", "VARCHAR(500)")
        _safe_add_column(connection, "satellite_observations", "stress_map_path", "VARCHAR(500)")
        _safe_add_column(connection, "satellite_observations", "healthy_area_pct", "FLOAT")
        _safe_add_column(connection, "satellite_observations", "moderate_stress_pct", "FLOAT")
        _safe_add_column(connection, "satellite_observations", "high_stress_pct", "FLOAT")
        _safe_add_column(connection, "satellite_observations", "processing_status", "VARCHAR(50)")
        _safe_add_column(connection, "satellite_observations", "scientific_advisory", "TEXT")


async def init_db():
    """Create all tables on startup, run safe schema migrations, and ensure demo seed user exists."""
    async with engine.begin() as conn:
        await conn.run_sync(_migrate_schema_sync)

    # Seed demo farmer if not present
    async with AsyncSessionLocal() as session:
        try:
            from sqlalchemy import select
            from app.models.user import User
            from app.models.field import Field
            from app.utils.security import hash_password

            existing = await session.execute(select(User).where(User.username == "demo_farmer"))
            user = existing.scalar_one_or_none()
            if not user:
                user = User(
                    username="demo_farmer",
                    email="farmer@phytovision.org",
                    full_name="Rajesh Kumar (Surya Green Farms)",
                    hashed_password=hash_password("farmer123"),
                    language="en",
                    is_active=True,
                )
                session.add(user)
                await session.flush()
                await session.refresh(user)

            existing_field = await session.execute(select(Field).where(Field.user_id == user.id))
            if not existing_field.scalar_one_or_none():
                f1 = Field(
                    user_id=user.id,
                    name="North Block (Tomato & Potato)",
                    crop="Tomato",
                    area_hectares=2.4,
                    latitude=11.1271,
                    longitude=78.6569,
                    status="healthy",
                )
                session.add(f1)
                await session.commit()
        except Exception:
            await session.rollback()


async def close_db():
    """Dispose engine on shutdown."""
    await engine.dispose()
