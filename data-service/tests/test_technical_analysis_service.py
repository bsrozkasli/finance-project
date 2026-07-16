import numpy as np
import pandas as pd
import pytest

from app.services.technical_analysis_service import TechnicalAnalysisService


def _sample_ohlcv(size: int = 60) -> pd.DataFrame:
    close = np.linspace(100.0, 130.0, size)
    open_ = close - 1.0
    high = close + 2.0
    low = close - 2.0
    volume = np.linspace(1_000_000, 1_500_000, size)

    return pd.DataFrame(
        {
            "Open": open_,
            "High": high,
            "Low": low,
            "Close": close,
            "Volume": volume,
        }
    )


def test_compute_indicators_returns_expected_fields() -> None:
    frame = _sample_ohlcv()

    indicators = TechnicalAnalysisService.compute_indicators(frame)

    assert indicators.rsi is not None
    assert 0.0 <= indicators.rsi <= 100.0

    assert indicators.macd is not None
    assert indicators.macd_signal is not None
    assert indicators.macd_histogram is not None

    assert indicators.bb_lower is not None
    assert indicators.bb_middle is not None
    assert indicators.bb_upper is not None
    assert indicators.bb_lower <= indicators.bb_middle <= indicators.bb_upper

    assert indicators.atr is not None
    assert indicators.atr >= 0.0
    assert indicators.sma is not None
    assert indicators.sma20 == indicators.sma
    assert indicators.sma50 is not None
    assert indicators.sma200 is None
    assert indicators.ema is not None


def test_compute_indicators_requires_minimum_candles() -> None:
    frame = _sample_ohlcv(size=TechnicalAnalysisService.MIN_CANDLES - 1)

    with pytest.raises(ValueError, match="At least"):
        TechnicalAnalysisService.compute_indicators(frame)


def test_compute_indicators_returns_200_day_average_when_history_is_long_enough() -> None:
    indicators = TechnicalAnalysisService.compute_indicators(_sample_ohlcv(size=220))

    assert indicators.sma200 is not None


def test_signal_action_and_confidence_are_valid() -> None:
    indicators = TechnicalAnalysisService.compute_indicators(_sample_ohlcv())

    signal = TechnicalAnalysisService.signal(indicators)

    assert signal.action in {"BUY", "SELL", "HOLD"}
    assert 0.0 <= signal.confidence <= 1.0
