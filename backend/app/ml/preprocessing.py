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


def analyze_leaf_health_metrics(image: np.ndarray) -> dict:
    """
    Botanical color, chlorophyll index, and necrotic lesion analysis for plant leaf health assessment.
    Calculates Excess Green Index (ExG), Green-to-Red ratio, and necrotic lesion coverage.
    """
    img_float = image.astype(np.float32)
    r = img_float[:, :, 0]
    g = img_float[:, :, 1]
    b = img_float[:, :, 2]

    # Mask non-extreme background pixels
    brightness = (r + g + b) / 3.0
    leaf_mask = (brightness > 20) & (brightness < 248)
    total_leaf_pixels = int(np.count_nonzero(leaf_mask))
    if total_leaf_pixels < 100:
        total_leaf_pixels = image.shape[0] * image.shape[1]
        leaf_mask = np.ones((image.shape[0], image.shape[1]), dtype=bool)

    # ExG (Excess Green index) = 2G - R - B
    exg = 2.0 * g - r - b
    mean_exg = float(np.mean(exg[leaf_mask]))

    # Dominant healthy green pixels
    healthy_green_mask = leaf_mask & (g > r) & (g > b) & (exg > 15)
    healthy_green_ratio = float(np.count_nonzero(healthy_green_mask) / total_leaf_pixels)

    # Necrotic lesion pixels (brown, black, dark yellow rust / blight spots)
    lesion_mask = leaf_mask & (
        # Brown / Necrotic spots (R higher than G or equal with low blue)
        ((r > g + 8) & (b < 125)) |
        # Yellowing / Chlorosis / Rust (high R & G, very low B)
        ((r > 125) & (g > 115) & (b < 75) & (r >= g - 15)) |
        # Dark necrotic spots (very low G compared to average)
        ((g < 55) & (brightness < 60) & (r >= g))
    )
    lesion_ratio = float(np.count_nonzero(lesion_mask) / total_leaf_pixels)

    # A leaf is botanically healthy if:
    # 1. Healthy green coverage is dominant (>= 35% of leaf area)
    # 2. Lesion ratio is very low (< 3.5%)
    # 3. Mean ExG is positive (> 15)
    is_botanically_healthy = bool(
        (healthy_green_ratio >= 0.35) and (lesion_ratio < 0.035) and (mean_exg > 15.0)
    )

    return {
        "mean_exg": round(mean_exg, 1),
        "healthy_green_ratio": round(healthy_green_ratio, 3),
        "lesion_ratio": round(lesion_ratio, 3),
        "is_botanically_healthy": is_botanically_healthy,
    }

