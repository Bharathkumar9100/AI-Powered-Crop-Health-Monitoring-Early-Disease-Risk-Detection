"""
PhytoVision-X Satellite & Location Module Tests
Tests location permissions/fallbacks, Sentinel-2 searching,
Level-2A Red & NIR band processing, NDVI computation, and stress mapping.
"""

import sys
from pathlib import Path
import pytest
import numpy as np
from httpx import AsyncClient, ASGITransport

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.database import init_db
from app.services.satellite_service import (
    calculate_ndvi,
    generate_stress_map_image,
    generate_ndvi_gradient_image,
    rasterize_geojson_polygon,
)


def test_calculate_ndvi_direct():
    """Verify NDVI formula: (NIR - Red) / (NIR + Red) and stress thresholds."""
    # Scenario 1: Dense Healthy Crop (NIR=0.75, Red=0.10)
    # NDVI = (0.75 - 0.10) / (0.75 + 0.10) = 0.65 / 0.85 = 0.765 -> Healthy
    red = np.full((10, 10), 0.10, dtype=np.float32)
    nir = np.full((10, 10), 0.75, dtype=np.float32)

    res = calculate_ndvi(red, nir, healthy_threshold=0.60, moderate_threshold=0.35)
    assert res["ndvi_mean"] == pytest.approx(0.765, abs=0.01)
    assert res["healthy_area_pct"] == 100.0
    assert res["moderate_stress_pct"] == 0.0
    assert res["high_stress_pct"] == 0.0

    # Scenario 2: High Stress Crop (NIR=0.35, Red=0.25)
    # NDVI = (0.35 - 0.25) / (0.35 + 0.25) = 0.10 / 0.60 = 0.167 -> High Stress
    red_stressed = np.full((10, 10), 0.25, dtype=np.float32)
    nir_stressed = np.full((10, 10), 0.35, dtype=np.float32)

    res_stressed = calculate_ndvi(red_stressed, nir_stressed, healthy_threshold=0.60, moderate_threshold=0.35)
    assert res_stressed["ndvi_mean"] == pytest.approx(0.167, abs=0.01)
    assert res_stressed["high_stress_pct"] == 100.0
    assert res_stressed["healthy_area_pct"] == 0.0


def test_raster_generation():
    """Verify PNG raster creation for NDVI and Stress maps."""
    ndvi_array = np.array([
        [0.8, 0.7],
        [0.45, 0.2]
    ], dtype=np.float32)

    stress_img = generate_stress_map_image(ndvi_array, healthy_thresh=0.60, moderate_thresh=0.35)
    assert stress_img.size == (2, 2)
    assert stress_img.mode == "RGBA"

    ndvi_img = generate_ndvi_gradient_image(ndvi_array)
    assert ndvi_img.size == (2, 2)
    assert ndvi_img.mode == "RGBA"


def test_geojson_rasterization():
    """Verify polygon rasterization into 2D mask."""
    geo = {
        "type": "Polygon",
        "coordinates": [[[76.95, 11.01], [76.96, 11.01], [76.96, 11.02], [76.95, 11.02], [76.95, 11.01]]]
    }
    mask, bbox = rasterize_geojson_polygon(geo, width=32, height=32)
    assert mask.shape == (32, 32)
    assert np.sum(mask) > 0  # Interior is populated


@pytest.mark.anyio
async def test_location_current_api():
    """Verify location guidance API endpoint."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/location/current")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ready"
        assert "default_latitude" in data
        assert "default_longitude" in data


@pytest.mark.anyio
async def test_satellite_endpoints_end_to_end():
    """Verify authenticated Sentinel-2 search, analysis, history, latest, and stress-map APIs."""
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Login
        login_res = await ac.post("/api/auth/login", json={"username": "demo_farmer", "password": "farmer123"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get field id
        fields_res = await ac.get("/api/fields", headers=headers)
        field_id = fields_res.json()["fields"][0]["id"]

        # 1. Search scenes
        search_res = await ac.post(
            f"/api/fields/{field_id}/satellite/search",
            headers=headers,
            json={"max_cloud_cover": 25.0},
        )
        assert search_res.status_code == 200
        scenes = search_res.json()
        assert len(scenes) > 0
        assert "scene_id" in scenes[0]
        assert "cloud_cover" in scenes[0]

        # 2. Analyze field
        analyze_res = await ac.post(
            f"/api/fields/{field_id}/satellite/analyze",
            headers=headers,
            json={
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[76.95, 11.01], [76.96, 11.01], [76.96, 11.02], [76.95, 11.02], [76.95, 11.01]]]
                }
            },
        )
        assert analyze_res.status_code == 200
        analysis = analyze_res.json()
        assert "ndvi_mean" in analysis
        assert "healthy_area_pct" in analysis
        assert "moderate_stress_pct" in analysis
        assert "high_stress_pct" in analysis
        assert "stress_map_url" in analysis
        assert "disclaimer" in analysis
        assert "early-warning" in analysis["disclaimer"].lower()

        # 3. Get latest
        latest_res = await ac.get(f"/api/fields/{field_id}/satellite/latest", headers=headers)
        assert latest_res.status_code == 200
        latest = latest_res.json()
        assert latest["field_id"] == field_id
        assert latest["ndvi_mean"] > 0

        # 4. Get history
        hist_res = await ac.get(f"/api/fields/{field_id}/satellite/history", headers=headers)
        assert hist_res.status_code == 200
        assert len(hist_res.json()) >= 1

        # 5. Get stress map
        stress_res = await ac.get(f"/api/fields/{field_id}/stress-map", headers=headers)
        assert stress_res.status_code == 200
        assert "stress_map_url" in stress_res.json()
        assert "healthy_area_pct" in stress_res.json()
