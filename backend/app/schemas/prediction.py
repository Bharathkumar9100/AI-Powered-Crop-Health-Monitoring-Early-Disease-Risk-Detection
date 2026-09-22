"""Prediction and analysis schemas."""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class PredictionResult(BaseModel):
    crop_name: str
    disease_name: str
    confidence: float
    severity: str
    risk_level: str
    is_healthy: bool
    explanation: str
    recommendations: List[str]
    organic_fertilizers: List[str] = []
    bio_remedies: Optional[List[Dict[str, Any]]] = None
    organic_badge: Optional[str] = None
    dataset_source: Optional[str] = "PlantVillage Benchmark (38 Classes)"
    top_predictions: List[Dict[str, Any]]
    is_demo: bool = False


class ImageAnalysisResponse(BaseModel):
    prediction_id: int
    image_url: str
    gradcam_url: Optional[str] = None
    overlay_url: Optional[str] = None
    heatmap_url: Optional[str] = None
    result: PredictionResult

    model_config = ConfigDict(from_attributes=True)


class UavRegion(BaseModel):
    region_id: int
    x: int
    y: int
    width: int
    height: int
    risk_level: str
    confidence: float
    possible_causes: List[str]


class UavAnalysisResponse(BaseModel):
    scan_id: int
    image_url: str
    risk_map_url: Optional[str]
    regions_detected: int
    abnormal_regions: List[UavRegion]
    overall_health: str
    analysis_notes: str
    is_demo: bool = False


class PredictionHistoryItem(BaseModel):
    id: int
    image_url: str
    crop_name: Optional[str]
    disease_name: Optional[str]
    confidence: Optional[float]
    risk_level: Optional[str]
    is_healthy: bool
    is_demo: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PredictionHistoryResponse(BaseModel):
    predictions: List[PredictionHistoryItem]
    total: int
