"""
File handling utilities: upload validation, image processing helpers.
"""

import os
import uuid
from pathlib import Path
from typing import Optional

from fastapi import UploadFile, HTTPException, status
from PIL import Image
import io

from app.config import settings


def validate_image_file(file: UploadFile) -> None:
    """Validate uploaded image file type and size."""
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Accepted: {settings.ALLOWED_EXTENSIONS}",
        )

    # Check content type
    allowed_content_types = [
        "image/jpeg", "image/png", "image/webp", "image/tiff",
    ]
    if file.content_type and file.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Content type '{file.content_type}' not allowed",
        )


async def save_upload(
    file: UploadFile,
    subfolder: str = "images",
    max_size: Optional[int] = None,
) -> str:
    """Save an uploaded file and return the relative path."""
    validate_image_file(file)

    content = await file.read()
    max_bytes = max_size or settings.max_image_bytes

    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size: {settings.MAX_IMAGE_SIZE_MB}MB",
        )

    # Validate it's actually an image by trying to open it
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image file. The file may be corrupted.",
        )

    # Generate unique filename
    ext = Path(file.filename).suffix.lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    save_dir = settings.upload_path / subfolder
    save_dir.mkdir(parents=True, exist_ok=True)
    save_path = save_dir / unique_name

    with open(save_path, "wb") as f:
        f.write(content)

    return f"{subfolder}/{unique_name}"


def get_upload_full_path(relative_path: str) -> Path:
    """Get the full filesystem path for a relative upload path."""
    return settings.upload_path / relative_path
