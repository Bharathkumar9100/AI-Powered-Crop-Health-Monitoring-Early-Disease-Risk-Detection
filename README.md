# PhytoVision-X: AI-Based Plant Disease Early Warning Platform

> **Explainable Deep Learning for Early Plant Disease Forecasting Using UAV and Satellite Imagery**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Copernicus Sentinel-2](https://img.shields.io/badge/Sentinel--2-NDVI-0284C7.svg)](https://dataspace.copernicus.eu/)

---

## 1. System Overview

**PhytoVision-X** is a farmer-centric precision agriculture platform designed for early crop disease forecasting and management. It bridges high-altitude satellite monitoring, aerial drone scouting, and ground-level leaf pathology into a unified, explainable decision support system.

### The Critical Multimodal Distinction
- **Satellite (Copernicus Sentinel-2)**: Measures canopy-level Normalized Difference Vegetation Index (NDVI) and moisture reflectance. *Detects crop stress, vigor drops, and chlorosis anomalies, but cannot definitively diagnose microscopic pathogens.*
- **UAV / Drone Orthomosaics**: Maps localized spatial stress clusters and hotspots across hectares for targeted scouting.
- **Leaf Close-Up Scans (Deep Learning + Grad-CAM)**: High-resolution convolutional neural networks (EfficientNet / MobileNet) trained on 38 PlantVillage classes to confirm specific fungal, bacterial, or viral diseases with explainable attention heatmaps.

---

## 2. Key Features

- **Explainable Leaf Disease Diagnosis**: Instant classification with visual Grad-CAM overlays highlighting exact leaf regions that influenced the AI prediction.
- **🌿 Organic Fertilizers & Bio-Remedies Advisory**: Dedicated biological remediation protocol displayed directly below leaf inspection, powered by Google Gemini AI and backed by an agronomic organic protocol database (Panchagavya, Jeevamrutha, Vermicompost, Neem cake, Trichoderma, Pseudomonas).
- **🛰️ Automatic Location & Sentinel-2 Satellite Crop Stress Analysis**:
  - **Browser Geolocation**: Automatically requests permission to detect farmer coordinates without continuous tracking.
  - **Interactive Boundary Drawing**: Draw polygon agricultural field boundaries directly over high-res Esri World Imagery with real-time geodesic hectare calculation.
  - **Sentinel-2 Multi-spectral Processing**: Modular querying of Copernicus Data Space (CDSE) / Planetary Computer for cloud-filtered scenes (< 20% cloud cover).
  - **Exact NDVI Calculation**: Computes `NDVI = (NIR - Red) / (NIR + Red)` using Band 8 and Band 4.
  - **Classified Crop Stress Raster**: Visualizes vegetation health as an interactive map overlay:
    - 🟢 **Healthy (NDVI ≥ 0.60)**
    - 🟡 **Moderate Stress (0.35 ≤ NDVI < 0.60)**
    - 🔴 **High Stress (NDVI < 0.35)**
  - **Temporal Comparison**: Tracks previous vs. latest observation with Δ NDVI delta and multi-date SVG trend line charts.
  - **Strict Scientific Guardrails**: Explicitly labels alerts as *crop stress / vegetative vigor early warning*, emphasizing that stress may stem from water deficits, soil nutrition, pests, or disease requiring field verification.
- **Aerial Drone Scouting**: Process orthomosaic aerial imagery to identify localized canopy stress zones with GPS-guided scouting points.
- **Copernicus Sentinel-2 NDVI Timeseries**: Track multi-week vegetative vigor curves and receive early warning alerts before visible foliar symptoms appear.
- **Multilingual AI Crop Advisor**: Voice-to-text (SpeechRecognition) and text-to-speech (SpeechSynthesis) audio assistant supporting **English, Tamil (தமிழ்), Hindi (हिन्दी), Telugu (తెలుగు), and Malayalam (മലയാളം)**.
- **Spatial Field Risk Map**: Interactive field micro-zone partitioning with prioritized agronomic remediation directives.
- **Zero-Friction Demo Mode**: Fully pre-seeded with realistic farm plots, disease records, and Sentinel-2 vegetation curves.

---

## 3. Multi-Dataset Architecture (4-Tier Suite)

PhytoVision-X integrates 4 best-in-class datasets spanning controlled laboratory leaf pathology, real-world field validation, and high-altitude satellite remote sensing:

| Dataset | Scale / Modality | Target Domain & Role | Kaggle Source |
| :--- | :--- | :--- | :--- |
| **PlantVillage — Plant Disease** | 54,303 images<br>38 classes (14 crops) | Primary CNN/EfficientNet disease classifier training (laboratory benchmark) | [Kaggle PlantVillage](https://www.kaggle.com/datasets/mohitsingh1804/plantvillage) |
| **Field-acquired Plant Disease** | ~2,000+ field images<br>Real-world lighting & soil | Evaluates whether models generalize under dynamic outdoor sunlight, shadows, and natural backgrounds | [Kaggle Field Dataset](https://www.kaggle.com/datasets/alexzcheny/testdataset) |
| **Sentinel-2 Satellite Imagery** | 27,000 image patches<br>10 land-cover classes | Macro-level agricultural parcel classification, crop vs. non-crop land segmentation | [Kaggle Sentinel-2](https://www.kaggle.com/datasets/gallo33henrique/sentinel-2-satellite-imagery) |
| **Sentinel-2 Time Series for Crop Mapping** | Multi-temporal acquisitions<br>Temporal NDVI trajectories | Early forecasting of crop stress and vegetative vigor decline over time | [Kaggle Time-Series](https://www.kaggle.com/datasets/ignazio/sentinel2-crop-mapping/data) |

### Dataset Management CLI
```bash
# View dataset specifications, roles, and download URLs
python scripts/dataset_manager.py info

# Initialize data directories
python scripts/dataset_manager.py setup

# Verify local file presence and counts
python scripts/dataset_manager.py status
```

---

## 4. Architecture & Tech Stack

```
PhytoVision-X/
├── backend/                  # FastAPI async Python backend
│   ├── app/
│   │   ├── api/              # Endpoints (auth, fields, analyze, satellite, risk, chat, alerts)
│   │   ├── ml/               # Classifier, Grad-CAM, UAV analyzer, preprocessing
│   │   ├── models/           # SQLAlchemy ORM models (User, Field, Prediction, Alert, etc.)
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   └── services/         # Business logic, organic advisor & multilingual AI chat
│   └── tests/                # Pytest integration test suite
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS
│   └── src/
│       ├── api/              # Axios API client
│       ├── components/       # Layout, DemoBanner, LanguageSelector, Navigation
│       ├── context/          # Auth & Language context
│       ├── hooks/            # useTranslation, useSpeechRecognition, useTextToSpeech
│       └── pages/            # Dashboard, Leaf Diagnosis, UAV, Satellite, Risk, Chat, Settings
└── scripts/
    ├── dataset_manager.py    # 4-dataset downloader, directory setup & verification
    ├── seed_demo_data.py     # Database seeder with sample farmer, fields & organic advice
    └── train_model.py        # Model training script supporting all 4 datasets
```

---

## 4. Quickstart Guide

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### Backend Setup
```bash
# 1. Activate virtual environment
.venv\Scripts\activate       # Windows
# or: source .venv/bin/activate  # Linux/macOS

# 2. Run database seeder (creates tables & demo farmer account)
python scripts/seed_demo_data.py

# 3. Start FastAPI server
uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at: `http://127.0.0.1:8000/docs`.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

### Quick Demo Login Credentials
- **Username**: `demo_farmer`
- **Password**: `farmer123`
- *(Or click the "Demo Farmer" instant access button on the header/login screen)*

---

## 5. Docker Deployment

Launch both backend and frontend with Docker Compose:
```bash
docker-compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`

---

---

## 6. Sentinel-2 Satellite & Location Setup

PhytoVision-X features a modular satellite data ingestion architecture that functions out of the box with zero external configuration in **Demo Mode**, while allowing immediate drop-in connection to official European Space Agency (ESA) Copernicus Sentinel-2 services.

### Data Provider Modes
1. **Deterministic Demo Mode (Default when credentials omitted)**:
   - Synthesizes realistic 128×128 multi-spectral reflectance tensors for user-drawn field polygons.
   - Calculates true NDVI via `(NIR - Red) / (NIR + Red)`.
   - Generates authentic PNG visual overlays (`uploads/satellite/`) for RGB satellite view, continuous NDVI gradient, and classified stress rasters.
   - Clearly marks results with a `"DEMO DATA"` badge in the interface.
2. **Live Copernicus Data Space Ecosystem (CDSE)**:
   - Queries Sentinel-2 Level-2A surface reflectance data.
   - Register a free account at [dataspace.copernicus.eu](https://dataspace.copernicus.eu).
   - In your Copernicus profile, create an OAuth2 API client to get a Client ID and Client Secret.
3. **Microsoft Planetary Computer (STAC API)**:
   - Connects to the open Sentinel-2 Level-2A STAC catalogue on Azure.
   - API key optional (free public tier available).

### Environment Configuration (.env)
```env
# Provider: 'copernicus' (default) or 'planetary_computer'
SENTINEL_DATA_PROVIDER=copernicus
COPERNICUS_CLIENT_ID=your_client_id_here
COPERNICUS_CLIENT_SECRET=your_client_secret_here
PLANETARY_COMPUTER_API_KEY=your_key_here

# Satellite Search & Quality Thresholds
SENTINEL_MAX_CLOUD_COVER=20.0
SENTINEL_SEARCH_DAYS_BACK=30

# Rule-Based Stress Thresholds (Configurable)
NDVI_HEALTHY_THRESHOLD=0.60
NDVI_MODERATE_THRESHOLD=0.35
```

### Satellite & Field API Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/location/current` | Returns server GPS fallback / default agricultural coordinates |
| `POST` | `/api/fields/{field_id}/satellite/search` | Search Sentinel-2 scenes filtered by field polygon & cloud cover |
| `POST` | `/api/fields/{field_id}/satellite/analyze` | Perform end-to-end band processing, NDVI & stress map generation |
| `GET` | `/api/fields/{field_id}/satellite/latest` | Retrieve latest satellite observation & health metrics |
| `GET` | `/api/fields/{field_id}/satellite/history` | Multi-temporal observation records for NDVI trend analysis |
| `GET` | `/api/fields/{field_id}/ndvi` | Current NDVI statistics and raster overlay URLs |
| `GET` | `/api/fields/{field_id}/stress-map` | Classified stress map percentages, color scheme, and scientific advisory |

---

## 7. Running Backend Tests

```bash
# Run complete test suite (includes leaf classification, UAV scouting & satellite service)
python -m pytest backend/tests -v

# Run satellite module tests specifically
python -m pytest backend/tests/test_satellite_module.py -v
```

---

## 8. Agronomic & Scientific Disclaimer

> **Important Scientific Labeling**:
> Satellite-based vegetation indices measure canopy reflectance and vegetative vigor. In PhytoVision-X, satellite findings are explicitly designated as **"Potential Crop Stress Detected"** or **"Vegetation Health Early Warning"**, NEVER as a definitive or proven disease diagnosis.
> Crop stress can be caused by:
> - Water shortages or irrigation imbalances
> - Nutrient deficiencies (Nitrogen, Potassium, Phosphorus)
> - Soil salinity or drainage issues
> - Pest or nematode infestations
> - Extreme weather or temperature shock
> - Pathogenic fungal, bacterial, or viral diseases
>
> Ground scouting and leaf pathology scans (via the **[ Analyze Leaf ]** tool) should always be conducted before applying chemical or biological remediation treatments.
