"""
FastAPI data-service entry point.

All market data is fetched through the MarketDataResolver - never from
yfinance, Tiingo, or Finnhub directly at this layer.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
import logging
import time
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, Query, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

from app.routers.analysis import router as analysis_router
from app.routers.assets import router as assets_router
from app.routers.research import router as research_router
from app.routers.agent_analysis import router as agent_analysis_router
from app.routers.backtest import router as backtest_router
from app.routers.chat import router as chat_router
from app.routers.health import router as health_router
from app.observability import (
    HTTP_REQUEST_DURATION_SECONDS,
    HTTP_REQUEST_ERRORS_TOTAL,
    HTTP_REQUESTS_TOTAL,
    outcome_label,
    route_label,
)
from app.routers.market_calendar import router as market_calendar_router
from app.request_context import REQUEST_ID_HEADER, reset_request_id, set_request_id

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Build shared dependencies during startup without deprecated event hooks."""
    from app.config import settings
    from app.dependencies import get_resolver

    warnings = settings.validate_configuration()
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


@app.middleware("http")
async def request_correlation_middleware(request: Request, call_next):
    request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid4())
    token = set_request_id(request_id)
    start = time.perf_counter()
    try:
        response = await call_next(request)
        elapsed_seconds = time.perf_counter() - start
        elapsed_ms = round(elapsed_seconds * 1000, 2)
        route = route_label(request)
        status = str(response.status_code)
        outcome = outcome_label(response.status_code)
        HTTP_REQUESTS_TOTAL.labels(request.method, route, status, outcome).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            request.method,
            route,
            status,
            outcome,
        ).observe(elapsed_seconds)
        logger.info(
            "event=http_request_complete service=data-service request_id=%s "
            "method=%s route=%s status=%s outcome=%s duration_ms=%s",
            request_id,
            request.method,
            route,
            status,
            outcome,
            elapsed_ms,
        )
        response.headers[REQUEST_ID_HEADER] = request_id
        return response
    except Exception:
        elapsed_seconds = time.perf_counter() - start
        elapsed_ms = round(elapsed_seconds * 1000, 2)
        route = route_label(request)
        HTTP_REQUESTS_TOTAL.labels(request.method, route, "500", "ERROR").inc()
        HTTP_REQUEST_ERRORS_TOTAL.labels(request.method, route).inc()
        HTTP_REQUEST_DURATION_SECONDS.labels(
            request.method,
            route,
            "500",
            "ERROR",
        ).observe(elapsed_seconds)
        logger.exception(
            "event=http_request_error service=data-service request_id=%s "
            "method=%s route=%s duration_ms=%s",
            request_id,
            request.method,
            route,
            elapsed_ms,
        )
        raise
    finally:
        reset_request_id(token)


app.include_router(analysis_router)
app.include_router(assets_router)
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
    bars = resolver.get_ohlcv(symbol=symbol, interval=interval or "1d", period=range or "1mo")

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
