"""
Dependency injection helpers for the data-service.

Creates and caches the MarketDataResolver singleton, which holds the ordered
chain of concrete providers. Business code imports get_resolver() and never
touches provider implementations directly.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from app.config import settings
from app.providers.market_data_resolver import MarketDataResolver
from app.providers.yahoo_provider import YahooProvider

logger = logging.getLogger(__name__)

_resolver: MarketDataResolver | None = None


def get_resolver() -> MarketDataResolver:
    """
    Return the application-scoped MarketDataResolver singleton.

    Provider chain is built lazily on first call.
    Providers with missing API keys are silently excluded from the chain.
    """
    global _resolver
    if _resolver is None:
        _resolver = _build_resolver()
    return _resolver


def _build_resolver() -> MarketDataResolver:
    from app.providers.base import IMarketDataProvider

    providers: list[IMarketDataProvider] = []

    # --- Yahoo (always available — no API key required) ---
    providers.append(YahooProvider())
    logger.info("MarketDataResolver: registered YahooProvider")

    # --- Tiingo (requires API key) ---
    if settings.TIINGO_API_KEY:
        try:
            from app.providers.tiingo_provider import TiingoProvider
            providers.append(TiingoProvider(api_key=settings.TIINGO_API_KEY))
            logger.info("MarketDataResolver: registered TiingoProvider")
        except Exception as exc:
            logger.warning("MarketDataResolver: failed to init TiingoProvider: %s", exc)
    else:
        logger.warning(
            "MarketDataResolver: TIINGO_API_KEY not set — TiingoProvider disabled"
        )

    # --- Finnhub (requires API key) ---
    if settings.FINNHUB_API_KEY:
        try:
            from app.providers.finnhub_provider import FinnhubProvider
            providers.append(FinnhubProvider(api_key=settings.FINNHUB_API_KEY))
            logger.info("MarketDataResolver: registered FinnhubProvider")
        except Exception as exc:
            logger.warning("MarketDataResolver: failed to init FinnhubProvider: %s", exc)
    else:
        logger.warning(
            "MarketDataResolver: FINNHUB_API_KEY not set — FinnhubProvider disabled"
        )

    logger.info(
        "MarketDataResolver: active chain = [%s]",
        ", ".join(p.provider_name for p in providers),
    )
    return MarketDataResolver(providers=providers)
