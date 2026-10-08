"""Field management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.field import Field
from app.models.prediction import Prediction
from app.models.alert import Alert
from typing import Optional
from app.schemas.field import FieldCreate, FieldUpdate, FieldResponse, FieldListResponse
from app.utils.security import get_current_user, get_optional_user

router = APIRouter(prefix="/api/fields", tags=["Fields"])


@router.get("", response_model=FieldListResponse)
async def list_fields(
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """List all fields for the current farmer (or demo fields if unauthenticated)."""
    target_user_id = current_user.id if current_user else 1
    result = await db.execute(
        select(Field).where(Field.user_id == target_user_id).order_by(Field.created_at.desc())
    )
    fields = result.scalars().all()
    if not fields and target_user_id != 1:
        # Fallback to demo fields
        result = await db.execute(
            select(Field).where(Field.user_id == 1).order_by(Field.created_at.desc())
        )
        fields = result.scalars().all()

    field_responses = []
    for field in fields:
        # Count predictions
        pred_count = await db.execute(
            select(func.count()).where(Prediction.field_id == field.id)
        )
        # Count unread alerts
        alert_count = await db.execute(
            select(func.count()).where(Alert.field_id == field.id, Alert.is_read == False)
        )
        fr = FieldResponse.model_validate(field)
        fr.prediction_count = pred_count.scalar() or 0
        fr.alert_count = alert_count.scalar() or 0
        field_responses.append(fr)

    return FieldListResponse(fields=field_responses, total=len(field_responses))


@router.post("", response_model=FieldResponse, status_code=status.HTTP_201_CREATED)
async def create_field(
    data: FieldCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new field."""
    field = Field(
        user_id=current_user.id,
        name=data.name,
        crop=data.crop,
        latitude=data.latitude,
        longitude=data.longitude,
        area_hectares=data.area_hectares,
        planting_date=data.planting_date,
        boundary_geojson=data.boundary_geojson,
        notes=data.notes,
    )
    db.add(field)
    await db.flush()
    await db.refresh(field)
    return FieldResponse.model_validate(field)


@router.get("/{field_id}", response_model=FieldResponse)
async def get_field(
    field_id: int,
    current_user: Optional[User] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Get field details."""
    result = await db.execute(
        select(Field).where(Field.id == field_id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    fr = FieldResponse.model_validate(field)
    pred_count = await db.execute(select(func.count()).where(Prediction.field_id == field.id))
    alert_count = await db.execute(select(func.count()).where(Alert.field_id == field.id, Alert.is_read == False))
    fr.prediction_count = pred_count.scalar() or 0
    fr.alert_count = alert_count.scalar() or 0
    return fr


@router.put("/{field_id}", response_model=FieldResponse)
async def update_field(
    field_id: int,
    data: FieldUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a field."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(field, key, value)

    await db.flush()
    await db.refresh(field)
    return FieldResponse.model_validate(field)


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_field(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a field and all its associated data."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    await db.delete(field)
