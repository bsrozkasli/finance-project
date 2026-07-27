# Offline ML Baseline Architecture

This package is a research workflow, not a web API. It resides in `data-service/finance_ml` but does not import the FastAPI application, call live providers, modify PostgreSQL, or feed raw data to agents.

## Flow

```text
Pinned Kaggle coordinates
        -> local raw download (.ml-workdir/raw)
        -> schema + OHLCV quality gates
        -> canonical adjusted Parquet snapshots
        -> leakage-safe features and relative-SPY labels
        -> chronological CV / calibration / holdout
        -> dummy, logistic, optional CPU XGBoost
        -> local MLflow SQLite, report, model artifact
```

The generated workspace is intentionally ignored by Git. Dataset lock files, source code, unit tests, and documentation are committed; downloaded datasets and model outputs are not.

## Target

For a signal observed at close `t`:

```text
asset_return = adjusted_close[t+5] / adjusted_open[t+1] - 1
spy_return   = SPY adjusted_close[t+5] / SPY adjusted_open[t+1] - 1
target       = 1 when asset_return - spy_return > 0, otherwise 0
```

The entry at `t+1` open makes the label executable: a decision made after close `t` cannot trade at that same close.

## Commands

Run from `data-service/` after installing `requirements-ml.txt` and setting a Kaggle credential supported by `kagglehub` (for example `KAGGLE_API_TOKEN`). Do not commit the credential.

```powershell
python -m finance_ml.cli --workspace .ml-workdir download
python -m finance_ml.cli --workspace .ml-workdir prepare --stocks-csv <stocks.csv> --spy-csv <spy.csv>
python -m finance_ml.cli --workspace .ml-workdir features
python -m finance_ml.cli --workspace .ml-workdir train
python -m finance_ml.cli --workspace .ml-workdir train --include-xgboost
```

The current Kaggle package structures are not assumed. Inspect downloaded files and provide the actual asset and SPY CSV paths to `prepare`. Any missing OHLCV column, duplicate `(symbol, date)`, invalid OHLC relationship, or non-finite value stops the process.

## Boundaries

- This phase adds no FastAPI routes and no public DTOs.
- `symbol` and industry identity are excluded from model features; `sector` is one-hot encoded only when provided, otherwise it is `UNKNOWN`.
- Features use adjusted OHLC for returns and technical measures. Raw OHLC remains in the Parquet snapshot for provenance.
- No forward fill is performed. Warm-up, missing-feature, and incomplete-label rows are dropped.
- The model must not be presented as investment advice or as a production trading recommendation.

See [the dataset card](DATASET_CARD.md), [experiment protocol](EXPERIMENT_PROTOCOL.md), and [model-card template](MODEL_CARD_TEMPLATE.md).
