# Connect Gemini API, Organic Fertilizer Advisory in Leaf Diagnosis & 4-Tier Dataset Pipeline

Integrate Gemini AI with verified API key connectivity, provide comprehensive organic fertilizer and bio-remedy suggestions directly below leaf inspection, and establish a 4-dataset pipeline covering laboratory disease classification, real-world field validation, satellite land-cover mapping, and temporal crop stress forecasting.

---

## User Review Required

> [!IMPORTANT]
> **Gemini API Connectivity**: We verified that your API key is active with Google's Generative Language API. However, the model endpoint in the backend was previously pointing to `gemini-1.5-flash` (which Google has deprecated in v1beta). We confirmed `models/gemini-flash-latest` connects with HTTP 200 and generates detailed agronomic recommendations. We will configure `.env` with `GEMINI_API_KEY` and update the service endpoint to `models/gemini-flash-latest`.

> [!NOTE]
> **4-Dataset Integration**: The 4 datasets from Kaggle will be organized into distinct roles in the PhytoVision-X architecture:
> 1. **PlantVillage** (54,303 images, 38 classes) &rarr; Baseline CNN/EfficientNet disease classification.
> 2. **Field-acquired Plant Disease Dataset** &rarr; In-field validation under real-world lighting and natural farm backgrounds.
> 3. **Sentinel-2 Satellite Imagery** (27,000 patches, 10 classes) &rarr; Macro-level land cover and crop parcel identification.
> 4. **Sentinel-2 Image Time Series for Crop Mapping** &rarr; Multi-temporal NDVI monitoring and early vegetative stress forecasting.

---

## Proposed Changes

### Configuration & Gemini Services

#### [MODIFY] [.env](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/.env)
- Add `GEMINI_API_KEY=your_gemini_api_key_here` to ensure Gemini AI is active and authenticated across the backend.

#### [MODIFY] [chat_service.py](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/backend/app/services/chat_service.py)
- Update Gemini endpoint from deprecated `gemini-1.5-flash` to `models/gemini-flash-latest:generateContent`.
- Enhance the agronomic prompt with organic fertilizer guidance, biological controls, and local Indian natural farming practices (Jeevamrutha, Panchagavya, Trichoderma, Neem cake).

#### [NEW] [organic_advisor.py](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/backend/app/services/organic_advisor.py)
- Create a dedicated organic fertilizer and bio-remedy service.
- If Gemini API is online, prompt Gemini to return structured organic solutions tailored to the detected crop and disease:
  - **Bio-fertilizers & Soil Nourishers** (Vermicompost, Panchagavya, Jeevamrutha, Seaweed extract, Neem cake)
  - **Organic Foliar Sprays & Bio-Fungicides** (*Trichoderma viride*, *Pseudomonas fluorescens*, *Bacillus subtilis*, cold-pressed Neem oil 10,000 ppm, sour buttermilk spray)
  - **Micronutrient Amendments** (Wood ash for potassium, Bone meal / rock phosphate, fermented compost tea)
  - **Application Protocol** (Dosage per liter, frequency, soil vs. foliar timing)
- Provide a full built-in expert agronomic organic knowledge base covering all 38 PlantVillage classes + healthy states as a zero-latency fallback if offline.

---

### Backend Leaf Diagnosis & Prediction Schemas

#### [MODIFY] [prediction.py (schemas)](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/backend/app/schemas/prediction.py)
- Add `organic_fertilizers: List[str]` and `bio_remedies: Optional[List[Dict[str, str]]]` to `PredictionResult`.

#### [MODIFY] [analyze.py](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/backend/app/api/analyze.py)
- In `analyze_image`, invoke `get_organic_recommendations(crop, disease, is_healthy)` via the new advisor service.
- Attach the organic fertilizer advisory to the `Prediction` database record and the API response payload.

#### [MODIFY] [demo_model.py](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/backend/app/ml/demo_model.py)
- Include organic fertilizer suggestions in `PredictionOutput` and demo scenarios.

---

### Frontend UI: Organic Fertilizers Below Leaf Inspection

#### [MODIFY] [types/index.ts](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/frontend/src/types/index.ts)
- Add `organic_fertilizers?: string[]` and `dataset_source?: string` to `PredictionResult` and `ImageAnalysisResponse`.

#### [MODIFY] [client.ts](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/frontend/src/api/client.ts)
- Update `analyzeLeaf` response mapping to extract and forward `organic_fertilizers`.

#### [MODIFY] [AnalyzePage.tsx](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/frontend/src/pages/AnalyzePage.tsx)
- Insert a dedicated, prominent card directly below the leaf inspection and Grad-CAM visualizer:
  **"🌿 Organic Fertilizer & Bio-Remedy Suggestions"**.
- Display categorized organic advice:
  - **Bio-Fertilizer & Soil Nutrition**: Vermicompost, Neem cake, Panchagavya, Jeevamrutha.
  - **Bio-Foliar Sprays & Bio-Fungicides**: Trichoderma, Pseudomonas, sour buttermilk, neem oil.
  - **Application Dosages & Timing**: Clear application rate per liter, spray windows, morning/evening instructions.
- Add an indicator badge: `✨ Gemini AI Verified Organic Protocol` (when Gemini key is active) or `🌱 Expert Organic Standard`.
- Provide sample test buttons split into **PlantVillage Benchmark** (controlled background) and **Field-Acquired Dataset** (real-world field conditions) to test field robustness.
- "Ask AI Advisor for Custom Organic Mix" button to transition directly into Chat with the organic diagnosis context preloaded.

---

### Multi-Dataset Architecture & Scripts

#### [NEW] [dataset_manager.py](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/scripts/dataset_manager.py)
- CLI utility for inspecting, downloading, verifying, and preprocessing the 4 datasets:
  1. `PlantVillage` (`mohitsingh1804/plantvillage`)
  2. `Field-acquired Plant Disease` (`alexzcheny/testdataset`)
  3. `Sentinel-2 Satellite Imagery` (`gallo33henrique/sentinel-2-satellite-imagery`)
  4. `Sentinel-2 Image Time Series for Crop Mapping` (`ignazio/sentinel2-crop-mapping`)
- Provides automated folder creation under `data/`, Kaggle download instructions, and sample validation checks.

#### [MODIFY] [train_model.py](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/scripts/train_model.py)
- Add `--dataset` argument (`plantvillage`, `field_acquired`, `sentinel2_satellite`, `sentinel2_timeseries`).
- Add data loading routines and validation metrics tailored for each dataset type (laboratory leaf classification, real-world field evaluation, 10-class land-cover classification, and time-series NDVI curve evaluation).

#### [MODIFY] [seed_demo_data.py](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/scripts/seed_demo_data.py)
- Populate organic fertilizer recommendations into seeded prediction records.
- Add metadata acknowledging the 4 datasets across predictions and satellite observations.

#### [MODIFY] [SettingsPage.tsx](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/frontend/src/pages/SettingsPage.tsx)
- Update the system telemetry to showcase the 4 Multi-Dataset Pipeline cards with Kaggle links, image counts, classes, and roles.

#### [MODIFY] [README.md](file:///c:/Users/G.Bharath%20kumar/OneDrive/Desktop/plant%20disease%20detection/README.md)
- Add a comprehensive "Datasets & Benchmarks" section with links, class breakdowns, download guides, and pipeline architecture diagrams.

---

## Verification Plan

### Automated Tests
- Run backend pytest suite with virtual environment:
  ```bash
  .venv\Scripts\python -m pytest backend/tests
  ```
- Add unit test in `backend/tests/test_api.py` verifying that `/api/analyze/image` returns `organic_fertilizers` in the result payload.
- Run frontend build verification:
  ```bash
  cd frontend && npm run build
  ```
- Run dataset manager test:
  ```bash
  .venv\Scripts\python scripts/dataset_manager.py info
  ```

### Manual Verification
- Test Gemini API connectivity directly with a test query to `models/gemini-flash-latest`.
- Verify in the browser (`http://localhost:5173`) on the Leaf Diagnosis page (`/analyze`):
  - Upload/select a leaf sample (e.g. Tomato Early Blight or Potato Late Blight).
  - Verify that directly below the diagnosis and Grad-CAM visualizer, the **"🌿 Organic Fertilizer & Bio-Remedy Suggestions"** section is clearly rendered with dosages, bio-fertilizers, and application protocols.
  - Verify that clicking "Discuss with AI Assistant" carries the organic context into the Chat advisor.
- Verify on Settings page (`/settings`) that all 4 datasets are documented with active Kaggle links and descriptions.
