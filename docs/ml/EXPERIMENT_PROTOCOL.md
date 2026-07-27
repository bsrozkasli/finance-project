# Experiment Protocol

## Feature availability

Every feature is computed using data at or before signal close `t`. Feature groups include adjusted-price returns, excess return versus SPY, rolling volatility, moving-average ratios, MACD, RSI, Bollinger z-score, normalised ATR, volume measures, rolling beta/correlation, SPY regime measures, and optional sector category. Symbol and industry identity are excluded.

Rows require 200 prior sessions and a complete five-session executable label. Missing values are not imputed in source data; model preprocessing may median-impute feature values only inside the training pipeline.

## Temporal evaluation

1. Reserve the final 252 distinct signal dates as the untouched holdout.
2. Reserve the 126 dates before holdout for Platt/sigmoid probability calibration.
3. Use the preceding data for five expanding folds, each with a 126-date validation block.
4. Apply a five-date embargo between every fold's training end and validation start.
5. Select candidates using out-of-fold ROC-AUC first, then lower Brier score.
6. Fit the selected model on pre-calibration history, fit the calibrator only on the calibration window, and report metrics only once on holdout.

For smaller synthetic tests, the same structure is retained with smaller configuration values. Never use random splitting for market data.

## Models

| Candidate | Purpose |
|---|---|
| Dummy classifier (`prior`) | Establishes whether learned models beat class prevalence. |
| Logistic regression | Interpretable, regularised baseline with scaled numerical inputs and one-hot sector. |
| XGBoost | Optional CPU histogram gradient boosting, maximum 500 estimators, early stopping on validation data. |

## Metrics and backtest

Record ROC-AUC, Brier score, log loss, and equal-width expected calibration error. Backtest only out-of-sample probabilities:

- Rebalance every five signal dates.
- Require probability at least 0.55.
- Select the top decile, capped at 10 equal-weight positions.
- Use the label's same executable forward return.
- Deduct 10 basis points at entry and 10 basis points at exit.
- Compare compounded net strategy return with SPY's forward return over the same dates.

The backtest is a research diagnostic, not proof of economic profitability.

## Reproducibility record

Each run must retain the dataset manifests, configuration, selected candidate/parameters, metrics, report JSON, artifact hash, and MLflow run in `.ml-workdir/mlflow.db`.
