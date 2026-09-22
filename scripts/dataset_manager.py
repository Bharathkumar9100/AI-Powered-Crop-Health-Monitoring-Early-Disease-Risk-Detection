"""
PhytoVision-X Multi-Dataset Manager
Orchestrates downloading, directory setup, verification, and inspection of the 4 core datasets:
1. PlantVillage (Lab Disease Classification Benchmark)
2. Field-acquired Plant Disease Dataset (In-Field Real-World Validation)
3. Sentinel-2 Satellite Imagery (Land-Cover & Multispectral Classification)
4. Sentinel-2 Image Time Series for Crop Mapping (Temporal Phenology & Early Stress Forecasting)
"""

import os
import sys
import argparse
from pathlib import Path
from typing import Dict, Any

# Configure UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    import io
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

DATASETS: Dict[str, Dict[str, Any]] = {
    "plantvillage": {
        "name": "PlantVillage — Plant Disease",
        "kaggle_slug": "mohitsingh1804/plantvillage",
        "url": "https://www.kaggle.com/datasets/mohitsingh1804/plantvillage",
        "folder": DATA_DIR / "plantvillage",
        "images_count": "~54,303 images",
        "classes_count": "38 classes (14 crop species)",
        "condition": "Laboratory / Controlled Background",
        "role": "Primary CNN / EfficientNet disease-classification model training",
        "expected_subdirs": ["color", "segmented", "grayscale"]
    },
    "field_acquired": {
        "name": "Field-acquired Plant Disease Dataset",
        "kaggle_slug": "alexzcheny/testdataset",
        "url": "https://www.kaggle.com/datasets/alexzcheny/testdataset",
        "folder": DATA_DIR / "field_acquired",
        "images_count": "~2,000+ field images",
        "classes_count": "Field condition pathogens & healthy controls",
        "condition": "Real-World In-Field (Natural soil, shadows, sunlight, insect marks)",
        "role": "Testing and validating whether models generalize to real farm field conditions",
        "expected_subdirs": ["train", "test", "val"]
    },
    "sentinel2_satellite": {
        "name": "Sentinel-2 Satellite Imagery (EuroSAT)",
        "kaggle_slug": "gallo33henrique/sentinel-2-satellite-imagery",
        "url": "https://www.kaggle.com/datasets/gallo33henrique/sentinel-2-satellite-imagery",
        "folder": DATA_DIR / "sentinel2_satellite",
        "images_count": "27,000 satellite image patches (64x64 px)",
        "classes_count": "10 land-cover classes (Annual Crop, Permanent Crop, Pasture, Forest, etc.)",
        "condition": "Copernicus Sentinel-2 Level-2A Multispectral (13 Bands)",
        "role": "Macro-level agricultural parcel classification and land-cover segmentation",
        "expected_subdirs": ["AnnualCrop", "Forest", "HerbaceousVegetation", "Highway", "Industrial", "Pasture", "PermanentCrop", "Residential", "River", "SeaLake"]
    },
    "sentinel2_timeseries": {
        "name": "Sentinel-2 Image Time Series for Crop Mapping",
        "kaggle_slug": "ignazio/sentinel2-crop-mapping",
        "url": "https://www.kaggle.com/datasets/ignazio/sentinel2-crop-mapping/data",
        "folder": DATA_DIR / "sentinel2_timeseries",
        "images_count": "Multi-temporal satellite acquisition series across growing seasons",
        "classes_count": "Crop growth stages & phenological health trajectories",
        "condition": "Temporal Sentinel-2 NDVI / EVI reflectance curves",
        "role": "Early forecasting of crop stress and vegetative vigor decline over time",
        "expected_subdirs": ["data", "timeseries"]
    }
}


def print_info():
    """Display comprehensive information about all 4 datasets."""
    print("=" * 78)
    print("🌿 PhytoVision-X 4-Tier Multi-Dataset Pipeline Suite")
    print("=" * 78)
    print("This platform combines laboratory deep learning, real-world field validation,")
    print("and high-altitude satellite remote sensing into a unified agricultural system:\n")

    for idx, (key, info) in enumerate(DATASETS.items(), 1):
        status = "✅ Present" if info["folder"].exists() and any(info["folder"].iterdir()) else "📂 Ready to download"
        print(f"[{idx}] {info['name']}")
        print(f"    • Role:             {info['role']}")
        print(f"    • Images / Scale:   {info['images_count']}")
        print(f"    • Classes / Scope:  {info['classes_count']}")
        print(f"    • Environment:      {info['condition']}")
        print(f"    • Local Target:     {info['folder'].relative_to(BASE_DIR)}")
        print(f"    • Kaggle URL:       {info['url']}")
        print(f"    • Kaggle CLI:       kaggle datasets download -d {info['kaggle_slug']}")
        print(f"    • Status:           {status}")
        print("-" * 78)


def setup_directories():
    """Create directory structure for all datasets."""
    print(f"📁 Initializing data directories under: {DATA_DIR}")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    for key, info in DATASETS.items():
        info["folder"].mkdir(parents=True, exist_ok=True)
        print(f"   [+] Created: {info['folder'].relative_to(BASE_DIR)}")

    print("\n✅ Dataset folder structure initialized.")
    print("To download all datasets automatically using Kaggle API:")
    print("   pip install kaggle")
    print("   kaggle datasets download -d mohitsingh1804/plantvillage -p data/plantvillage --unzip")
    print("   kaggle datasets download -d alexzcheny/testdataset -p data/field_acquired --unzip")
    print("   kaggle datasets download -d gallo33henrique/sentinel-2-satellite-imagery -p data/sentinel2_satellite --unzip")
    print("   kaggle datasets download -d ignazio/sentinel2-crop-mapping -p data/sentinel2_timeseries --unzip")


def check_status():
    """Inspect dataset presence and file counts."""
    print("📊 PhytoVision-X Dataset Status Report:")
    print("-" * 78)
    for key, info in DATASETS.items():
        path = info["folder"]
        if not path.exists():
            print(f"❌ {info['name']}: Folder missing ({path.name})")
            continue

        files = list(path.rglob("*.*"))
        img_files = [f for f in files if f.suffix.lower() in [".jpg", ".jpeg", ".png", ".tif", ".tiff", ".npy", ".csv"]]
        if img_files:
            print(f"✅ {info['name']}: {len(img_files):,} files located in {path.name}/")
        else:
            print(f"⚠️  {info['name']}: Directory empty ({path.name}/). Awaiting download.")
    print("-" * 78)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PhytoVision-X Dataset Manager")
    parser.add_argument("command", choices=["info", "setup", "status"], default="info", nargs="?")
    args = parser.parse_args()

    if args.command == "info":
        print_info()
    elif args.command == "setup":
        setup_directories()
    elif args.command == "status":
        check_status()
