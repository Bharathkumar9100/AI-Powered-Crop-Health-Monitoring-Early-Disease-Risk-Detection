"""
Image preprocessing pipeline for plant disease analysis.
Handles resize, normalization, augmentation, and format conversion.
"""

import numpy as np
from PIL import Image, ImageOps
import io
from typing import Tuple, Optional

# ImageNet normalization stats (used by all torchvision pretrained models)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Default input size for EfficientNet-B0
DEFAULT_INPUT_SIZE = (224, 224)


def load_image_from_bytes(image_bytes: bytes) -> np.ndarray:
    """Load image from bytes and return as RGB numpy array."""
    img = Image.open(io.BytesIO(image_bytes))
    # Fix EXIF orientation
    img = ImageOps.exif_transpose(img)
    # Convert to RGB
    img = img.convert("RGB")
    return np.array(img)


def load_image_from_path(path: str) -> np.ndarray:
    """Load image from file path and return as RGB numpy array."""
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGB")
    return np.array(img)


def resize_image(
    image: np.ndarray,
    target_size: Tuple[int, int] = DEFAULT_INPUT_SIZE,
) -> np.ndarray:
    """Resize image to target dimensions."""
    img = Image.fromarray(image)
    img = img.resize(target_size, Image.Resampling.LANCZOS)
    return np.array(img)


def normalize_image(image: np.ndarray) -> np.ndarray:
    """Normalize image to [0, 1] range with ImageNet stats."""
    img = image.astype(np.float32) / 255.0
    img = (img - np.array(IMAGENET_MEAN)) / np.array(IMAGENET_STD)
    return img


def preprocess_for_model(
    image: np.ndarray,
    target_size: Tuple[int, int] = DEFAULT_INPUT_SIZE,
) -> np.ndarray:
    """
    Full preprocessing pipeline: resize → normalize → transpose for PyTorch.
    
    Returns:
        numpy array of shape (1, 3, H, W) ready for model input
    """
    img = resize_image(image, target_size)
    img = normalize_image(img)
    # HWC → CHW for PyTorch
    img = np.transpose(img, (2, 0, 1))
    # Add batch dimension
    img = np.expand_dims(img, axis=0)
    return img


def get_display_image(
    image: np.ndarray,
    target_size: Optional[Tuple[int, int]] = None,
) -> np.ndarray:
    """Get image ready for display (resized but not normalized)."""
    if target_size:
        return resize_image(image, target_size)
    return image


def image_to_bytes(image: np.ndarray, format: str = "PNG") -> bytes:
    """Convert numpy array to image bytes."""
    img = Image.fromarray(image)
    buffer = io.BytesIO()
    img.save(buffer, format=format)
    return buffer.getvalue()
