import math

import pandas as pd
import pandas_ta as ta

from app.models.analysis import SentimentScore, TechnicalIndicators


class TechnicalAnalysisService:
    MIN_CANDLES = 30

    @classmethod
    def compute_indicators(cls, candles: pd.DataFrame) -> TechnicalIndicators:
        if candles is None or candles.empty or len(candles.index) < cls.MIN_CANDLES:
            raise ValueError(f"At least {cls.MIN_CANDLES} candles are required for technical analysis")

        frame = candles.copy()
        frame.columns = [col.lower() for col in frame.columns]

        for required in ("open", "high", "low", "close", "volume"):
            if required not in frame.columns:
                raise ValueError(f"Missing required column: {required}")

        frame["rsi"] = ta.rsi(frame["close"], length=14)

        macd = ta.macd(frame["close"], fast=12, slow=26, signal=9)
        frame["macd"] = macd["MACD_12_26_9"]
        frame["macd_signal"] = macd["MACDs_12_26_9"]
        frame["macd_histogram"] = macd["MACDh_12_26_9"]

        bbands = ta.bbands(frame["close"], length=20, std=2)
        frame["bb_lower"] = cls._first_series(bbands, "BBL_")
        frame["bb_middle"] = cls._first_series(bbands, "BBM_")
        frame["bb_upper"] = cls._first_series(bbands, "BBU_")

        frame["atr"] = ta.atr(frame["high"], frame["low"], frame["close"], length=14)
        frame["sma"] = ta.sma(frame["close"], length=20)
        frame["ema"] = ta.ema(frame["close"], length=20)

        last = frame.iloc[-1]
        return TechnicalIndicators(
            rsi=cls._to_float(last.get("rsi")),
            macd=cls._to_float(last.get("macd")),
            macd_signal=cls._to_float(last.get("macd_signal")),
            macd_histogram=cls._to_float(last.get("macd_histogram")),
            bb_upper=cls._to_float(last.get("bb_upper")),
            bb_middle=cls._to_float(last.get("bb_middle")),
            bb_lower=cls._to_float(last.get("bb_lower")),
            atr=cls._to_float(last.get("atr")),
            sma=cls._to_float(last.get("sma")),
            ema=cls._to_float(last.get("ema")),
        )

    @staticmethod
    def signal(indicators: TechnicalIndicators) -> SentimentScore:
        bullish = 0
        bearish = 0

        if indicators.rsi is not None:
            if indicators.rsi < 30:
                bullish += 1
            elif indicators.rsi > 70:
                bearish += 1

        if indicators.macd is not None and indicators.macd_signal is not None:
            if indicators.macd >= indicators.macd_signal:
                bullish += 1
            else:
                bearish += 1

        if indicators.ema is not None and indicators.sma is not None:
            if indicators.ema >= indicators.sma:
                bullish += 1
            else:
                bearish += 1

        total = bullish + bearish
        if total == 0:
            return SentimentScore(action="HOLD", confidence=0.0)

        if bullish == bearish:
            action = "HOLD"
        elif bullish > bearish:
            action = "BUY"
        else:
            action = "SELL"

        confidence = round(max(bullish, bearish) / total, 4)
        return SentimentScore(action=action, confidence=confidence)

    @staticmethod
    def _to_float(value: object) -> float | None:
        if value is None:
            return None
        if isinstance(value, float) and math.isnan(value):
            return None
        if pd.isna(value):
            return None
        return float(value)

    @staticmethod
    def _first_series(frame: pd.DataFrame, prefix: str) -> pd.Series:
        for col in frame.columns:
            if col.startswith(prefix):
                return frame[col]
        raise ValueError(f"Unable to find indicator column with prefix {prefix}")
