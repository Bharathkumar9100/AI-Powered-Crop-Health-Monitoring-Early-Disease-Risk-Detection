import pytest  # type: ignore
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport  # type: ignore
import io
import numpy as np
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.database import init_db


@pytest.fixture(autouse=True)
async def setup_database():
    await init_db()


def make_test_image(color_rgb=(40, 150, 45), add_spots=False) -> bytes:
    img = np.zeros((224, 224, 3), dtype=np.uint8)
    img[:, :] = color_rgb
    if add_spots:
        # Add necrotic brown lesion spots
        img[40:110, 40:110] = [150, 60, 20]
        img[140:180, 120:170] = [140, 50, 15]
    pil_img = Image.fromarray(img)
    buf = io.BytesIO()
    pil_img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.anyio
async def test_healthy_leaf_analysis_no_gradcam():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/auth/login", json={"username": "demo_farmer", "password": "farmer123"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Fetch user fields
        fields_res = await ac.get("/api/fields", headers=headers)
        assert fields_res.status_code == 200
        data = fields_res.json()
        fields = data["fields"] if "fields" in data else data
        assert len(fields) > 0
        field_id = fields[0]["id"]

        # 2. Upload healthy leaf associated with field
        healthy_bytes = make_test_image(color_rgb=(40, 155, 45), add_spots=False)
        files = {"image": ("healthy_tomato_leaf.jpg", healthy_bytes, "image/jpeg")}
        data = {"field_id": str(field_id)}

        res = await ac.post("/api/analyze/image", files=files, data=data, headers=headers)
        assert res.status_code == 200
        analysis = res.json()

        # Verify healthy prediction
        pred = analysis["result"]
        assert pred["is_healthy"] is True
        assert "healthy" in pred["disease_name"].lower()
        assert pred["severity"] == "none"

        # Verify Grad-CAM is NOT generated or returned for healthy leaves
        assert analysis.get("gradcam_url") is None
        assert analysis.get("overlay_url") is None
        assert analysis.get("heatmap_url") is None


@pytest.mark.anyio
async def test_diseased_leaf_analysis_generates_gradcam():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_res = await ac.post("/api/auth/login", json={"username": "demo_farmer", "password": "farmer123"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Upload diseased leaf with necrotic spots
        diseased_bytes = make_test_image(color_rgb=(40, 140, 40), add_spots=True)
        files = {"image": ("diseased_leaf.jpg", diseased_bytes, "image/jpeg")}

        res = await ac.post("/api/analyze/image", files=files, headers=headers)
        assert res.status_code == 200
        analysis = res.json()

        # Verify disease prediction
        pred = analysis["result"]
        assert pred["is_healthy"] is False
        assert pred["disease_name"].lower() != "healthy"

        # Verify Grad-CAM IS generated for diseased leaves
        assert analysis.get("overlay_url") is not None
        assert analysis.get("heatmap_url") is not None
