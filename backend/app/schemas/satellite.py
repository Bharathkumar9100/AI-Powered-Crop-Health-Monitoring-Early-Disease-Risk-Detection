"""Satellite and NDVI schemas."""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date, datetime


class SatelliteObservationResponse(BaseModel):
    id: int
    field_id: int
    observation_date: date
    ndvi_mean: Optional[float] = None
    ndvi_min: Optional[float] = None
    ndvi_max: Optional[float] = None
    ndvi_map_url: Optional[str] = None
    health_status: Optional[str] = None
    cloud_cover: Optional[float] = None
    source: str = "sentinel-2"
    is_demo: bool = False

    model_config = ConfigDict(from_attributes=True)


class NdviTimeSeriesPoint(BaseModel):
    date: date
    ndvi_mean: float
    health_status: str


class NdviTimeSeriesResponse(BaseModel):
    field_id: int
    data: List[NdviTimeSeriesPoint]
    trend: str  # improving, declining, stable


class RiskZone(BaseModel):
    zone_id: int
    latitude: float
    longitude: float
    radius_meters: float
    risk_level: str
    confidence: float
    last_updated: datetime
    possible_causes: List[str]


class FieldRiskResponse(BaseModel):
    field_id: int
    overall_risk: str
    risk_zones: List[RiskZone]
    last_analysis: Optional[datetime] = None
    is_demo: bool = False


class AlertResponse(BaseModel):
    id: int
    field_id: Optional[int] = None
    title: str
    message: str
    severity: str
    alert_type: str = "health"
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    unread_count: int
