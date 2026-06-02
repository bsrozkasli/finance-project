from datetime import datetime, timezone
from typing import Optional
import numpy as np
import pandas as pd
from scipy.signal import find_peaks

from app.models.analysis import (
    DetectedPattern,
    PatternDetectionResponse,
    PatternType,
    PatternDirection,
)


class PatternDetectionService:
    MIN_CANDLES = 50
    
    @classmethod
    def detect(
        cls,
        symbol: str,
        interval: str,
        closes: np.ndarray,
        highs: np.ndarray,
        lows: np.ndarray,
        llm_context: Optional[str] = None,
    ) -> PatternDetectionResponse:
        """
        Detect all classical patterns from OHLCV arrays.
        
        Args:
            symbol: Trading symbol
            interval: Interval (e.g., '1d', '1h')
            closes: Array of close prices
            highs: Array of high prices
            lows: Array of low prices
            llm_context: Optional context from LLM service
            
        Returns:
            PatternDetectionResponse with detected patterns and dominant pattern
        """
        if len(closes) < cls.MIN_CANDLES:
            return PatternDetectionResponse(
                symbol=symbol,
                interval=interval,
                patterns=[],
                dominant_pattern=None,
                llm_context=llm_context,
                detected_at=datetime.now(timezone.utc),
            )
        
        patterns = []
        
        # Detect all pattern types
        patterns.extend(cls._detect_double_tops(closes, highs, lows))
        patterns.extend(cls._detect_double_bottoms(closes, highs, lows))
        patterns.extend(cls._detect_head_and_shoulders(closes, highs, lows))
        patterns.extend(cls._detect_inv_head_and_shoulders(closes, highs, lows))
        patterns.extend(cls._detect_support_bounces(closes, lows))
        patterns.extend(cls._detect_resistance_rejects(closes, highs))
        patterns.extend(cls._detect_ma_crosses(closes))
        
        # Find dominant pattern (highest confidence)
        dominant_pattern = None
        if patterns:
            dominant_pattern = max(patterns, key=lambda p: p.confidence)
        
        return PatternDetectionResponse(
            symbol=symbol,
            interval=interval,
            patterns=patterns,
            dominant_pattern=dominant_pattern,
            llm_context=llm_context,
            detected_at=datetime.now(timezone.utc),
        )
    
    @staticmethod
    def _detect_double_tops(closes: np.ndarray, highs: np.ndarray, lows: np.ndarray) -> list[DetectedPattern]:
        """Detect double top patterns using peak detection."""
        patterns = []
        try:
            peaks, peak_props = find_peaks(highs, distance=10, prominence=0.01 * np.mean(highs))
            
            if len(peaks) >= 2:
                for i in range(len(peaks) - 1):
                    peak1_idx = peaks[i]
                    peak2_idx = peaks[i + 1]
                    peak1_height = highs[peak1_idx]
                    peak2_height = highs[peak2_idx]
                    
                    # Check if peaks are similar in height (within 2%)
                    height_diff = abs(peak1_height - peak2_height) / ((peak1_height + peak2_height) / 2)
                    if height_diff < 0.02:
                        # Check valley between peaks
                        valley_between = np.min(lows[peak1_idx:peak2_idx + 1])
                        support_level = valley_between
                        
                        # Calculate confidence based on peak similarity and distance
                        distance_ratio = (peak2_idx - peak1_idx) / len(closes)
                        confidence = min(1.0, 0.7 + distance_ratio * 0.3) * (1 - height_diff)
                        
                        patterns.append(
                            DetectedPattern(
                                pattern_type=PatternType.DOUBLE_TOP,
                                direction=PatternDirection.BEARISH,
                                confidence=float(confidence),
                                start_index=peak1_idx,
                                end_index=peak2_idx,
                                description=f"Double top at {peak1_height:.2f} and {peak2_height:.2f}, support at {support_level:.2f}",
                                price_target=support_level,
                            )
                        )
        except Exception:
            pass
        
        return patterns
    
    @staticmethod
    def _detect_double_bottoms(closes: np.ndarray, highs: np.ndarray, lows: np.ndarray) -> list[DetectedPattern]:
        """Detect double bottom patterns using valley detection."""
        patterns = []
        try:
            valleys, valley_props = find_peaks(-lows, distance=10, prominence=0.01 * np.mean(lows))
            
            if len(valleys) >= 2:
                for i in range(len(valleys) - 1):
                    valley1_idx = valleys[i]
                    valley2_idx = valleys[i + 1]
                    valley1_height = lows[valley1_idx]
                    valley2_height = lows[valley2_idx]
                    
                    # Check if valleys are similar in height (within 2%)
                    height_diff = abs(valley1_height - valley2_height) / ((valley1_height + valley2_height) / 2)
                    if height_diff < 0.02:
                        # Check peak between valleys
                        peak_between = np.max(highs[valley1_idx:valley2_idx + 1])
                        resistance_level = peak_between
                        
                        # Calculate confidence
                        distance_ratio = (valley2_idx - valley1_idx) / len(closes)
                        confidence = min(1.0, 0.7 + distance_ratio * 0.3) * (1 - height_diff)
                        
                        patterns.append(
                            DetectedPattern(
                                pattern_type=PatternType.DOUBLE_BOTTOM,
                                direction=PatternDirection.BULLISH,
                                confidence=float(confidence),
                                start_index=valley1_idx,
                                end_index=valley2_idx,
                                description=f"Double bottom at {valley1_height:.2f} and {valley2_height:.2f}, resistance at {resistance_level:.2f}",
                                price_target=resistance_level,
                            )
                        )
        except Exception:
            pass
        
        return patterns
    
    @staticmethod
    def _detect_head_and_shoulders(closes: np.ndarray, highs: np.ndarray, lows: np.ndarray) -> list[DetectedPattern]:
        """Detect head and shoulders pattern."""
        patterns = []
        try:
            peaks, _ = find_peaks(highs, distance=5, prominence=0.005 * np.mean(highs))
            
            if len(peaks) >= 3:
                for i in range(len(peaks) - 2):
                    left_shoulder_idx = peaks[i]
                    head_idx = peaks[i + 1]
                    right_shoulder_idx = peaks[i + 2]
                    
                    left_shoulder = highs[left_shoulder_idx]
                    head = highs[head_idx]
                    right_shoulder = highs[right_shoulder_idx]
                    
                    # Head should be highest
                    if head > left_shoulder and head > right_shoulder:
                        # Shoulders should be similar
                        shoulder_diff = abs(left_shoulder - right_shoulder) / ((left_shoulder + right_shoulder) / 2)
                        if shoulder_diff < 0.05:
                            # Calculate neckline
                            neckline = np.min(lows[left_shoulder_idx:right_shoulder_idx + 1])
                            
                            # Calculate confidence
                            confidence = min(0.85, 0.6 + (1 - shoulder_diff) * 0.25)
                            
                            patterns.append(
                                DetectedPattern(
                                    pattern_type=PatternType.HEAD_AND_SHOULDERS,
                                    direction=PatternDirection.BEARISH,
                                    confidence=float(confidence),
                                    start_index=left_shoulder_idx,
                                    end_index=right_shoulder_idx,
                                    description=f"Head and shoulders: left {left_shoulder:.2f}, head {head:.2f}, right {right_shoulder:.2f}, neckline {neckline:.2f}",
                                    price_target=neckline,
                                )
                            )
        except Exception:
            pass
        
        return patterns
    
    @staticmethod
    def _detect_inv_head_and_shoulders(closes: np.ndarray, highs: np.ndarray, lows: np.ndarray) -> list[DetectedPattern]:
        """Detect inverse head and shoulders pattern."""
        patterns = []
        try:
            valleys, _ = find_peaks(-lows, distance=5, prominence=0.005 * np.mean(lows))
            
            if len(valleys) >= 3:
                for i in range(len(valleys) - 2):
                    left_shoulder_idx = valleys[i]
                    head_idx = valleys[i + 1]
                    right_shoulder_idx = valleys[i + 2]
                    
                    left_shoulder = lows[left_shoulder_idx]
                    head = lows[head_idx]
                    right_shoulder = lows[right_shoulder_idx]
                    
                    # Head should be lowest
                    if head < left_shoulder and head < right_shoulder:
                        # Shoulders should be similar
                        shoulder_diff = abs(left_shoulder - right_shoulder) / ((left_shoulder + right_shoulder) / 2)
                        if shoulder_diff < 0.05:
                            # Calculate neckline
                            neckline = np.max(highs[left_shoulder_idx:right_shoulder_idx + 1])
                            
                            # Calculate confidence
                            confidence = min(0.85, 0.6 + (1 - shoulder_diff) * 0.25)
                            
                            patterns.append(
                                DetectedPattern(
                                    pattern_type=PatternType.INV_HEAD_AND_SHOULDERS,
                                    direction=PatternDirection.BULLISH,
                                    confidence=float(confidence),
                                    start_index=left_shoulder_idx,
                                    end_index=right_shoulder_idx,
                                    description=f"Inverse head and shoulders: left {left_shoulder:.2f}, head {head:.2f}, right {right_shoulder:.2f}, neckline {neckline:.2f}",
                                    price_target=neckline,
                                )
                            )
        except Exception:
            pass
        
        return patterns
    
    @staticmethod
    def _detect_support_bounces(closes: np.ndarray, lows: np.ndarray) -> list[DetectedPattern]:
        """Detect support bounce patterns using 10th percentile on 50-candle window."""
        patterns = []
        try:
            window = 50
            if len(lows) < window:
                return patterns
            
            # Calculate support level (10th percentile) on a 50-candle window
            for i in range(window, len(lows)):
                window_lows = lows[i - window:i + 1]
                support_level = np.percentile(window_lows, 10)
                
                # Check if current low is near support and followed by recovery
                if lows[i] <= support_level * 1.01:  # Within 1% of support
                    # Look for recovery in next few candles
                    if i + 3 < len(closes):
                        future_closes = closes[i:i + 3]
                        recovery = (np.max(future_closes) - lows[i]) / lows[i]
                        
                        if recovery > 0.01:  # At least 1% recovery
                            confidence = min(1.0, 0.5 + recovery * 100)
                            
                            patterns.append(
                                DetectedPattern(
                                    pattern_type=PatternType.SUPPORT_BOUNCE,
                                    direction=PatternDirection.BULLISH,
                                    confidence=float(confidence),
                                    start_index=i - window,
                                    end_index=i + 2 if i + 2 < len(closes) else len(closes) - 1,
                                    description=f"Support bounce at {support_level:.2f}, bounce recovery {recovery * 100:.2f}%",
                                    price_target=None,
                                )
                            )
                            break  # Only one per window
        except Exception:
            pass
        
        return patterns
    
    @staticmethod
    def _detect_resistance_rejects(closes: np.ndarray, highs: np.ndarray) -> list[DetectedPattern]:
        """Detect resistance reject patterns using 90th percentile on 50-candle window."""
        patterns = []
        try:
            window = 50
            if len(highs) < window:
                return patterns
            
            # Calculate resistance level (90th percentile) on a 50-candle window
            for i in range(window, len(highs)):
                window_highs = highs[i - window:i + 1]
                resistance_level = np.percentile(window_highs, 90)
                
                # Check if current high is near resistance and followed by pullback
                if highs[i] >= resistance_level * 0.99:  # Within 1% of resistance
                    # Look for pullback in next few candles
                    if i + 3 < len(closes):
                        future_closes = closes[i:i + 3]
                        pullback = (highs[i] - np.min(future_closes)) / highs[i]
                        
                        if pullback > 0.01:  # At least 1% pullback
                            confidence = min(1.0, 0.5 + pullback * 100)
                            
                            patterns.append(
                                DetectedPattern(
                                    pattern_type=PatternType.RESISTANCE_REJECT,
                                    direction=PatternDirection.BEARISH,
                                    confidence=float(confidence),
                                    start_index=i - window,
                                    end_index=i + 2 if i + 2 < len(closes) else len(closes) - 1,
                                    description=f"Resistance reject at {resistance_level:.2f}, pullback {pullback * 100:.2f}%",
                                    price_target=None,
                                )
                            )
                            break  # Only one per window
        except Exception:
            pass
        
        return patterns
    
    @staticmethod
    def _detect_ma_crosses(closes: np.ndarray) -> list[DetectedPattern]:
        """Detect Golden Cross (SMA20 > SMA50) and Death Cross (SMA20 < SMA50)."""
        patterns = []
        try:
            if len(closes) < 50:
                return patterns
            
            # Calculate SMAs
            sma20 = np.convolve(closes, np.ones(20) / 20, mode='valid')
            sma50 = np.convolve(closes, np.ones(50) / 50, mode='valid')
            
            # Align arrays
            offset = len(closes) - len(sma20)
            
            # Find crossovers in recent candles (last 5)
            for i in range(max(1, len(sma20) - 5), len(sma20)):
                prev_idx = i - 1
                curr_idx = i
                
                prev_sma20 = sma20[prev_idx]
                prev_sma50 = sma50[prev_idx]
                curr_sma20 = sma20[curr_idx]
                curr_sma50 = sma50[curr_idx]
                
                # Golden Cross: SMA20 crosses above SMA50
                if prev_sma20 < prev_sma50 and curr_sma20 > curr_sma50:
                    close_idx = offset + curr_idx
                    patterns.append(
                        DetectedPattern(
                            pattern_type=PatternType.GOLDEN_CROSS,
                            direction=PatternDirection.BULLISH,
                            confidence=0.8,
                            start_index=max(0, close_idx - 50),
                            end_index=close_idx,
                            description=f"Golden Cross: SMA20 {curr_sma20:.2f} crossed above SMA50 {curr_sma50:.2f}",
                            price_target=None,
                        )
                    )
                
                # Death Cross: SMA20 crosses below SMA50
                elif prev_sma20 > prev_sma50 and curr_sma20 < curr_sma50:
                    close_idx = offset + curr_idx
                    patterns.append(
                        DetectedPattern(
                            pattern_type=PatternType.DEATH_CROSS,
                            direction=PatternDirection.BEARISH,
                            confidence=0.8,
                            start_index=max(0, close_idx - 50),
                            end_index=close_idx,
                            description=f"Death Cross: SMA20 {curr_sma20:.2f} crossed below SMA50 {curr_sma50:.2f}",
                            price_target=None,
                        )
                    )
        except Exception:
            pass
        
        return patterns
