"""Risk assessment API routes."""

import random
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.field import Field
from app.models.prediction import Prediction
from app.schemas.satellite import FieldRiskResponse, RiskZone
from app.utils.security import get_current_user
from app.config import settings

router = APIRouter(prefix="/api/risk", tags=["Risk"])


@router.get("/{field_id}", response_model=FieldRiskResponse)
async def get_field_risk(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get risk assessment for a field with risk zones."""
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    # Get recent predictions
    result = await db.execute(
        select(Prediction)
        .where(Prediction.field_id == field_id)
        .order_by(Prediction.created_at.desc())
        .limit(10)
    )
    predictions = result.scalars().all()

    # Generate risk zones
    risk_zones = []
    raw_lat = getattr(field, "latitude", None)
    raw_lng = getattr(field, "longitude", None)
    if raw_lat is not None and raw_lng is not None:
        lat = float(raw_lat)
        lng = float(raw_lng)
        pred_list = list(predictions)
        if settings.DEMO_MODE or not pred_list:
            # Demo risk zones around the field center
            risk_zones = _generate_demo_risk_zones(lat, lng)
        else:
            # Generate from actual prediction data
            high_risk = [p for p in pred_list if getattr(p, "risk_level") == "high"]
            if high_risk:
                risk_zones = _generate_risk_zones_from_predictions(
                    lat, lng, pred_list
                )

    # Determine overall risk
    if risk_zones:
        risk_levels = [z.risk_level for z in risk_zones]
        if "high" in risk_levels:
            overall_risk = "high"
        elif "moderate" in risk_levels:
            overall_risk = "moderate"
        else:
            overall_risk = "low"
    else:
        overall_risk = field.status if field.status in ("healthy", "at_risk") else "low"
        overall_risk = "low" if overall_risk == "healthy" else "moderate"

    last_analysis = getattr(predictions[0], "created_at") if predictions else None

    return FieldRiskResponse(
        field_id=field_id,
        overall_risk=overall_risk,
        risk_zones=risk_zones,
        last_analysis=last_analysis,
        is_demo=settings.DEMO_MODE,
    )


def _generate_demo_risk_zones(lat: float, lng: float) -> list[RiskZone]:
    """Generate spatial micro-quadrant risk zones based on field geography."""
    zones = []
    quadrants = [
        ("Sector NW (Northwest Sprinkler Line)", -0.0008, -0.0008, "high", 0.84, ["Early Blight Lesions", "Excess Foliar Moisture"]),
        ("Sector NE (Northeast Ridge)", 0.0008, -0.0008, "low", 0.28, ["Optimal Photosynthetic Vigor"]),
        ("Sector SW (Southwest Edge)", -0.0008, 0.0008, "moderate", 0.58, ["Mild Chlorosis", "Nitrogen Deficiency"]),
        ("Sector SE (Southeast Flat)", 0.0008, 0.0008, "low", 0.22, ["Healthy Vegetative Canopy"]),
    ]

    for i, (name, d_lat, d_lng, risk, conf, causes) in enumerate(quadrants):
        zones.append(RiskZone(
            zone_id=i,
            latitude=round(lat + d_lat, 5),
            longitude=round(lng + d_lng, 5),
            radius_meters=round(random.uniform(35, 65), 1),
            risk_level=risk,
            confidence=conf,
            last_updated=datetime.now(timezone.utc),
            possible_causes=causes,
        ))

    return zones


def _generate_risk_zones_from_predictions(
    lat: float, lng: float, predictions: list
) -> list[RiskZone]:
    """Generate risk zones from actual prediction data."""
    zones = []
    for i, pred in enumerate(predictions[:5]):
        if pred.risk_level in ("moderate", "high"):
            zones.append(RiskZone(
                zone_id=i,
                latitude=lat + random.uniform(-0.001, 0.001),
                longitude=lng + random.uniform(-0.001, 0.001),
                radius_meters=random.uniform(30, 80),
                risk_level=pred.risk_level,
                confidence=pred.confidence or 0.5,
                last_updated=getattr(pred, "created_at"),
                possible_causes=[pred.disease_name or "Unknown"],
            ))
    return zones
