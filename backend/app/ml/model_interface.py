"""
Abstract model interface for plant disease prediction.
Allows hot-swapping between different model architectures.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
import numpy as np


@dataclass
class PredictionOutput:
    """Standard output from any plant disease model."""
    crop_name: str
    disease_name: str
    confidence: float
    is_healthy: bool
    severity: str  # low, moderate, high, critical
    risk_level: str  # low, moderate, high
    explanation: str
    recommendations: List[str]
    organic_fertilizers: List[str] = field(default_factory=list)
    top_predictions: List[Dict[str, Any]] = field(default_factory=list)
    features: Optional[np.ndarray] = None  # For Grad-CAM
    is_demo: bool = False


class PlantDiseaseModel(ABC):
    """
    Abstract base class for plant disease classifiers.
    
    Implement this interface to add new model architectures.
    The system uses predict(image) so models can be swapped easily.
    """

    @abstractmethod
    def predict(self, image: np.ndarray, crop_hint: Optional[str] = None) -> PredictionOutput:
        """
        Run inference on a preprocessed image.
        
        Args:
            image: RGB image as numpy array (H, W, 3), uint8
            crop_hint: Optional field crop name to prioritize or contextualize
            
        Returns:
            PredictionOutput with disease classification results
        """
        ...

    @abstractmethod
    def get_model(self):
        """Return the underlying PyTorch/TF model for Grad-CAM."""
        ...

    @abstractmethod
    def get_target_layer(self):
        """Return the target layer for Grad-CAM visualization."""
        ...

    @abstractmethod
    def get_class_names(self) -> List[str]:
        """Return list of class names the model was trained on."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return a human-readable model name."""
        ...

    @property
    def is_loaded(self) -> bool:
        """Check if the model weights are loaded and ready."""
        return True
