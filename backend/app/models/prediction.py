"""Prediction model for disease/stress analysis results."""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from app.database import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("fields.id"), nullable=True)
    image_path = Column(String(500), nullable=False)
    image_type = Column(String(50), default="leaf")  # leaf, uav, satellite

    # Prediction results
    crop_name = Column(String(100), nullable=True)
    disease_name = Column(String(200), nullable=True)
    confidence = Column(Float, nullable=True)
    severity = Column(String(50), nullable=True)  # low, moderate, high, critical
    risk_level = Column(String(50), nullable=True)  # low, moderate, high
    is_healthy = Column(Boolean, default=False)

    # Explainability
    explanation = Column(Text, nullable=True)
    gradcam_path = Column(String(500), nullable=True)
    top_predictions = Column(Text, nullable=True)  # JSON string of top-k predictions

    # Recommendations
    recommendations = Column(Text, nullable=True)  # JSON string

    # Metadata
    model_version = Column(String(100), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    field = relationship("Field", back_populates="predictions")
