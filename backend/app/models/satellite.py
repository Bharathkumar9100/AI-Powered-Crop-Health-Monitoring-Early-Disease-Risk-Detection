"""Satellite observation and UAV scan models."""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Date
from sqlalchemy.orm import relationship
from app.database import Base


class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    observation_date = Column(Date, nullable=False)
    ndvi_mean = Column(Float, nullable=True)
    ndvi_min = Column(Float, nullable=True)
    ndvi_max = Column(Float, nullable=True)
    ndvi_map_path = Column(String(500), nullable=True)
    health_status = Column(String(50), nullable=True)  # healthy, stressed, critical
    cloud_cover = Column(Float, nullable=True)
    source = Column(String(100), default="sentinel-2")
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    field = relationship("Field", back_populates="satellite_observations")


class UavScan(Base):
    __tablename__ = "uav_scans"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=True)
    image_path = Column(String(500), nullable=False)
    risk_map_path = Column(String(500), nullable=True)
    regions_detected = Column(Integer, default=0)
    abnormal_regions = Column(Text, nullable=True)  # JSON array of region data
    overall_health = Column(String(50), nullable=True)
    analysis_notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    field = relationship("Field", back_populates="uav_scans")
