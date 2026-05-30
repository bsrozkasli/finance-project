from datetime import timezone

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

from app.models.analysis import AnalysisSummaryResponse, TechnicalAnalysisResponse
from app.services.technical_analysis_service import TechnicalAnalysisService

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def _to_utc_z(value: object) -> str:
    if value is None:
        return ""
    ts = pd.Timestamp(value)
    if ts.tzinfo is None:
        ts = ts.tz_localize(timezone.utc)
    else:
        ts = ts.tz_convert(timezone.utc)
    return ts.isoformat().replace("+00:00", "Z")


def _load_history(symbol: str, interval: str, range_value: str) -> pd.DataFrame:
    ticker = yf.Ticker(symbol)
    history = ticker.history(interval=interval, period=range_value, auto_adjust=False, actions=False)

    if history is None or history.empty:
        raise HTTPException(status_code=404, detail=f"No historical data found for symbol '{symbol}'")

    return history.reset_index()


@router.get("/technical/{symbol}", response_model=TechnicalAnalysisResponse)
def get_technical_analysis(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("3mo"),
) -> TechnicalAnalysisResponse:
    history = _load_history(symbol, interval, range)

    try:
        indicators = TechnicalAnalysisService.compute_indicators(history)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    date_col = "Datetime" if "Datetime" in history.columns else "Date"
    timestamp = _to_utc_z(history.iloc[-1].get(date_col))

    return TechnicalAnalysisResponse(symbol=symbol, timestamp=timestamp, indicators=indicators)


@router.get("/technical/{symbol}/signals", response_model=AnalysisSummaryResponse)
def get_technical_signals(
    symbol: str,
    interval: str = Query("1d"),
    range: str = Query("3mo"),
) -> AnalysisSummaryResponse:
    history = _load_history(symbol, interval, range)

    try:
        indicators = TechnicalAnalysisService.compute_indicators(history)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    date_col = "Datetime" if "Datetime" in history.columns else "Date"
    timestamp = _to_utc_z(history.iloc[-1].get(date_col))

    return AnalysisSummaryResponse(
        symbol=symbol,
        timestamp=timestamp,
        signal=TechnicalAnalysisService.signal(indicators),
    )
