"""
PhytoVision-X Demo Data Seeder
Populates the SQLite database with realistic farmer accounts, fields,
disease predictions, satellite NDVI observations, and drone scans.
"""

import sys
import os
from pathlib import Path
from datetime import datetime, date, timedelta, timezone
import asyncio
import json

# Configure UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))


from app.database import AsyncSessionLocal, init_db
from app.models.user import User
from app.models.field import Field
from app.models.prediction import Prediction
from app.models.alert import Alert
from app.models.satellite import SatelliteObservation, UavScan
from app.models.chat import ChatConversation
from app.utils.security import hash_password


async def seed_data():
    print("🌱 Initializing database tables...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Check if user already exists
        from sqlalchemy import select
        existing = await db.execute(select(User).where(User.username == "demo_farmer"))
        if existing.scalar_one_or_none():
            print("ℹ️ Demo data already exists. Skipping seed.")
            return

        print("👤 Creating demo farmer account...")
        farmer = User(
            username="demo_farmer",
            email="farmer@phytovision.org",
            full_name="Rajesh Kumar (Surya Green Farms)",
            hashed_password=hash_password("farmer123"),
            language="en",
            is_active=True,
        )
        db.add(farmer)
        await db.flush()
        await db.refresh(farmer)

        print("🌾 Creating farm fields...")
        f1 = Field(
            user_id=farmer.id,
            name="North Tomato Plot A",
            crop="Tomato",
            latitude=11.0168,
            longitude=76.9558,
            area_hectares=4.5,
            planting_date=date.today() - timedelta(days=60),
            status="at_risk",
            notes="Showing signs of early blight near northwest corner sprinkler line.",
        )
        f2 = Field(
            user_id=farmer.id,
            name="East Corn Field",
            crop="Corn",
            latitude=11.0250,
            longitude=76.9700,
            area_hectares=8.2,
            planting_date=date.today() - timedelta(days=45),
            status="healthy",
            notes="Optimal vegetative stage. Canopy closure at 85%.",
        )
        f3 = Field(
            user_id=farmer.id,
            name="South Potato Block",
            crop="Potato",
            latitude=11.0080,
            longitude=76.9420,
            area_hectares=3.0,
            planting_date=date.today() - timedelta(days=75),
            status="critical",
            notes="Late blight lesion spread reported. Urgent fungicide schedule needed.",
        )
        f4 = Field(
            user_id=farmer.id,
            name="Sunrise Grape Vineyard",
            crop="Grape",
            latitude=11.0310,
            longitude=76.9850,
            area_hectares=6.1,
            planting_date=date.today() - timedelta(days=120),
            status="healthy",
            notes="Pruning completed. Fruit development stage normal.",
        )
        db.add_all([f1, f2, f3, f4])
        await db.flush()
        for f in [f1, f2, f3, f4]:
            await db.refresh(f)

        print("🔍 Creating disease detection records...")
        p1 = Prediction(
            field_id=f1.id,
            image_path="demo/tomato_early_blight.jpg",
            image_type="leaf",
            crop_name="Tomato",
            disease_name="Early blight",
            confidence=0.914,
            severity="high",
            risk_level="high",
            is_healthy=False,
            explanation="The deep learning model detected concentric brown ring lesions characteristic of Alternaria solani (Early Blight) with 91.4% confidence.",
            gradcam_path="demo/tomato_early_blight_gradcam.png",
            top_predictions=json.dumps([
                {"crop": "Tomato", "disease": "Early blight", "confidence": 0.914, "class_name": "Tomato___Early_blight"},
                {"crop": "Tomato", "disease": "Septoria leaf spot", "confidence": 0.052, "class_name": "Tomato___Septoria_leaf_spot"},
                {"crop": "Tomato", "disease": "Target Spot", "confidence": 0.021, "class_name": "Tomato___Target_Spot"},
            ]),
            recommendations=json.dumps([
                "Prune lower infected leaves showing concentric lesions immediately.",
                "Organic: Foliar spray of 3% Panchagavya (30 mL/L) every 10-12 days for systemic SAR resistance.",
                "Organic: Apply Vermicompost (500 kg/acre) pre-inoculated with Trichoderma viride to suppress soil-borne spores.",
                "Organic: Incorporate Neem cake meal (250 kg/acre) around root zones to provide slow-release bio-nitrogen.",
                "Switch to drip irrigation to prevent water splashing spores onto lower leaves."
            ]),
            model_version="EfficientNet-B0 (PlantVillage-38 Benchmark)",
            is_demo=True,
            created_at=datetime.now(timezone.utc) - timedelta(hours=4),
        )

        p2 = Prediction(
            field_id=f3.id,
            image_path="demo/potato_late_blight.jpg",
            image_type="leaf",
            crop_name="Potato",
            disease_name="Late blight",
            confidence=0.885,
            severity="critical",
            risk_level="high",
            is_healthy=False,
            explanation="Water-soaked lesions turning purplish-brown on leaves and stems indicative of Phytophthora infestans (Late Blight).",
            gradcam_path="demo/potato_late_blight_gradcam.png",
            top_predictions=json.dumps([
                {"crop": "Potato", "disease": "Late blight", "confidence": 0.885, "class_name": "Potato___Late_blight"},
                {"crop": "Potato", "disease": "Early blight", "confidence": 0.082, "class_name": "Potato___Early_blight"},
            ]),
            recommendations=json.dumps([
                "Urgent: Apply Cymoxanil + Mancozeb or Metalaxyl spray within 24 hours.",
                "Organic: Drench root zones with Pseudomonas fluorescens (10 g/L) + Trichoderma viride.",
                "Organic: Foliar spray of cold-pressed Neem oil (10,000 ppm) @ 4 mL/L with organic soap.",
                "Organic: Dust dry wood ash (50 g/plant) around root drip-line to supply bio-available potassium."
            ]),
            model_version="EfficientNet-B0 (Field-Acquired Validation Suite)",
            is_demo=True,
            created_at=datetime.now(timezone.utc) - timedelta(days=1),
        )

        p3 = Prediction(
            field_id=f2.id,
            image_path="demo/corn_healthy.jpg",
            image_type="leaf",
            crop_name="Corn",
            disease_name="healthy",
            confidence=0.965,
            severity="none",
            risk_level="low",
            is_healthy=True,
            explanation="Canopy foliage shows healthy chlorophyll absorption, uniform green coloration, and no signs of common rust or northern leaf blight.",
            gradcam_path="demo/corn_healthy_gradcam.png",
            top_predictions=json.dumps([
                {"crop": "Corn", "disease": "healthy", "confidence": 0.965, "class_name": "Corn_(maize)___healthy"},
                {"crop": "Corn", "disease": "Common rust", "confidence": 0.021, "class_name": "Corn_(maize)___Common_rust_"},
            ]),
            recommendations=json.dumps([
                "Maintain balanced organic fertility with Vermicompost @ 400 kg/acre.",
                "Organic: Apply Liquid Jeevamrutha (200 L/acre) via irrigation line every 14 days.",
                "Organic: Spray fermented seaweed extract (Ascophyllum nodosum) @ 2 mL/L during rapid vegetative growth."
            ]),
            model_version="EfficientNet-B0 (Multi-Dataset Hybrid)",
            is_demo=True,
            created_at=datetime.now(timezone.utc) - timedelta(days=2),
        )
        db.add_all([p1, p2, p3])

        print("🛰️ Creating satellite observations (NDVI time series)...")
        # Generate 6 historical NDVI points for Field 1
        base_date = date.today() - timedelta(days=35)
        ndvi_values = [0.78, 0.76, 0.72, 0.65, 0.58, 0.51]
        for i, val in enumerate(ndvi_values):
            obs = SatelliteObservation(
                field_id=f1.id,
                observation_date=base_date + timedelta(days=i * 7),
                ndvi_mean=val,
                ndvi_min=round(val - 0.12, 2),
                ndvi_max=round(val + 0.10, 2),
                ndvi_map_path=f"demo/ndvi_f1_t{i}.png",
                health_status="stressed" if val < 0.6 else "healthy",
                cloud_cover=4.2,
                source="Sentinel-2 (Copernicus)",
                is_demo=True,
            )
            db.add(obs)

        # Field 2 healthy NDVI curve
        f2_ndvi = [0.68, 0.72, 0.78, 0.82, 0.84, 0.86]
        for i, val in enumerate(f2_ndvi):
            obs = SatelliteObservation(
                field_id=f2.id,
                observation_date=base_date + timedelta(days=i * 7),
                ndvi_mean=val,
                ndvi_min=round(val - 0.08, 2),
                ndvi_max=round(val + 0.07, 2),
                ndvi_map_path=f"demo/ndvi_f2_t{i}.png",
                health_status="healthy",
                cloud_cover=2.1,
                source="Sentinel-2 (Copernicus)",
                is_demo=True,
            )
            db.add(obs)

        print("🚁 Creating UAV drone scan records...")
        uav = UavScan(
            field_id=f1.id,
            image_path="demo/uav_scan_f1.jpg",
            risk_map_path="demo/uav_risk_f1.png",
            regions_detected=3,
            abnormal_regions=json.dumps([
                {"region_id": "Zone-A1", "bbox": [120, 80, 240, 210], "stress_level": "high", "risk_score": 0.89, "chlorophyll_deficit": 0.34},
                {"region_id": "Zone-B3", "bbox": [310, 150, 420, 290], "stress_level": "moderate", "risk_score": 0.64, "chlorophyll_deficit": 0.19},
                {"region_id": "Zone-C2", "bbox": [50, 320, 180, 440], "stress_level": "low", "risk_score": 0.22, "chlorophyll_deficit": 0.05},
            ]),
            overall_health="stressed",
            analysis_notes="3 localized vegetation stress hotspots identified in northwest canopy section.",
            is_demo=True,
        )
        db.add(uav)

        print("🔔 Creating active farmer alerts...")
        a1 = Alert(
            field_id=f1.id,
            user_id=farmer.id,
            title="⚠️ High Risk: Early Blight Detected",
            message="North Tomato Plot A: Leaf analysis confirmed Early Blight with 91.4% confidence. Immediate protective fungicide application recommended.",
            severity="high",
            is_read=False,
            created_at=datetime.now(timezone.utc) - timedelta(hours=4),
        )
        a2 = Alert(
            field_id=f3.id,
            user_id=farmer.id,
            title="🚨 Critical Risk: Late Blight Warning",
            message="South Potato Block: High risk of Phytophthora infestans rapid infection spread due to humid morning fog.",
            severity="critical",
            is_read=False,
            created_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        a3 = Alert(
            field_id=f1.id,
            user_id=farmer.id,
            title="🛰️ Satellite NDVI Drop Detected",
            message="Sentinel-2 observation recorded a 21% NDVI decline in North Tomato Plot A over the past 14 days, indicating accelerated vegetative stress.",
            severity="moderate",
            is_read=True,
            created_at=datetime.now(timezone.utc) - timedelta(days=3),
        )
        db.add_all([a1, a2, a3])

        print("💬 Creating starter AI chat history...")
        chat = ChatConversation(
            user_id=farmer.id,
            language="en",
            messages=json.dumps([
                {
                    "role": "farmer",
                    "content": "What should I spray for tomato early blight?",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
                    "language": "en"
                },
                {
                    "role": "assistant",
                    "content": "For Early Blight (Alternaria solani) on tomatoes, here is an action plan:\n\n1. **Immediate Spray**: Apply Mancozeb 75 WP (2.5 g/L) or Copper Oxychloride 50 WP (3 g/L).\n2. **Organic/Bio Option**: Spray Bacillus subtilis bio-fungicide or 5% neem seed kernel extract (NSKE).\n3. **Cultural Practice**: Strip lower diseased leaves up to 20 cm from ground level and avoid overhead sprinkler watering to stop spore splash.",
                    "timestamp": (datetime.now(timezone.utc) - timedelta(hours=3, minutes=1)).isoformat(),
                    "language": "en"
                }
            ]),
            context=json.dumps({
                "crop": "Tomato",
                "disease": "Early blight",
                "risk_level": "high",
                "field_name": "North Tomato Plot A"
            })
        )
        db.add(chat)

        await db.commit()
        print("✅ Demo data seeded successfully!")
        print("   Username: demo_farmer")
        print("   Password: farmer123")


if __name__ == "__main__":
    asyncio.run(seed_data())
