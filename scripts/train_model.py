"""
PhytoVision-X ML Model Training & Multi-Dataset Pipeline
Supports training, fine-tuning, and evaluation on:
1. PlantVillage Benchmark (38 classes, 54k images)
2. Field-acquired Plant Disease Dataset (Field validation)
3. Sentinel-2 Satellite Imagery (10 land cover classes)
4. Sentinel-2 Image Time Series for Crop Mapping (Temporal phenology curves)
"""

import os
import sys
import argparse
from pathlib import Path

# Configure UTF-8 encoding for Windows terminal
if sys.platform == "win32":
    import io
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "buffer"):
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))


DATASET_PATHS = {
    "plantvillage": "data/plantvillage",
    "field_acquired": "data/field_acquired",
    "sentinel2_satellite": "data/sentinel2_satellite",
    "sentinel2_timeseries": "data/sentinel2_timeseries",
}


def train(dataset_type: str, data_dir: str, output_path: str, epochs: int = 15, batch_size: int = 32, lr: float = 1e-3):
    print("=" * 76)
    print(f"🌿 PhytoVision-X ML Training Pipeline [{dataset_type.upper()}]")
    print("=" * 76)
    print(f"   Dataset Mode:   {dataset_type}")
    print(f"   Data Directory: {data_dir}")
    print(f"   Target Weights: {output_path}")
    print(f"   Epochs: {epochs} | Batch Size: {batch_size} | Learning Rate: {lr}")

    try:
        import torch  # type: ignore
        import torch.nn as nn  # type: ignore
        import torchvision.transforms as transforms  # type: ignore
        from torchvision.datasets import ImageFolder  # type: ignore
        from torch.utils.data import DataLoader  # type: ignore
        import torchvision.models as models  # type: ignore

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"⚡ Compute Device: {device}")

        # Data transforms
        train_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])

        if not os.path.exists(data_dir) or not any(Path(data_dir).iterdir() if Path(data_dir).exists() else []):
            print(f"\n⚠️  Dataset directory '{data_dir}' is empty or not found.")
            print("   To acquire real images from Kaggle:")
            if dataset_type == "plantvillage":
                print("   kaggle datasets download -d mohitsingh1804/plantvillage -p data/plantvillage --unzip")
            elif dataset_type == "field_acquired":
                print("   kaggle datasets download -d alexzcheny/testdataset -p data/field_acquired --unzip")
            elif dataset_type == "sentinel2_satellite":
                print("   kaggle datasets download -d gallo33henrique/sentinel-2-satellite-imagery -p data/sentinel2_satellite --unzip")
            elif dataset_type == "sentinel2_timeseries":
                print("   kaggle datasets download -d ignazio/sentinel2-crop-mapping -p data/sentinel2_timeseries --unzip")
            print("   Using pre-exported models/plant_disease_model.pth for inference.")
            return

        dataset = ImageFolder(root=data_dir, transform=train_transform)
        dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=2)
        num_classes = len(dataset.classes)
        print(f"📊 Dataset loaded: {len(dataset):,} images across {num_classes} classes.")

        # Load backbone
        model = models.efficientnet_b0(weights=models.EfficientNet_B0_Weights.DEFAULT)
        in_features = int(getattr(model.classifier[1], "in_features", 1280))
        model.classifier[1] = nn.Linear(in_features, num_classes)
        model = model.to(device)

        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.AdamW(model.parameters(), lr=lr)

        for epoch in range(epochs):
            model.train()
            running_loss = 0.0
            correct = 0
            total = 0

            for images, labels in dataloader:
                images, labels = images.to(device), labels.to(device)
                optimizer.zero_grad()
                outputs = model(images)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

                running_loss += loss.item() * images.size(0)
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()

            epoch_loss = running_loss / total
            epoch_acc = 100.0 * correct / total
            print(f"   Epoch [{epoch+1}/{epochs}] Loss: {epoch_loss:.4f} | Acc: {epoch_acc:.2f}%")

        # Save weights
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        torch.save({
            "model_state_dict": model.state_dict(),
            "classes": dataset.classes,
            "architecture": "efficientnet_b0",
            "dataset": dataset_type,
            "num_classes": num_classes,
        }, output_path)
        print(f"✅ Trained model weights successfully saved to: {output_path}")

    except ImportError as e:
        print(f"⚠️ PyTorch or torchvision not installed: {e}")
        print("   Run `uv pip install torch torchvision` to enable training capabilities.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="PhytoVision-X Training & Multi-Dataset Pipeline")
    parser.add_argument(
        "--dataset",
        type=str,
        choices=["plantvillage", "field_acquired", "sentinel2_satellite", "sentinel2_timeseries"],
        default="plantvillage",
        help="Target dataset: plantvillage, field_acquired, sentinel2_satellite, sentinel2_timeseries"
    )
    parser.add_argument("--data_dir", type=str, default=None, help="Custom data directory path")
    parser.add_argument("--output_path", type=str, default="models/plant_disease_model.pth", help="Target weights file path")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--lr", type=float, default=1e-3)
    args = parser.parse_args()

    data_dir = args.data_dir or DATASET_PATHS.get(args.dataset, "data/plantvillage")
    train(args.dataset, data_dir, args.output_path, args.epochs, args.batch_size, args.lr)
