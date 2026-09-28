"""
PhytoVision-X Database Configuration
Async SQLAlchemy engine and session management.
"""

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


async def get_db() -> AsyncSession:
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


async def init_db():
    """Create all tables on startup and ensure demo seed user exists."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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
