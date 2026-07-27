from __future__ import annotations

from datetime import timezone

import pandas as pd
import pandas_ta as ta

from app.models.analysis import (
    TechnicalCandle,
    TechnicalLevel,
    TechnicalSeriesPoint,
    TechnicalWorkspaceResponse,
)
from app.services.technical_analysis_service import TechnicalAnalysisService


class TechnicalWorkspaceService:
    """Builds one canonical OHLCV/indicator payload for chart clients."""

    @classmethod
    def canonicalize(cls, history: pd.DataFrame, interval: str) -> pd.DataFrame:
        frame = history.copy()
        frame.columns = [str(column).lower() for column in frame.columns]
        timestamp_column = "datetime" if "datetime" in frame.columns else "date"
        if timestamp_column not in frame.columns:
            raise ValueError("Historical data has no timestamp column")
        frame["timestamp"] = pd.to_datetime(frame[timestamp_column], utc=True, errors="coerce")
        frame = frame.dropna(subset=["timestamp", "open", "high", "low", "close", "volume"])
        frame = frame.sort_values("timestamp")
        if interval == "1d":
            frame["session_date"] = frame["timestamp"].dt.date
            frame = frame.groupby("session_date", as_index=False, sort=True).tail(1)
        return frame.sort_values("timestamp").reset_index(drop=True)

    @classmethod
    def build(cls, history: pd.DataFrame, symbol: str, interval: str, range_value: str) -> TechnicalWorkspaceResponse:
        frame = cls.canonicalize(history, interval)
        if len(frame.index) < TechnicalAnalysisService.MIN_CANDLES:
            raise ValueError(f"At least {TechnicalAnalysisService.MIN_CANDLES} candles are required for technical analysis")

        close = frame["close"]
        high = frame["high"]
        low = frame["low"]
        volume = frame["volume"]
        indexed = frame.set_index("timestamp")
        series = {
            "sma20": ta.sma(close, length=20),
            "sma50": ta.sma(close, length=50),
            "sma200": ta.sma(close, length=200),
            "ema20": ta.ema(close, length=20),
            "vwap": ta.vwap(indexed["high"], indexed["low"], indexed["close"], indexed["volume"]),
            "rsi14": ta.rsi(close, length=14),
            "atr14": ta.atr(high, low, close, length=14),
            "adx14": cls._named(ta.adx(high, low, close, length=14), "ADX_14"),
            "obv": ta.obv(close, volume),
        }
        macd = ta.macd(close, fast=12, slow=26, signal=9)
        if macd is not None:
            series["macd"] = macd.iloc[:, 0]
            series["macd_signal"] = macd.iloc[:, 1]
            series["macd_histogram"] = macd.iloc[:, 2]
        stoch = ta.stoch(high, low, close, k=14, d=3, smooth_k=3)
        if stoch is not None:
            series["stoch_k"] = stoch.iloc[:, 0]
            series["stoch_d"] = stoch.iloc[:, 1]

        candles = [TechnicalCandle(
            timestamp=cls._timestamp(row["timestamp"]),
            open=float(row["open"]), high=float(row["high"]), low=float(row["low"]),
            close=float(row["close"]), volume=float(row["volume"]),
        ) for _, row in frame.iterrows()]
        overlays = {name: cls._points(frame, values) for name, values in series.items() if name in {"sma20", "sma50", "sma200", "ema20", "vwap"}}
        oscillators = {name: cls._points(frame, values) for name, values in series.items() if name not in overlays}
        levels = cls._levels(frame)
        latest = candles[-1].timestamp
        duplicate_count = len(history.index) - len(frame.index)
        return TechnicalWorkspaceResponse(
            symbol=symbol.upper(), interval=interval, range=range_value, timestamp=latest,
            candles=candles, overlays=overlays, oscillators=oscillators, levels=levels,
            data_quality={"input_candles": len(history.index), "canonical_candles": len(frame.index), "deduplicated_candles": duplicate_count, "minimum_candles": TechnicalAnalysisService.MIN_CANDLES},
        )

    @staticmethod
    def _named(value: pd.DataFrame | None, column: str) -> pd.Series:
        if value is None or column not in value.columns:
            return pd.Series(dtype=float)
        return value[column]

    @staticmethod
    def _timestamp(value: object) -> str:
        return pd.Timestamp(value).tz_convert(timezone.utc).isoformat().replace("+00:00", "Z")

    @classmethod
    def _points(cls, frame: pd.DataFrame, values: pd.Series | None) -> list[TechnicalSeriesPoint]:
        points: list[TechnicalSeriesPoint] = []
        if values is None or values.empty:
            return points
        for timestamp, value in zip(frame["timestamp"], values):
            number = TechnicalAnalysisService._to_float(value)
            if number is not None:
                points.append(TechnicalSeriesPoint(timestamp=cls._timestamp(timestamp), value=number))
        return points

    @classmethod
    def _levels(cls, frame: pd.DataFrame) -> list[TechnicalLevel]:
        if len(frame.index) < 5:
            return []
        window = frame.tail(min(len(frame.index), 120))
        candidates: list[tuple[str, float]] = []
        for index in range(2, len(window.index) - 2):
            highs = window["high"].iloc[index - 2:index + 3]
            lows = window["low"].iloc[index - 2:index + 3]
            if window["high"].iloc[index] == highs.max():
                candidates.append(("RESISTANCE", float(window["high"].iloc[index])))
            if window["low"].iloc[index] == lows.min():
                candidates.append(("SUPPORT", float(window["low"].iloc[index])))
        atr = ta.atr(window["high"], window["low"], window["close"], length=14).dropna()
        tolerance = float(atr.iloc[-1]) * 0.5 if not atr.empty else float(window["close"].iloc[-1]) * 0.01
        levels: list[TechnicalLevel] = []
        for kind, price in candidates:
            match = next((level for level in levels if level.kind == kind and abs(level.price - price) <= tolerance), None)
            if match:
                levels[levels.index(match)] = match.model_copy(update={"price": round((match.price + price) / 2, 4), "touches": match.touches + 1, "strength": min(1.0, (match.touches + 1) / 5)})
            else:
                levels.append(TechnicalLevel(kind=kind, price=price, strength=0.2, touches=1))
        return sorted(levels, key=lambda level: level.price)[-12:]