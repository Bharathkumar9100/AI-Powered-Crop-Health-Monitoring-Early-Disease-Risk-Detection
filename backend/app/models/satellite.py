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
    image_id = Column(String(255), nullable=True)  # Scene / Granule identifier
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    field_geometry = Column(Text, nullable=True)  # GeoJSON polygon evaluated
    ndvi_mean = Column(Float, nullable=True)
    ndvi_min = Column(Float, nullable=True)
    ndvi_max = Column(Float, nullable=True)
    ndvi_map_path = Column(String(500), nullable=True)
    rgb_image_path = Column(String(500), nullable=True)
    stress_map_path = Column(String(500), nullable=True)
    healthy_area_pct = Column(Float, nullable=True)
    moderate_stress_pct = Column(Float, nullable=True)
    high_stress_pct = Column(Float, nullable=True)
    health_status = Column(String(50), nullable=True)  # healthy, stressed, critical
    processing_status = Column(String(50), default="completed")  # completed, pending, failed
    cloud_cover = Column(Float, nullable=True)
    source = Column(String(100), default="sentinel-2")
    scientific_advisory = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    field = relationship("Field", back_populates="satellite_observations")
    ndvi_result = relationship("NdviResult", back_populates="observation", uselist=False, cascade="all, delete-orphan")
    stress_analysis = relationship("StressAnalysis", back_populates="observation", uselist=False, cascade="all, delete-orphan")


class NdviResult(Base):
    __tablename__ = "ndvi_results"

    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(Integer, ForeignKey("satellite_observations.id"), nullable=False)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    ndvi_min = Column(Float, nullable=True)
    ndvi_max = Column(Float, nullable=True)
    ndvi_mean = Column(Float, nullable=True)
    ndvi_map_path = Column(String(500), nullable=True)
    raster_width = Column(Integer, nullable=True)
    raster_height = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    observation = relationship("SatelliteObservation", back_populates="ndvi_result")


class StressAnalysis(Base):
    __tablename__ = "stress_analysis"

    id = Column(Integer, primary_key=True, index=True)
    observation_id = Column(Integer, ForeignKey("satellite_observations.id"), nullable=False)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=False)
    healthy_area_pct = Column(Float, nullable=True)
    moderate_stress_pct = Column(Float, nullable=True)
    high_stress_pct = Column(Float, nullable=True)
    stress_map_path = Column(String(500), nullable=True)
    stress_level = Column(String(50), nullable=True)  # healthy, moderate_stress, high_stress
    rule_thresholds = Column(Text, nullable=True)  # JSON string of thresholds used
    scientific_advisory = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    observation = relationship("SatelliteObservation", back_populates="stress_analysis")


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
