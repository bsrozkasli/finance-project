"""
Dependency injection helpers for the data-service.

Creates and caches the MarketDataResolver singleton, which holds the ordered
chain of concrete providers. Business code imports get_resolver() and never
touches provider implementations directly. PROVIDER_CHAIN sets the
registration order.
"""

from __future__ import annotations

import logging

from app.config import settings
from app.providers.base import IMarketDataProvider
from app.providers.market_data_resolver import MarketDataResolver
from app.providers.yahoo_provider import YahooProvider

logger = logging.getLogger(__name__)

DEFAULT_PROVIDER_CHAIN = "yahoo,tiingo,finnhub"
_KNOWN_PROVIDERS = ("yahoo", "tiingo", "finnhub")

_resolver: MarketDataResolver | None = None


def get_resolver() -> MarketDataResolver:
    """
    Return the application-scoped MarketDataResolver singleton.

    The provider chain is built lazily on first call, in PROVIDER_CHAIN order.
    """
    global _resolver
    if _resolver is None:
        _resolver = _build_resolver()
    return _resolver


def parse_provider_chain(raw: str) -> list[str]:
    """Return known provider names in configured order, lower-cased and de-duplicated."""
    names: list[str] = []
    for token in raw.split(","):
        name = token.strip().lower()
        if not name:
            continue
        if name not in _KNOWN_PROVIDERS:
            logger.warning("MarketDataResolver: unknown provider '%s' in PROVIDER_CHAIN ignored", name)
            continue
        if name not in names:
            names.append(name)
    return names


def build_provider_chain(raw_chain: str) -> list[IMarketDataProvider]:
    """Create providers in PROVIDER_CHAIN order, skipping unknown or unkeyed providers."""
    providers = _create_providers(parse_provider_chain(raw_chain))
    if providers:
        return providers
    logger.error(
        "MarketDataResolver: PROVIDER_CHAIN=%r produced no usable provider; using default chain %s",
        raw_chain,
        DEFAULT_PROVIDER_CHAIN,
    )
    return _create_providers(parse_provider_chain(DEFAULT_PROVIDER_CHAIN))


def _create_providers(names: list[str]) -> list[IMarketDataProvider]:
    providers = [_create_provider(name) for name in names]
    return [provider for provider in providers if provider is not None]


def _create_provider(name: str) -> IMarketDataProvider | None:
    if name == "yahoo":
        logger.info("MarketDataResolver: registered YahooProvider")
        return YahooProvider()

    if name == "tiingo":
        if not settings.TIINGO_API_KEY:
            logger.warning("MarketDataResolver: TIINGO_API_KEY not set — TiingoProvider disabled")
            return None
        try:
            from app.providers.tiingo_provider import TiingoProvider
            provider: IMarketDataProvider = TiingoProvider(api_key=settings.TIINGO_API_KEY)
        except Exception as exc:
            logger.warning("MarketDataResolver: failed to init TiingoProvider: %s", exc)
            return None
        logger.info("MarketDataResolver: registered TiingoProvider")
        return provider

    if not settings.FINNHUB_API_KEY:
        logger.warning("MarketDataResolver: FINNHUB_API_KEY not set — FinnhubProvider disabled")
        return None
    try:
        from app.providers.finnhub_provider import FinnhubProvider
        provider = FinnhubProvider(api_key=settings.FINNHUB_API_KEY)
    except Exception as exc:
        logger.warning("MarketDataResolver: failed to init FinnhubProvider: %s", exc)
        return None
    logger.info("MarketDataResolver: registered FinnhubProvider")
    return provider


def _build_resolver() -> MarketDataResolver:
    providers = build_provider_chain(settings.PROVIDER_CHAIN)
    logger.info(
        "MarketDataResolver: active chain = [%s]",
        ", ".join(p.provider_name for p in providers),
    )
    return MarketDataResolver(providers=providers)
