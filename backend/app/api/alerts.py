"""Alert API routes."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.alert import Alert
from app.schemas.satellite import AlertResponse, AlertListResponse
from app.utils.security import get_current_user

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
async def get_all_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all alerts for the current user."""
    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()

    unread = await db.execute(
        select(func.count())
        .where(Alert.user_id == current_user.id, Alert.is_read == False)
    )

    return AlertListResponse(
        alerts=[AlertResponse.model_validate(a) for a in alerts],
        unread_count=unread.scalar() or 0,
    )


@router.get("/{field_id}", response_model=AlertListResponse)
async def get_field_alerts(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get alerts for a specific field."""
    result = await db.execute(
        select(Alert)
        .where(Alert.field_id == field_id, Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    alerts = result.scalars().all()

    unread = await db.execute(
        select(func.count())
        .where(Alert.field_id == field_id, Alert.user_id == current_user.id, Alert.is_read == False)
    )

    return AlertListResponse(
        alerts=[AlertResponse.model_validate(a) for a in alerts],
        unread_count=unread.scalar() or 0,
    )


@router.put("/{alert_id}/read")
async def mark_alert_read(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an alert as read."""
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    setattr(alert, "is_read", True)
    await db.flush()
    return {"status": "ok"}
