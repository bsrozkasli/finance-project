"""Kaggle download adapter with immutable dataset coordinates."""

from __future__ import annotations

from pathlib import Path

from finance_ml.core.contracts import DatasetSpecification


class KaggleDownloadError(RuntimeError):
    """Raised when a pinned Kaggle dataset cannot be fetched."""


def download_dataset(specification: DatasetSpecification, destination: Path) -> Path:
    """Download exactly the pinned dataset version into a caller-owned directory.

    Authentication is handled by kagglehub (for example through KAGGLE_API_TOKEN).
    No credentials are read, logged, or persisted by this adapter.
    """

    try:
        import kagglehub
    except ImportError as error:  # pragma: no cover - exercised in installed runtime
        raise KaggleDownloadError("kagglehub is required; install requirements-ml.txt") from error

    destination.mkdir(parents=True, exist_ok=True)
    try:
        versioned_handle = f"{specification.handle}/versions/{specification.version}"
        downloaded = kagglehub.dataset_download(versioned_handle, output_dir=str(destination))
    except Exception as error:  # kagglehub exception hierarchy is not stable
        raise KaggleDownloadError(
            f"Unable to download Kaggle dataset {specification.handle} v{specification.version}"
        ) from error
    return Path(downloaded)
