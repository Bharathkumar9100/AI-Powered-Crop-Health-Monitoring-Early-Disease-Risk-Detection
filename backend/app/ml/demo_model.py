"""
Demo model: returns realistic but clearly labeled demo predictions.
Used when no trained model weights are available.
"""

import random
import numpy as np
from typing import List, Dict, Any, Optional

from app.ml.model_interface import PlantDiseaseModel, PredictionOutput


# PlantVillage 38-class names
PLANT_VILLAGE_CLASSES = [
    "Apple___Apple_scab", "Apple___Black_rot", "Apple___Cedar_apple_rust", "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew", "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot", "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight", "Corn_(maize)___healthy",
    "Grape___Black_rot", "Grape___Esca_(Black_Measles)", "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot", "Peach___healthy",
    "Pepper,_bell___Bacterial_spot", "Pepper,_bell___healthy",
    "Potato___Early_blight", "Potato___Late_blight", "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch", "Strawberry___healthy",
    "Tomato___Bacterial_spot", "Tomato___Early_blight", "Tomato___Late_blight",
    "Tomato___Leaf_Mold", "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite", "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus", "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]


def _parse_class_name(class_name: str) -> tuple:
    """Parse 'Crop___Disease' into (crop, disease)."""
    parts = class_name.split("___")
    crop = parts[0].replace("_", " ").replace(",", ",")
    disease = parts[1].replace("_", " ") if len(parts) > 1 else "Unknown"
    return crop, disease


def _get_severity(confidence: float, is_healthy: bool) -> str:
    """Determine severity based on confidence and health status."""
    if is_healthy:
        return "none"
    if confidence > 0.85:
        return "high"
    elif confidence > 0.65:
        return "moderate"
    return "low"


def _get_risk_level(severity: str) -> str:
    """Map severity to risk level."""
    mapping = {"none": "low", "low": "low", "moderate": "moderate", "high": "high", "critical": "high"}
    return mapping.get(severity, "moderate")


def _get_recommendations(crop: str, disease: str, is_healthy: bool) -> List[str]:
    """Generate basic recommendations."""
    if is_healthy:
        return [
            "Continue regular monitoring of your crop.",
            "Maintain your current crop management practices.",
            "Schedule the next inspection in 1-2 weeks.",
        ]
    return [
        f"Inspect your {crop} plants closely for signs of {disease}.",
        "Take additional photos of affected areas for comparison.",
        "Consider consulting a local agricultural extension officer.",
        "Avoid applying any treatment without proper identification.",
        "Monitor nearby plants for similar symptoms.",
        "This is a model prediction — please verify with an expert.",
    ]


def _get_organic_fertilizers(crop: str, disease: str, is_healthy: bool) -> List[str]:
    """Generate organic fertilizer suggestions."""
    if is_healthy:
        return [
            f"Apply Vermicompost @ 400 kg/acre or well-decomposed FYM to sustain {crop} soil vitality.",
            "Foliar spray of 3% Panchagavya (30 mL/L) bi-weekly to maintain leaf chlorophyll and vigor.",
            "Apply Liquid Jeevamrutha (200 L/acre) via drip/drenching to cultivate beneficial rhizosphere microbes.",
            "Spray fermented seaweed extract @ 2 mL/L during flowering/fruit development stages."
        ]
    return [
        f"Apply Vermicompost enriched with Trichoderma viride (2.5 kg/acre) around {crop} root zone.",
        "Foliar spray of cold-pressed Neem oil (10,000 ppm) @ 3-4 mL/L with 0.1% bio-soap adjuvant.",
        "Drench soil with Liquid Jeevamrutha (200 L/acre) or fermented compost tea to rejuvenate root immunity.",
        "Incorporate Neem cake meal (200 kg/acre) to deter opportunistic root pathogens and provide slow-release bio-nitrogen."
    ]


class DemoModel(PlantDiseaseModel):
    """
    Demo model that returns realistic but clearly labeled demo predictions.
    No real inference — used for UI development and demonstrations.
    """

    def __init__(self):
        self._class_names = PLANT_VILLAGE_CLASSES
        # Preset demo scenarios for consistent demos
        self._demo_scenarios = [
            {"class_idx": 29, "confidence": 0.91},  # Tomato Early Blight
            {"class_idx": 20, "confidence": 0.87},  # Potato Early Blight
            {"class_idx": 8, "confidence": 0.83},   # Corn Common Rust
            {"class_idx": 37, "confidence": 0.95},  # Tomato healthy
            {"class_idx": 11, "confidence": 0.78},  # Grape Black Rot
        ]

    def predict(self, image: np.ndarray, crop_hint: Optional[str] = None) -> PredictionOutput:
        """Return a demo prediction based on image botanical characteristics."""
        from app.ml.preprocessing import analyze_leaf_health_metrics

        # Analyze physical leaf health characteristics (chlorophyll greenness vs lesions)
        metrics = analyze_leaf_health_metrics(image)
        is_healthy = metrics["is_botanically_healthy"]

        # Determine target crop
        target_crop = crop_hint.strip() if crop_hint and crop_hint.strip() else None

        class_idx = None
        if is_healthy:
            # Find a healthy class matching target_crop if provided
            if target_crop:
                for idx, name in enumerate(self._class_names):
                    if target_crop.lower() in name.lower() and "healthy" in name.lower():
                        class_idx = idx
                        break
            if class_idx is None:
                # Default to Tomato healthy
                class_idx = 37

            confidence = round(float(random.uniform(0.94, 0.98)), 4)
            severity = "none"
            risk_level = "low"
        else:
            # Diseased leaf detected based on lesion patterns
            if target_crop:
                for idx, name in enumerate(self._class_names):
                    if target_crop.lower() in name.lower() and "healthy" not in name.lower():
                        class_idx = idx
                        break
            if class_idx is None:
                mean_val = int(np.mean(image)) % len(self._demo_scenarios)
                class_idx = int(self._demo_scenarios[mean_val]["class_idx"])
                if "healthy" in self._class_names[class_idx].lower():
                    class_idx = 29  # Tomato Early Blight

            confidence = round(float(random.uniform(0.85, 0.93)), 4)
            severity = _get_severity(confidence, is_healthy=False)
            risk_level = _get_risk_level(severity)

        class_name = self._class_names[class_idx]
        crop, disease = _parse_class_name(class_name)

        # Generate top-k predictions
        top_predictions = []
        remaining_conf = 1.0 - confidence
        other_indices = random.sample(
            [i for i in range(len(self._class_names)) if i != class_idx],
            min(4, len(self._class_names) - 1)
        )
        for i, idx in enumerate(other_indices):
            c, d = _parse_class_name(self._class_names[idx])
            pred_conf = remaining_conf * (0.5 ** (i + 1))
            top_predictions.append({
                "crop": c, "disease": d,
                "confidence": round(pred_conf, 4),
                "class_name": self._class_names[idx],
            })

        top_predictions.insert(0, {
            "crop": crop, "disease": disease if not is_healthy else "Healthy",
            "confidence": round(confidence, 4),
            "class_name": class_name,
        })

        # Explanation
        if is_healthy:
            explanation = (
                f"The AI model analysis indicates this {crop} leaf is healthy with "
                f"{confidence:.1%} confidence. Photosynthetic cellular structure shows no active pathogen lesions."
            )
        else:
            explanation = (
                f"AI pathology analysis identified characteristic symptoms of {disease} on {crop} "
                f"with {confidence:.1%} confidence. Early intervention and targeted bio-control are recommended."
            )

        return PredictionOutput(
            crop_name=crop,
            disease_name="Healthy" if is_healthy else disease,
            confidence=round(confidence, 4),
            is_healthy=is_healthy,
            severity=severity,
            risk_level=risk_level,
            explanation=explanation,
            recommendations=_get_recommendations(crop, disease, is_healthy),
            organic_fertilizers=_get_organic_fertilizers(crop, disease, is_healthy),
            top_predictions=top_predictions,
            is_demo=True,
        )

    def get_model(self):
        return None

    def get_target_layer(self):
        return None

    def get_class_names(self) -> List[str]:
        return self._class_names

    @property
    def model_name(self) -> str:
        return "Demo Model (No trained weights loaded)"

    @property
    def is_loaded(self) -> bool:
        return True
