"""
FastAPI data-service entry point.

All market data is fetched through the MarketDataResolver - never from
yfinance, Tiingo, or Finnhub directly at this layer.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
from typing import Optional

from fastapi import FastAPI, Query, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.routers.analysis import router as analysis_router
from app.routers.research import router as research_router
from app.routers.agent_analysis import router as agent_analysis_router
from app.routers.backtest import router as backtest_router
from app.routers.chat import router as chat_router
from app.routers.health import router as health_router
from app.routers.market_calendar import router as market_calendar_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build shared dependencies during startup without deprecated event hooks."""
    from app.config import settings
    from app.dependencies import get_resolver

    warnings = settings.validate()
    for warning in warnings:
        logger.warning("Config warning: %s", warning)

    resolver = get_resolver()
    logger.info(
        "Startup: MarketDataResolver ready with %d provider(s)",
        len(resolver.get_all_provider_health()),
    )
    yield


app = FastAPI(
    title="Finance Data Service",
    version="2.0.0",
    description="Provider-agnostic market data service (Yahoo / Tiingo / Finnhub)",
    lifespan=lifespan,
)

app.include_router(analysis_router)
app.include_router(research_router)
app.include_router(agent_analysis_router)
app.include_router(backtest_router)
app.include_router(chat_router)
app.include_router(health_router)
app.include_router(market_calendar_router)


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


from app.routers.portfolio import router as portfolio_router

app.include_router(portfolio_router)


@app.get("/metrics", include_in_schema=False)
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)