"""
Workspace root proxy package for `backend.app`.
Enables IDE language servers, linters, and scripts to resolve `from app...` seamlessly.
"""
from pathlib import Path

__path__ = [str(Path(__file__).resolve().parent.parent / "backend" / "app")]
