"""Independent checks for metric and strategy accounting."""

from __future__ import annotations

import numpy as np
import pandas as pd
import pytest

from finance_ml.core.backtest import run_ranked_backtest
from finance_ml.core.contracts import TrainingConfig
from finance_ml.core.evaluation import classification_metrics, roc_auc_score


def test_auc_uses_average_ranks_for_tied_scores() -> None:
    assert roc_auc_score(np.array([0, 1, 0, 1]), np.array([0.1, 0.5, 0.5, 0.9])) == pytest.approx(0.875)


def test_metrics_report_perfectly_calibrated_extreme_predictions() -> None:
    metrics = classification_metrics(np.array([0, 1]), np.array([0.0, 1.0]))

    assert metrics["brier_score"] == pytest.approx(0.0)
    assert metrics["expected_calibration_error"] == pytest.approx(0.0)


def test_backtest_selects_top_decile_and_charges_entry_exit_costs() -> None:
    date = pd.Timestamp("2024-01-05")
    predictions = pd.DataFrame(
        {
            "signal_date": [date] * 20,
            "symbol": [f"S{i:02d}" for i in range(20)],
            "probability": [0.90, 0.80] + [0.40] * 18,
            "asset_forward_return": [0.03, 0.01] + [0.0] * 18,
            "spy_forward_return": [0.005] * 20,
        }
    )
    result = run_ranked_backtest(
        predictions,
        TrainingConfig(probability_threshold=0.55, transaction_cost_bps=10.0),
    )

    assert result.invested_periods == 1
    assert result.periods.loc[0, "position_count"] == 2
    assert result.periods.loc[0, "strategy_net_return"] == pytest.approx(0.018)
    assert result.benchmark_total_return == pytest.approx(0.005)
