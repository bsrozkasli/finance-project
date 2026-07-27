# Model Card Template: Relative Direction Classifier

Copy this template into a dated experiment report after a model is selected.

## Identity

- Model name and artifact hash:
- Training run / MLflow run ID:
- Dataset manifest hashes:
- Configuration commit:
- Training period / calibration period / holdout period:

## Intended use

- Intended use:
- Out-of-scope use:
- User-facing wording and investment-risk disclaimer:

## Inputs and output

- Feature list and preprocessing version:
- Target definition:
- Probability threshold and position-selection policy:
- Data availability assumptions:

## Evaluation

| Dataset | ROC-AUC | Brier | Log loss | ECE | Notes |
|---|---:|---:|---:|---:|---|
| Cross-validation | | | | | |
| Calibration | | | | | |
| Untouched holdout | | | | | |

- Backtest net return versus SPY:
- Transaction-cost assumption:
- Number of rebalances and invested periods:

## Limitations and risks

- Survivorship/delisting risk:
- Dataset revision and corporate-action risk:
- Regime sensitivity:
- Liquidity, spread, and market-impact omissions:
- Calibration drift monitoring plan:

## Approval

- Research reviewer:
- Date:
- Approved for offline research only / API integration proposal:
