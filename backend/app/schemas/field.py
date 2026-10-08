"""Field management schemas."""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import date, datetime


class FieldCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    crop: str = Field(..., min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    area_hectares: Optional[float] = Field(None, gt=0)
    planting_date: Optional[date] = None
    boundary_geojson: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)


class FieldUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    crop: Optional[str] = Field(None, min_length=1, max_length=100)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    area_hectares: Optional[float] = Field(None, gt=0)
    planting_date: Optional[date] = None
    boundary_geojson: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=1000)


class FieldResponse(BaseModel):
    id: int
    user_id: int
    name: str
    crop: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    area_hectares: Optional[float] = None
    planting_date: Optional[date] = None
    boundary_geojson: Optional[str] = None
    status: str = "healthy"
    notes: Optional[str] = None
    created_at: datetime
    prediction_count: int = 0
    alert_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FieldListResponse(BaseModel):
    fields: List[FieldResponse]
    total: int
