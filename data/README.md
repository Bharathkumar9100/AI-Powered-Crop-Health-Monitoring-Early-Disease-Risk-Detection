# Datasets Directory

This directory holds dataset structures for training and validation:

- `plantvillage/`: PlantVillage benchmark laboratory dataset (54,303 leaf images across 38 classes).
- `field_acquired/`: Real-world field-acquired plant disease images.
- `sentinel2_satellite/`: Sentinel-2 multispectral satellite patches (10 land cover/crop classes).
- `sentinel2_timeseries/`: Multi-temporal NDVI and spectral indices time-series.

Use `python scripts/dataset_manager.py` to prepare, inspect, or manage datasets.
