"""Deterministic universe selection for memory-bounded offline research."""

from __future__ import annotations

import pandas as pd

from finance_ml.core.quality import DataQualityError, sort_market_frame


class UniverseSelectionError(ValueError):
    """Raised when a requested fixed research universe cannot be selected."""


def select_longest_history_universe(frame: pd.DataFrame, symbol_limit: int) -> pd.DataFrame:
    """Keep a deterministic static universe with the most complete histories.

    Ties are broken alphabetically. Selection is recorded in the prepared Parquet
    snapshot and prevents a 472-symbol source from exceeding the 8 GB local RAM
    budget during feature construction. It does not remove the source's inherent
    current-constituent survivorship bias.
    """

    if symbol_limit <= 0:
        raise UniverseSelectionError("symbol_limit must be positive")
    market_data = sort_market_frame(frame)
    history = (
        market_data.groupby("symbol", as_index=False)
        .size()
        .rename(columns={"size": "observation_count"})
        .sort_values(["observation_count", "symbol"], ascending=[False, True], kind="stable")
    )
    if len(history) < symbol_limit:
        raise UniverseSelectionError(
            f"Requested {symbol_limit} symbols but source contains only {len(history)}"
        )
    selected_symbols = set(history.head(symbol_limit)["symbol"])
    return market_data.loc[market_data["symbol"].isin(selected_symbols)].reset_index(drop=True)
