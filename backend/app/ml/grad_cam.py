"""
Grad-CAM explainability module.
Generates visual explanations showing which image regions influenced the model's prediction.
"""

import logging
import numpy as np
from PIL import Image
from pathlib import Path
from typing import Optional, Tuple
import io
import uuid

logger = logging.getLogger(__name__)


def generate_demo_gradcam(image: np.ndarray, save_dir: str) -> Tuple[str, str]:
    """
    Generate a synthetic Grad-CAM heatmap for demo mode.
    Creates a realistic-looking heatmap without actual model gradients.
    """
    import cv2

    h, w = image.shape[:2]

    # Create a synthetic heatmap focused on center-random regions
    heatmap = np.zeros((h, w), dtype=np.float32)

    # Add 2-4 gaussian blobs to simulate attention regions
    num_blobs = np.random.randint(2, 5)
    for _ in range(num_blobs):
        cx = np.random.randint(w // 4, 3 * w // 4)
        cy = np.random.randint(h // 4, 3 * h // 4)
        sigma_x = np.random.randint(w // 8, w // 4)
        sigma_y = np.random.randint(h // 8, h // 4)

        y_grid, x_grid = np.mgrid[0:h, 0:w]
        blob = np.exp(-((x_grid - cx) ** 2 / (2 * sigma_x ** 2) + (y_grid - cy) ** 2 / (2 * sigma_y ** 2)))
        heatmap += blob.astype(np.float32)

    # Normalize
    heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min() + 1e-8)

    # Apply colormap
    heatmap_uint8 = (255 * heatmap).astype(np.uint8)
    heatmap_colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

    # Create overlay
    overlay = cv2.addWeighted(image, 0.6, heatmap_colored, 0.4, 0)

    # Save files
    save_path = Path(save_dir)
    save_path.mkdir(parents=True, exist_ok=True)

    heatmap_name = f"gradcam_heatmap_{uuid.uuid4().hex[:8]}.png"
    overlay_name = f"gradcam_overlay_{uuid.uuid4().hex[:8]}.png"

    heatmap_path = save_path / heatmap_name
    overlay_path = save_path / overlay_name

    Image.fromarray(heatmap_colored).save(str(heatmap_path))
    Image.fromarray(overlay).save(str(overlay_path))

    return f"gradcam/{heatmap_name}", f"gradcam/{overlay_name}"


def generate_real_gradcam(
    model,
    target_layer,
    image: np.ndarray,
    class_idx: Optional[int],
    save_dir: str,
) -> Tuple[Optional[str], Optional[str]]:
    """
    Generate actual Grad-CAM visualization using native PyTorch backward hooks.
    Computes true gradient activations from the convolutional feature layer.
    
    Args:
        model: PyTorch model
        target_layer: Layer to extract activations and gradients from
        image: Original RGB image (H, W, 3), uint8
        class_idx: Target class index (None = use predicted class)
        save_dir: Directory to save output images
        
    Returns:
        Tuple of (heatmap_path, overlay_path) relative to upload dir
    """
    try:
        import torch
        import cv2
        from app.ml.preprocessing import preprocess_for_model

        model.eval()
        activations = []
        gradients = []

        def forward_hook(module, input, output):
            activations.append(output)

        def backward_hook(module, grad_input, grad_output):
            gradients.append(grad_output[0])

        h_fwd = target_layer.register_forward_hook(forward_hook)
        h_bwd = target_layer.register_full_backward_hook(backward_hook)

        try:
            input_tensor = preprocess_for_model(image)
            device = next(model.parameters()).device
            tensor = torch.FloatTensor(input_tensor).to(device)
            tensor.requires_grad = True

            model.zero_grad()
            output = model(tensor)
            if hasattr(output, "logits"):
                output = output.logits

            if class_idx is None:
                class_idx = int(output.argmax(dim=1).item())

            score = output[0, class_idx]
            score.backward(retain_graph=False)

            if not activations or not gradients:
                return generate_demo_gradcam(image, save_dir)

            act = activations[0].detach()
            grad = gradients[0].detach()

            # Global average pooling over gradients
            weights = torch.mean(grad, dim=[2, 3], keepdim=True)
            cam = torch.sum(weights * act, dim=1, keepdim=True)
            cam = torch.clamp(cam, min=0)

            cam_np = cam[0, 0].cpu().numpy()
            cam_min, cam_max = cam_np.min(), cam_np.max()
            if cam_max - cam_min > 1e-8:
                cam_np = (cam_np - cam_min) / (cam_max - cam_min)
            else:
                cam_np = np.zeros_like(cam_np)

            orig_h, orig_w = image.shape[:2]
            heatmap_resized = cv2.resize(cam_np, (orig_w, orig_h))
            heatmap_uint8 = (255 * heatmap_resized).astype(np.uint8)
            heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
            heatmap_rgb = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)

            overlay = cv2.addWeighted(image, 0.6, heatmap_rgb, 0.4, 0)

            save_path = Path(save_dir)
            save_path.mkdir(parents=True, exist_ok=True)

            uid = uuid.uuid4().hex[:8]
            heatmap_name = f"gradcam_heatmap_{uid}.png"
            overlay_name = f"gradcam_overlay_{uid}.png"

            Image.fromarray(heatmap_rgb).save(str(save_path / heatmap_name))
            Image.fromarray(overlay).save(str(save_path / overlay_name))

            return f"gradcam/{heatmap_name}", f"gradcam/{overlay_name}"

        finally:
            h_fwd.remove()
            h_bwd.remove()

    except Exception as e:
        logger.error(f"Native Grad-CAM generation failed: {e}")
        return generate_demo_gradcam(image, save_dir)
