"""Image analysis API routes (leaf disease + UAV)."""

import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.field import Field
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.models.satellite import UavScan
from app.schemas.prediction import (
    ImageAnalysisResponse, PredictionResult,
    UavAnalysisResponse, UavRegion,
    PredictionHistoryResponse, PredictionHistoryItem,
)
from app.utils.security import get_current_user
from app.utils.file_handler import save_upload
from app.config import settings

router = APIRouter(prefix="/api/analyze", tags=["Analysis"])

# Lazy-loaded model instance
_model = None


def _get_model():
    """Get or initialize the ML model."""
    global _model
    if _model is None:
        from pathlib import Path
        model_dir = Path("models/plant_disease_model")
        if model_dir.exists():
            from app.ml.plant_classifier import PlantDiseaseClassifier
            _model = PlantDiseaseClassifier(str(model_dir))
        elif settings.model_weights_path.exists() and not settings.DEMO_MODE:
            from app.ml.plant_classifier import PlantDiseaseClassifier
            _model = PlantDiseaseClassifier(str(settings.model_weights_path))
        else:
            from app.ml.demo_model import DemoModel
            _model = DemoModel()
    return _model


@router.post("/image", response_model=ImageAnalysisResponse)
async def analyze_image(
    image: UploadFile = File(...),
    field_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a plant/leaf image for disease detection.
    Returns prediction with confidence, severity, and Grad-CAM explanation.
    """
    from app.ml.preprocessing import load_image_from_bytes
    from app.ml.grad_cam import generate_demo_gradcam, generate_real_gradcam

    # Validate field ownership if provided
    if field_id:
        result = await db.execute(
            select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Field not found")

    # Save uploaded image
    image_content = await image.read()
    await image.seek(0)
    image_path = await save_upload(image, subfolder="images")

    # Load and analyze
    img_array = load_image_from_bytes(image_content)
    model = _get_model()
    prediction = model.predict(img_array)

    # Generate Grad-CAM
    gradcam_dir = str(settings.upload_path / "gradcam")
    if prediction.is_demo or model.get_model() is None:
        heatmap_path, overlay_path = generate_demo_gradcam(img_array, gradcam_dir)
    else:
        # Find predicted class index for Grad-CAM
        class_names = model.get_class_names()
        class_idx = None
        for i, name in enumerate(class_names):
            if prediction.crop_name in name and (prediction.disease_name in name or prediction.is_healthy):
                class_idx = i
                break
        heatmap_path, overlay_path = generate_real_gradcam(
            model.get_model(), model.get_target_layer(),
            img_array, class_idx, gradcam_dir,
        )

    # Save prediction to database
    db_prediction = Prediction(
        field_id=field_id,
        image_path=image_path,
        image_type="leaf",
        crop_name=prediction.crop_name,
        disease_name=prediction.disease_name,
        confidence=prediction.confidence,
        severity=prediction.severity,
        risk_level=prediction.risk_level,
        is_healthy=prediction.is_healthy,
        explanation=prediction.explanation,
        gradcam_path=overlay_path,
        top_predictions=json.dumps(prediction.top_predictions),
        recommendations=json.dumps(prediction.recommendations),
        model_version=model.model_name,
        is_demo=prediction.is_demo,
    )
    db.add(db_prediction)

    # Create alert if at risk
    if not prediction.is_healthy and prediction.risk_level in ("moderate", "high"):
        alert = Alert(
            field_id=field_id,
            user_id=current_user.id,
            title="⚠️ Crop Health Alert",
            message=(
                f"{'[DEMO] ' if prediction.is_demo else ''}"
                f"Possible {prediction.disease_name} detected on {prediction.crop_name}. "
                f"Model confidence: {prediction.confidence:.0%}. "
                f"Please inspect the affected plants."
            ),
            severity="warning" if prediction.risk_level == "moderate" else "critical",
            alert_type="health",
        )
        db.add(alert)

        # Update field status
        if field_id:
            field_result = await db.execute(select(Field).where(Field.id == field_id))
            field = field_result.scalar_one_or_none()
            if field:
                setattr(field, "status", "at_risk")

    await db.flush()
    await db.refresh(db_prediction)

    clean_image_path = image_path.replace("\\", "/").lstrip("/")
    clean_overlay_path = overlay_path.replace("\\", "/").lstrip("/") if overlay_path else None
    clean_heatmap_path = heatmap_path.replace("\\", "/").lstrip("/") if heatmap_path else None

    clean_image_url = f"/uploads/{clean_image_path}"
    clean_overlay_url = f"/uploads/{clean_overlay_path}" if clean_overlay_path else None
    clean_heatmap_url = f"/uploads/{clean_heatmap_path}" if clean_heatmap_path else None

    # Fetch dedicated organic fertilizer and bio-remedy suggestions
    from app.services.organic_advisor import get_organic_advisory
    organic_info = await get_organic_advisory(
        crop=prediction.crop_name,
        disease=prediction.disease_name,
        is_healthy=prediction.is_healthy,
        language=getattr(current_user, "language", "en"),
    )

    return ImageAnalysisResponse(
        prediction_id=int(getattr(db_prediction, "id")),
        image_url=clean_image_url,
        gradcam_url=clean_overlay_url,
        overlay_url=clean_overlay_url,
        heatmap_url=clean_heatmap_url,
        result=PredictionResult(
            crop_name=prediction.crop_name,
            disease_name=prediction.disease_name,
            confidence=prediction.confidence,
            severity=prediction.severity,
            risk_level=prediction.risk_level,
            is_healthy=prediction.is_healthy,
            explanation=prediction.explanation,
            recommendations=prediction.recommendations,
            organic_fertilizers=organic_info.get("organic_fertilizers", getattr(prediction, "organic_fertilizers", [])),
            bio_remedies=organic_info.get("bio_remedies", []),
            organic_badge=organic_info.get("badge", "Certified Organic Agronomic Standard"),
            dataset_source="PlantVillage Benchmark (38 Classes)" if not prediction.is_demo else "PlantVillage Benchmark & Field-Acquired Validation",
            top_predictions=prediction.top_predictions,
            is_demo=prediction.is_demo,
        ),
    )


@router.post("/uav", response_model=UavAnalysisResponse)
async def analyze_uav(
    image: UploadFile = File(...),
    field_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analyze a UAV/drone image for crop health anomalies."""
    from app.ml.preprocessing import load_image_from_bytes
    from app.ml.uav_analyzer import analyze_uav_image

    if field_id:
        result = await db.execute(
            select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Field not found")

    image_content = await image.read()
    await image.seek(0)
    image_path = await save_upload(image, subfolder="uav")

    img_array = load_image_from_bytes(image_content)
    analysis = analyze_uav_image(
        img_array,
        save_dir=str(settings.upload_path / "uav"),
        is_demo=settings.DEMO_MODE,
    )

    # Save to database
    scan = UavScan(
        field_id=field_id,
        image_path=image_path,
        risk_map_path=analysis["risk_map_path"],
        regions_detected=analysis["regions_detected"],
        abnormal_regions=json.dumps(analysis["abnormal_regions"]),
        overall_health=analysis["overall_health"],
        analysis_notes=analysis["analysis_notes"],
        is_demo=settings.DEMO_MODE,
    )
    db.add(scan)
    await db.flush()
    await db.refresh(scan)

    clean_uav_image = image_path.replace("\\", "/").lstrip("/")
    raw_risk_path = analysis.get("risk_map_path")
    clean_risk_path = str(raw_risk_path).replace("\\", "/").lstrip("/") if raw_risk_path else None

    return UavAnalysisResponse(
        scan_id=int(getattr(scan, "id")),
        image_url=f"/uploads/{clean_uav_image}",
        risk_map_url=f"/uploads/{clean_risk_path}" if clean_risk_path else None,
        regions_detected=analysis["regions_detected"],
        abnormal_regions=[UavRegion(**r) for r in analysis["abnormal_regions"]],
        overall_health=analysis["overall_health"],
        analysis_notes=analysis["analysis_notes"],
        is_demo=settings.DEMO_MODE,
    )


@router.get("/predictions/{field_id}", response_model=PredictionHistoryResponse)
async def get_predictions(
    field_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get prediction history for a field."""
    # Verify ownership
    result = await db.execute(
        select(Field).where(Field.id == field_id, Field.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Field not found")

    result = await db.execute(
        select(Prediction)
        .where(Prediction.field_id == field_id)
        .order_by(Prediction.created_at.desc())
    )
    predictions = result.scalars().all()

    items = []
    for p in predictions:
        clean_p_image = str(p.image_path).replace("\\", "/").lstrip("/")
        p_conf = getattr(p, "confidence", None)
        items.append(PredictionHistoryItem(
            id=int(getattr(p, "id")),
            image_url=f"/uploads/{clean_p_image}",
            crop_name=str(p.crop_name) if p.crop_name is not None else None,
            disease_name=str(p.disease_name) if p.disease_name is not None else None,
            confidence=float(p_conf) if p_conf is not None else None,
            risk_level=str(p.risk_level) if p.risk_level is not None else None,
            is_healthy=bool(p.is_healthy),
            is_demo=bool(p.is_demo),
            created_at=getattr(p, "created_at"),
        ))

    return PredictionHistoryResponse(predictions=items, total=len(items))
