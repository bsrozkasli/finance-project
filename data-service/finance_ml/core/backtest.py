"""Conservative, rank-based backtest for precomputed out-of-sample scores."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd

from finance_ml.core.contracts import TrainingConfig


@dataclass(frozen=True)
class BacktestResult:
    """Aggregate backtest results and date-level strategy observations."""

    periods: pd.DataFrame
    strategy_total_return: float
    benchmark_total_return: float
    invested_periods: int


def run_ranked_backtest(predictions: pd.DataFrame, config: TrainingConfig) -> BacktestResult:
    """Backtest equal-weighted top-decile picks with entry and exit costs.

    Inputs must be strictly out-of-sample predictions. Returns are the same
    executable forward returns used by the label definition, so the strategy
    rebalances only every configured number of signal dates.
    """

    required = {"signal_date", "symbol", "probability", "asset_forward_return", "spy_forward_return"}
    missing = sorted(required.difference(predictions.columns))
    if missing:
        raise ValueError(f"predictions are missing required columns: {', '.join(missing)}")
    frame = predictions.copy()
    frame["signal_date"] = pd.to_datetime(frame["signal_date"], errors="raise").dt.normalize()
    frame = frame.sort_values(["signal_date", "probability", "symbol"], ascending=[True, False, True])
    all_dates = pd.DatetimeIndex(sorted(frame["signal_date"].unique()))
    rebalance_dates = set(all_dates[:: config.rebalance_sessions])
    transaction_cost = 2 * config.transaction_cost_bps / 10_000
    periods: list[dict[str, object]] = []
    for signal_date, group in frame.groupby("signal_date", sort=True):
        if signal_date not in rebalance_dates:
            continue
        candidates = group.loc[group["probability"] >= config.probability_threshold].copy()
        top_decile_count = max(1, int(np.ceil(len(group) * 0.10)))
        selected = candidates.nlargest(min(top_decile_count, config.max_positions), "probability")
        gross_return = float(selected["asset_forward_return"].mean()) if not selected.empty else 0.0
        net_return = gross_return - transaction_cost if not selected.empty else 0.0
        periods.append(
            {
                "signal_date": signal_date,
                "selected_symbols": ",".join(selected["symbol"].tolist()),
                "position_count": int(len(selected)),
                "strategy_gross_return": gross_return,
                "strategy_net_return": net_return,
                "benchmark_return": float(group["spy_forward_return"].iloc[0]),
            }
        )
    period_frame = pd.DataFrame(periods)
    if period_frame.empty:
        return BacktestResult(period_frame, 0.0, 0.0, 0)
    return BacktestResult(
        periods=period_frame,
        strategy_total_return=float((1 + period_frame["strategy_net_return"]).prod() - 1),
        benchmark_total_return=float((1 + period_frame["benchmark_return"]).prod() - 1),
        invested_periods=int((period_frame["position_count"] > 0).sum()),
    )
