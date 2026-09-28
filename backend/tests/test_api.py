"""
PhytoVision-X Backend API Integration Tests
Tests health, authentication, fields, analysis, satellite, risk, and chat endpoints.
"""

import pytest  # type: ignore
import sys
from pathlib import Path
from httpx import AsyncClient, ASGITransport  # type: ignore
import io
from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from app.main import app
from app.database import init_db


@pytest.fixture(autouse=True)
async def setup_database():
    """Ensure database tables and demo seed user are initialized."""
    await init_db()


@pytest.mark.anyio
async def test_health_check():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "app_name" in data


@pytest.mark.anyio
async def test_unauthenticated_chat():
    """Verify visitors and guest farmers can ask disease questions without login."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/chat", json={"message": "How do I treat powdery mildew on squash?", "language": "en"})
        assert res.status_code == 200
        data = res.json()
        assert "response" in data
        assert "Powdery Mildew" in data["response"]


@pytest.mark.anyio
async def test_auth_login():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/api/auth/login", json={"username": "demo_farmer", "password": "farmer123"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["user"]["username"] == "demo_farmer"


@pytest.mark.anyio
async def test_authenticated_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login
        login_res = await ac.post("/api/auth/login", json={"username": "demo_farmer", "password": "farmer123"})
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Get Fields
        fields_res = await ac.get("/api/fields", headers=headers)
        assert fields_res.status_code == 200
        data = fields_res.json()
        fields = data["fields"] if "fields" in data else data
        assert len(fields) > 0

        # 3. Get Alerts
        alerts_res = await ac.get("/api/alerts", headers=headers)
        assert alerts_res.status_code == 200
        assert "alerts" in alerts_res.json()

        # 4. Leaf Image Analysis
        img = Image.new("RGB", (224, 224), color=(34, 139, 34))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)

        analyze_res = await ac.post(
            "/api/analyze/image",
            headers=headers,
            files={"image": ("test_leaf.jpg", buf, "image/jpeg")},
        )
        assert analyze_res.status_code == 200
        analysis = analyze_res.json()
        assert "result" in analysis
        assert "crop_name" in analysis["result"]
        assert "confidence" in analysis["result"]
        assert "organic_fertilizers" in analysis["result"]
        assert len(analysis["result"]["organic_fertilizers"]) > 0

        # 5. Satellite NDVI
        sat_res = await ac.get(f"/api/satellite/{fields[0]['id']}/ndvi", headers=headers)
        assert sat_res.status_code == 200
        sat_data = sat_res.json()
        assert "data" in sat_data
        assert "trend" in sat_data

        # 6. Risk Assessment
        risk_res = await ac.get(f"/api/risk/{fields[0]['id']}", headers=headers)
        assert risk_res.status_code == 200
        risk_data = risk_res.json()
        assert "overall_risk" in risk_data

        # 7. AI Chat
        chat_res = await ac.post(
            "/api/chat",
            headers=headers,
            json={"message": "What should I spray for early blight?", "language": "en"},
        )
        assert chat_res.status_code == 200
        assert "response" in chat_res.json()
