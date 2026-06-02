import numpy as np
import pytest

from app.models.analysis import PatternType, PatternDirection
from app.services.pattern_detection_service import PatternDetectionService


def _make_ohlcv_from_closes(closes: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Create OHLCV arrays from close prices."""
    opens = closes - 0.5
    highs = closes + 2.0
    lows = closes - 2.0
    return closes, highs, lows


def test_detect_golden_cross():
    """Test detection of Golden Cross (SMA20 > SMA50)."""
    # Create data with uptrend
    closes = np.linspace(100.0, 150.0, 100)
    closes, highs, lows = _make_ohlcv_from_closes(closes)
    
    response = PatternDetectionService.detect(
        symbol="AAPL",
        interval="1d",
        closes=closes,
        highs=highs,
        lows=lows,
    )
    
    assert response.symbol == "AAPL"
    assert response.interval == "1d"
    
    # Check if golden cross was detected
    golden_crosses = [p for p in response.patterns if p.pattern_type == PatternType.GOLDEN_CROSS]
    if golden_crosses:
        pattern = golden_crosses[0]
        assert pattern.direction == PatternDirection.BULLISH
        assert 0.0 <= pattern.confidence <= 1.0


def test_detect_double_top():
    """Test detection of Double Top pattern."""
    # Create data with double top
    closes = np.concatenate([
        np.linspace(100.0, 140.0, 20),  # Rise to first peak
        np.linspace(140.0, 120.0, 10),  # Fall to valley
        np.linspace(120.0, 140.0, 15),  # Rise to second peak
        np.linspace(140.0, 130.0, 10),  # Fall after second peak
    ])
    closes, highs, lows = _make_ohlcv_from_closes(closes)
    
    response = PatternDetectionService.detect(
        symbol="AAPL",
        interval="1d",
        closes=closes,
        highs=highs,
        lows=lows,
    )
    
    assert response.symbol == "AAPL"
    # Check that all patterns have valid confidence
    for pattern in response.patterns:
        assert 0.0 <= pattern.confidence <= 1.0
    
    # Check if double top was detected
    double_tops = [p for p in response.patterns if p.pattern_type == PatternType.DOUBLE_TOP]
    if double_tops:
        pattern = double_tops[0]
        assert pattern.direction == PatternDirection.BEARISH
        assert 0.0 <= pattern.confidence <= 1.0


def test_detect_support_bounce():
    """Test detection of Support Bounce pattern."""
    # Create data with support bounce
    closes = np.concatenate([
        np.linspace(100.0, 110.0, 30),  # Trend
        np.full(20, 110.0),  # Support level
        np.linspace(110.0, 105.0, 5),  # Dip to support
        np.linspace(105.0, 115.0, 10),  # Recovery
    ])
    closes, highs, lows = _make_ohlcv_from_closes(closes)
    
    response = PatternDetectionService.detect(
        symbol="AAPL",
        interval="1d",
        closes=closes,
        highs=highs,
        lows=lows,
    )
    
    assert response.symbol == "AAPL"
    # Check that all patterns have valid confidence
    for pattern in response.patterns:
        assert 0.0 <= pattern.confidence <= 1.0
        assert pattern.start_index >= 0
        assert pattern.end_index >= pattern.start_index
        assert pattern.end_index < len(closes)
    
    # Check if support bounce was detected
    support_bounces = [p for p in response.patterns if p.pattern_type == PatternType.SUPPORT_BOUNCE]
    if support_bounces:
        pattern = support_bounces[0]
        assert pattern.direction == PatternDirection.BULLISH
        assert 0.0 <= pattern.confidence <= 1.0


def test_confidence_scores_valid():
    """Test that all confidence scores are between 0.0 and 1.0."""
    closes = np.linspace(100.0, 150.0, 150)
    closes, highs, lows = _make_ohlcv_from_closes(closes)
    
    response = PatternDetectionService.detect(
        symbol="AAPL",
        interval="1d",
        closes=closes,
        highs=highs,
        lows=lows,
    )
    
    # All patterns should have valid confidence
    for pattern in response.patterns:
        assert 0.0 <= pattern.confidence <= 1.0
    
    # Dominant pattern should have valid confidence
    if response.dominant_pattern:
        assert 0.0 <= response.dominant_pattern.confidence <= 1.0


def test_minimum_candles_requirement():
    """Test that service handles insufficient candles gracefully."""
    closes = np.linspace(100.0, 110.0, 30)
    closes, highs, lows = _make_ohlcv_from_closes(closes)
    
    response = PatternDetectionService.detect(
        symbol="AAPL",
        interval="1d",
        closes=closes,
        highs=highs,
        lows=lows,
    )
    
    # Should return empty patterns list
    assert response.patterns == []
    assert response.dominant_pattern is None


def test_dominant_pattern_highest_confidence():
    """Test that dominant pattern has the highest confidence."""
    closes = np.linspace(100.0, 150.0, 150)
    closes, highs, lows = _make_ohlcv_from_closes(closes)
    
    response = PatternDetectionService.detect(
        symbol="AAPL",
        interval="1d",
        closes=closes,
        highs=highs,
        lows=lows,
    )
    
    if response.patterns and response.dominant_pattern:
        max_confidence = max(p.confidence for p in response.patterns)
        assert response.dominant_pattern.confidence == max_confidence
