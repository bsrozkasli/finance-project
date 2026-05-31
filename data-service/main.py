from datetime import timezone
from typing import Optional

import pandas as pd
import yfinance as yf
from fastapi import FastAPI, Query

from app.routers.analysis import router as analysis_router

app = FastAPI(title="Price Data Service", version="1.0.0")
app.include_router(analysis_router)


def _to_utc_z(value: object) -> str:
    ts = pd.to_datetime(value)
    if ts.tzinfo is None:
        ts = ts.tz_localize(timezone.utc)
    else:
        ts = ts.tz_convert(timezone.utc)
    return ts.isoformat().replace("+00:00", "Z")


@app.get("/api/v1/prices/{symbol}")
def get_prices(
    symbol: str,
    interval: Optional[str] = Query("1d"),
    range: Optional[str] = Query("1mo"),
) -> list[dict]:
    history = yf.Ticker(symbol).history(
        period=range,
        interval=interval,
        auto_adjust=False,
    )

    if history is None or history.empty:
        return []

    cleaned = history.dropna(how="all")
    result = []

    for timestamp, row in cleaned.iterrows():
        close = row.get("Close")
        if pd.isna(close):
            continue

        result.append(
            {
                "timestamp": _to_utc_z(timestamp),
                "open": None if pd.isna(row.get("Open")) else float(row.get("Open")),
                "high": None if pd.isna(row.get("High")) else float(row.get("High")),
                "low": None if pd.isna(row.get("Low")) else float(row.get("Low")),
                "close": float(close),
                "volume": None
                if pd.isna(row.get("Volume"))
                else int(float(row.get("Volume"))),
            }
        )

    return result
