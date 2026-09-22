"""
EfficientNet-B0 plant disease classifier with transfer learning.
Supports loading trained weights for real inference.
"""

import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

import numpy as np

from app.ml.model_interface import PlantDiseaseModel, PredictionOutput
from app.ml.preprocessing import preprocess_for_model
from app.ml.demo_model import PLANT_VILLAGE_CLASSES, _parse_class_name, _get_severity, _get_risk_level, _get_recommendations, _get_organic_fertilizers

logger = logging.getLogger(__name__)


class PlantDiseaseClassifier(PlantDiseaseModel):
    """
    EfficientNet-B0 based plant disease classifier.
    Uses transfer learning with PlantVillage dataset (38 classes).
    """

    def __init__(self, model_path: Optional[str] = None, num_classes: int = 38):
        self._model = None
        self._target_layer = None
        self._class_names = PLANT_VILLAGE_CLASSES
        self._num_classes = num_classes
        self._device = "cpu"
        self._loaded = False

        if model_path and Path(model_path).exists():
            self._load_model(model_path)

    def _load_model(self, model_path: str):
        """Load trained model weights."""
        try:
            import torch  # type: ignore
            import torch.nn as nn  # type: ignore
            from torchvision import models  # type: ignore

            # Determine device
            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Loading model on device: {self._device}")

            # Build EfficientNet-B0 architecture
            model = models.efficientnet_b0(weights=None)
            in_features = int(getattr(model.classifier[1], "in_features", 1280))
            model.classifier = nn.Sequential(
                nn.Dropout(p=0.3, inplace=True),
                nn.Linear(in_features, self._num_classes),
            )

            # Load trained weights
            checkpoint = torch.load(model_path, map_location=self._device, weights_only=False)
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
            elif isinstance(checkpoint, dict):
                state_dict = checkpoint
            else:
                state_dict = checkpoint.state_dict()
            model.load_state_dict(state_dict, strict=False)
            model.to(self._device)
            model.eval()

            self._model = model
            self._target_layer = model.features[-1]
            self._loaded = True
            logger.info(f"Model loaded successfully from {model_path}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self._loaded = False

    def predict(self, image: np.ndarray) -> PredictionOutput:
        """Run inference on a plant leaf image."""
        import torch  # type: ignore

        if not self._loaded or self._model is None:
            raise RuntimeError("Model not loaded. Train a model or use DemoModel.")

        # Preprocess
        input_tensor = preprocess_for_model(image)
        input_tensor = torch.FloatTensor(input_tensor).to(self._device)

        # Inference
        with torch.no_grad():
            outputs = self._model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            confidence, predicted_idx = torch.max(probabilities, dim=1)

        confidence = float(confidence.item())
        predicted_idx = int(predicted_idx.item())
        class_name = self._class_names[predicted_idx]
        crop, disease = _parse_class_name(class_name)
        is_healthy = "healthy" in class_name.lower()
        severity = _get_severity(confidence, is_healthy)
        risk_level = _get_risk_level(severity)

        # Top-k predictions
        top_k = min(5, len(self._class_names))
        top_probs, top_indices = torch.topk(probabilities[0], top_k)
        top_predictions = []
        for prob, idx in zip(top_probs.cpu().numpy(), top_indices.cpu().numpy()):
            c, d = _parse_class_name(self._class_names[idx])
            top_predictions.append({
                "crop": c, "disease": d,
                "confidence": round(float(prob), 4),
                "class_name": self._class_names[idx],
            })

        # Explanation
        if is_healthy:
            explanation = (
                f"The model analysis indicates this {crop} leaf appears healthy "
                f"with {confidence:.1%} model confidence. No significant disease "
                f"patterns were detected. Continue regular monitoring."
            )
        else:
            explanation = (
                f"The model detected patterns consistent with possible {disease} "
                f"on {crop} with {confidence:.1%} model confidence. "
                f"The confidence score represents model certainty, not a guaranteed "
                f"diagnosis. Please inspect the affected plants and consult an "
                f"agricultural expert for confirmation."
            )

        return PredictionOutput(
            crop_name=crop,
            disease_name=disease if not is_healthy else "Healthy",
            confidence=round(confidence, 4),
            is_healthy=is_healthy,
            severity=severity,
            risk_level=risk_level,
            explanation=explanation,
            recommendations=_get_recommendations(crop, disease, is_healthy),
            organic_fertilizers=_get_organic_fertilizers(crop, disease, is_healthy),
            top_predictions=top_predictions,
            is_demo=False,
        )

    def get_model(self):
        return self._model

    def get_target_layer(self):
        return self._target_layer

    def get_class_names(self) -> List[str]:
        return self._class_names

    @property
    def model_name(self) -> str:
        return "EfficientNet-B0 (PlantVillage 38-class)"

    @property
    def is_loaded(self) -> bool:
        return self._loaded
