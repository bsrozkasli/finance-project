# ADR-0006: Offline, Leakage-Safe Direction Model Baseline

Date: 2026-07-24
Status: Accepted
Deciders: Development team

## Context

The finance project needs a measurable machine-learning baseline without changing the public API, inventing market data, or coupling data acquisition to LLM agents. Development hardware has 8 GB RAM and a 4 GB laptop GPU, so the first implementation must be reproducible on CPU and must not depend on GPU training.

## Decision

Create an independent `data-service/finance_ml` package for offline research. It uses pinned Kaggle OHLCV datasets, normalises them into local Parquet snapshots, calculates only close-of-day observable features, and predicts whether a stock's five-session executable return exceeds SPY's equivalent return. It uses date-based expanding validation, a five-session embargo, a separate calibration window, and a final untouched holdout.

The baseline compares a class-prior dummy model, regularised logistic regression, and optional CPU histogram XGBoost. MLflow records local SQLite experiments under the ignored `.ml-workdir/`. No FastAPI route, Spring endpoint, frontend contract, database migration, or agent behaviour changes in this phase.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Add a prediction API immediately | It would expose an unvalidated model and expand public contracts before evidence exists. |
| Train from live provider calls | It weakens reproducibility and can silently mix revisions or unavailable data. |
| Use random cross-validation | It leaks future market regimes and overlapping labels into training. |
| Fine-tune an LLM on OHLCV rows | It is inefficient for tabular forecasting and cannot replace numerical validation. |
| Require GPU training | A 4 GB VRAM device is too constrained for a reliable first baseline. |

## Consequences

### Positive

- Results can be reproduced from dataset coordinates, local manifests, configuration, and artifacts.
- The target, cost assumptions, and holdout evidence are explicit.
- Existing application behaviour remains unchanged while research matures.
- CPU operation keeps local development accessible.

### Negative / trade-offs

- The package is an offline workflow; users must run its CLI to download, prepare, build features, and train.
- Kaggle file layouts can change, so preparation stops on schema violations instead of guessing.
- XGBoost is optional in the CLI because its grid search is the most expensive candidate on a laptop CPU.

## References

- `AGENTS.md` Sections 2, 3, 6, and 10
- `docs/ml/README.md`
- `data-service/finance_ml/config/baseline.toml`
- `data-service/finance_ml/config/datasets.lock.json`
