"""Satellite and NDVI schemas."""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime


class SatelliteObservationResponse(BaseModel):
    id: int
    field_id: int
    observation_date: date
    image_id: Optional[str] = None
    ndvi_mean: Optional[float] = None
    ndvi_min: Optional[float] = None
    ndvi_max: Optional[float] = None
    ndvi_map_path: Optional[str] = None
    rgb_image_path: Optional[str] = None
    stress_map_path: Optional[str] = None
    healthy_area_pct: Optional[float] = None
    moderate_stress_pct: Optional[float] = None
    high_stress_pct: Optional[float] = None
    health_status: Optional[str] = None
    processing_status: Optional[str] = "completed"
    cloud_cover: Optional[float] = None
    source: str = "sentinel-2"
    scientific_advisory: Optional[str] = None
    is_demo: bool = False
    created_at: Optional[datetime] = None

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


# --- New Satellite Search & Analysis Schemas ---

class SatelliteSearchRequest(BaseModel):
    geometry: Optional[Dict[str, Any]] = None  # GeoJSON Polygon
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    max_cloud_cover: Optional[float] = None


class SatelliteSceneResponse(BaseModel):
    scene_id: str
    acquisition_date: date
    cloud_cover: float
    provider: str
    usable: bool
    thumbnail_url: Optional[str] = None


class SatelliteAnalyzeRequest(BaseModel):
    geometry: Optional[Dict[str, Any]] = None  # GeoJSON Polygon
    scene_id: Optional[str] = None
    max_cloud_cover: Optional[float] = None
    healthy_threshold: Optional[float] = None
    moderate_threshold: Optional[float] = None


class FieldHealthSummaryResponse(BaseModel):
    observation_id: int
    field_id: int
    field_name: str
    crop: str
    area_hectares: Optional[float] = None
    acquisition_date: date
    scene_id: Optional[str] = None
    cloud_cover: Optional[float] = None
    provider: str
    is_demo: bool = False
    ndvi_mean: float
    ndvi_min: float
    ndvi_max: float
    healthy_area_pct: float
    moderate_stress_pct: float
    high_stress_pct: float
    ndvi_map_url: Optional[str] = None
    stress_map_url: Optional[str] = None
    rgb_image_url: Optional[str] = None
    status: str
    headline: Optional[str] = None
    recommendation: Optional[str] = None
    disclaimer: str
    bbox: Optional[Dict[str, float]] = None
    field_geometry: Optional[Dict[str, Any]] = None


class StressMapResponse(BaseModel):
    field_id: int
    observation_id: Optional[int] = None
    stress_map_url: Optional[str] = None
    ndvi_map_url: Optional[str] = None
    healthy_area_pct: float
    moderate_stress_pct: float
    high_stress_pct: float
    severity: str
    disclaimer: str
