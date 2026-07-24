"""Command-line entry points for the offline ML baseline."""

from __future__ import annotations

import argparse
from pathlib import Path

from finance_ml.adapters.kaggle import download_dataset
from finance_ml.pipeline import (
    build_and_store_features,
    initialise_workspace,
    load_dataset_specifications,
    load_training_config,
    prepare_csv_snapshot,
    run_experiment,
)


PACKAGE_ROOT = Path(__file__).resolve().parent
DEFAULT_CONFIG = PACKAGE_ROOT / "config" / "baseline.toml"
DEFAULT_DATASETS = PACKAGE_ROOT / "config" / "datasets.lock.json"


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Offline US-stock direction ML baseline")
    parser.add_argument("--workspace", type=Path, default=Path(".ml-workdir"))
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("download", help="download pinned Kaggle datasets")

    prepare = subparsers.add_parser("prepare", help="normalise CSV files into Parquet snapshots")
    prepare.add_argument("--stocks-csv", required=True, type=Path)
    prepare.add_argument("--spy-csv", required=True, type=Path)

    features = subparsers.add_parser("features", help="build leakage-safe feature observations")
    features.add_argument("--stocks-parquet", type=Path)
    features.add_argument("--spy-parquet", type=Path)

    train = subparsers.add_parser("train", help="run temporal evaluation and local MLflow tracking")
    train.add_argument("--features-parquet", type=Path)
    train.add_argument("--include-xgboost", action="store_true")
    return parser


def main() -> int:
    args = _parser().parse_args()
    workspace = initialise_workspace(args.workspace)
    config = load_training_config(DEFAULT_CONFIG)
    if args.command == "download":
        for specification in load_dataset_specifications(DEFAULT_DATASETS):
            destination = workspace.raw_dir / f"{specification.name}-v{specification.version}"
            print(download_dataset(specification, destination))
        return 0
    if args.command == "prepare":
        print(prepare_csv_snapshot(args.stocks_csv, "us_stocks_ohlcv-v1", workspace.prepared_dir / "stocks.parquet"))
        print(prepare_csv_snapshot(args.spy_csv, "spy_ohlcv-v1", workspace.prepared_dir / "spy.parquet"))
        return 0
    if args.command == "features":
        stocks = args.stocks_parquet or workspace.prepared_dir / "stocks.parquet"
        spy = args.spy_parquet or workspace.prepared_dir / "spy.parquet"
        features = build_and_store_features(stocks, spy, workspace.feature_dir / "features.parquet", config)
        print(f"Wrote {len(features)} observations")
        return 0
    feature_path = args.features_parquet or workspace.feature_dir / "features.parquet"
    result = run_experiment(feature_path, workspace, config, include_xgboost=args.include_xgboost)
    print(f"Selected {result.selected_candidate.name}; report: {result.report_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
