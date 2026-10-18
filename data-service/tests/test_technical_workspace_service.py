from datetime import datetime, timedelta, timezone

import pandas as pd
import pytest

from app.services.technical_workspace_service import TechnicalWorkspaceService


def _history(count: int = 35) -> pd.DataFrame:
    start = datetime(2026, 1, 2, tzinfo=timezone.utc)
    return pd.DataFrame(
        {
            "Date": [start + timedelta(days=index) for index in range(count)],
            "Open": [100.0 + index for index in range(count)],
            "High": [101.0 + index for index in range(count)],
            "Low": [99.0 + index for index in range(count)],
            "Close": [100.5 + index for index in range(count)],
            "Volume": [1000.0] * count,
        }
    )


def test_workspace_deduplicates_daily_bars_and_returns_levels():
    history = _history()
    duplicate = history.iloc[[10]].copy()
    duplicate["Close"] = 999.0
    workspace = TechnicalWorkspaceService.build(
        pd.concat([history, duplicate], ignore_index=True), "AAPL", "1d", "1y"
    )

    assert len(workspace.candles) == 35
    assert workspace.data_quality["input_candles"] == 36
    assert workspace.data_quality["deduplicated_candles"] == 1
    assert workspace.candles[10].close == 999.0
    assert workspace.oscillators


def test_workspace_rejects_insufficient_candles():
    with pytest.raises(ValueError, match="At least 30 candles"):
        TechnicalWorkspaceService.build(_history(29), "AAPL", "1d", "1y")