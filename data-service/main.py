"""
FastAPI data-service entry point.

All market data is fetched through the MarketDataResolver — never from
yfinance, Tiingo, or Finnhub directly at this layer.
"""

from __future__ import annotations

import logging
from datetime import timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query

from app.routers.analysis import router as analysis_router
from app.routers.research import router as research_router
from app.routers.agent_analysis import router as agent_analysis_router
from app.routers.health import router as health_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Finance Data Service",
    version="2.0.0",
    description="Provider-agnostic market data service (Yahoo / Tiingo / Finnhub)",
)

app.include_router(analysis_router)
app.include_router(research_router)
app.include_router(agent_analysis_router)
app.include_router(health_router)


@app.get("/api/v1/prices/{symbol}", summary="OHLCV price history via provider chain")
def get_prices(
    symbol: str,
    interval: Optional[str] = Query("1d"),
    range: Optional[str] = Query("1mo"),
) -> list[dict]:
    """
    Return OHLCV bars for the given symbol.

    Data is fetched through the MarketDataResolver:
      1. YahooProvider (primary)
      2. TiingoProvider (EOD fallback)
      3. Returns empty list if all providers are unavailable.
    """
    from app.dependencies import get_resolver

    resolver = get_resolver()
    bars = resolver.get_ohlcv(symbol=symbol, interval=interval, period=range)

    if not bars:
        # Return empty list — callers handle the empty case
        return []

    return [
        {
            "timestamp": bar.timestamp.isoformat().replace("+00:00", "Z"),
            "open": bar.open,
            "high": bar.high,
            "low": bar.low,
            "close": bar.close,
            "volume": bar.volume,
        }
        for bar in bars
    ]


# --- Portfolio router (kept below to preserve existing import order) ---
from app.routers.portfolio import router as portfolio_router
from prometheus_fastapi_instrumentator import Instrumentator

app.include_router(portfolio_router)

# Expose /metrics for Prometheus scraping
Instrumentator().instrument(app).expose(app)


@app.on_event("startup")
async def _startup() -> None:
    """Eagerly build the resolver on startup so the first request is fast."""
    from app.config import settings
    from app.dependencies import get_resolver

    warnings = settings.validate()
    for w in warnings:
        logger.warning("Config warning: %s", w)

    resolver = get_resolver()
    logger.info(
        "Startup: MarketDataResolver ready with %d provider(s)",
        len(resolver.get_all_provider_health()),
    )
