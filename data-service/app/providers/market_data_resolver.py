"""
MarketDataResolver — Chain-of-Responsibility orchestrator for market data providers.

Fallback sequence:
  1. YahooProvider  (primary — OHLCV, financial statements, asset info, news)
  2. TiingoProvider (fallback — OHLCV only, when Yahoo fails or returns stale data)
  3. FinnhubProvider (news, analyst recommendations, sentiment)

Features:
- Graceful degradation between providers
- Per-provider health tracking
- Automatic blacklisting of unhealthy providers
- Periodic re-evaluation of blacklisted providers (configurable interval)
- Prometheus-style counters for observability (exposed via /metrics)
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.providers.base import (
    AnalystRecommendation,
    AssetInfo,
    FinancialStatements,
    IMarketDataProvider,
    NewsItem,
    OHLCVBar,
    ProviderHealth,
    ProviderStatus,
)

logger = logging.getLogger(__name__)

# Provider is blacklisted for this many seconds after consecutive failures
_BLACKLIST_DURATION_SECONDS = 60
# After this many consecutive failures the provider is blacklisted
_FAILURE_THRESHOLD = 3
# Background thread re-evaluates blacklisted providers every N seconds
_HEALTH_CHECK_INTERVAL_SECONDS = 30


class MarketDataResolver:
    """
    Resolves market data requests across a chain of providers.

    Usage:
        resolver = MarketDataResolver([yahoo, tiingo, finnhub])
        bars = resolver.get_ohlcv("AAPL", "1d", "1y")
    """

    def __init__(self, providers: list[IMarketDataProvider]) -> None:
        self._providers = providers
        # Per-provider mutable health state (not frozen dataclass)
        self._health: dict[str, ProviderHealth] = {
            p.provider_name: ProviderHealth(
                provider_name=p.provider_name,
                status=ProviderStatus.HEALTHY,
                last_checked=datetime.now(timezone.utc),
            )
            for p in providers
        }
        # Timestamps when a provider was blacklisted
        self._blacklisted_until: dict[str, datetime] = {}
        # Failure counters (reset on success)
        self._failure_counts: dict[str, int] = defaultdict(int)
        # Observability counters
        self._fallback_counters: dict[str, int] = defaultdict(int)
        self._success_counters: dict[str, int] = defaultdict(int)
        self._error_counters: dict[str, int] = defaultdict(int)
        # Thread safety
        self._lock = threading.Lock()
        # Start background health monitor
        self._start_health_monitor()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",
        period: str = "1y",
    ) -> list[OHLCVBar]:
        """Try each provider in chain until non-empty OHLCV data is returned."""
        for provider in self._active_providers():
            try:
                bars = provider.get_ohlcv(symbol, interval, period)
                if bars:
                    self._record_success(provider.provider_name)
                    return bars
                # Empty response is treated as a soft failure for OHLCV
                logger.warning(
                    "Resolver: %s returned empty OHLCV for %s — trying next provider",
                    provider.provider_name, symbol,
                )
                self._record_empty(provider.provider_name)
            except Exception as exc:
                logger.error(
                    "Resolver: %s raised during get_ohlcv(%s): %s",
                    provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, str(exc))
        logger.error("Resolver: all providers exhausted for get_ohlcv(%s)", symbol)
        return []

    def get_financial_statements(self, symbol: str) -> FinancialStatements:
        """Try each provider in chain; return first non-empty statements."""
        for provider in self._active_providers():
            try:
                stmts = provider.get_financial_statements(symbol)
                if stmts.revenue:  # non-empty revenue is a proxy for success
                    self._record_success(provider.provider_name)
                    return stmts
            except Exception as exc:
                logger.error(
                    "Resolver: %s raised during get_financial_statements(%s): %s",
                    provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, str(exc))
        return FinancialStatements(symbol=symbol.upper())

    def get_asset_info(self, symbol: str) -> Optional[AssetInfo]:
        """Try each provider in chain; return first non-None asset info."""
        for provider in self._active_providers():
            try:
                info = provider.get_asset_info(symbol)
                if info is not None:
                    self._record_success(provider.provider_name)
                    return info
            except Exception as exc:
                logger.error(
                    "Resolver: %s raised during get_asset_info(%s): %s",
                    provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, str(exc))
        return None

    def get_news(
        self,
        symbol: str,
        from_date: str,
        to_date: str,
    ) -> list[NewsItem]:
        """Try each provider in chain; return first non-empty news list."""
        for provider in self._active_providers():
            try:
                news = provider.get_news(symbol, from_date, to_date)
                if news:
                    self._record_success(provider.provider_name)
                    return news
            except Exception as exc:
                logger.error(
                    "Resolver: %s raised during get_news(%s): %s",
                    provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, str(exc))
        return []

    def get_analyst_recommendations(
        self, symbol: str
    ) -> list[AnalystRecommendation]:
        """Try each provider in chain; return first non-empty recommendation list."""
        for provider in self._active_providers():
            try:
                recs = provider.get_analyst_recommendations(symbol)
                if recs:
                    self._record_success(provider.provider_name)
                    return recs
            except Exception as exc:
                logger.error(
                    "Resolver: %s raised during get_analyst_recommendations(%s): %s",
                    provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, str(exc))
        return []

    def get_all_provider_health(self) -> list[ProviderHealth]:
        """Return a snapshot of every provider's current health state."""
        with self._lock:
            return list(self._health.values())

    def get_provider_health(self, provider_name: str) -> Optional[ProviderHealth]:
        """Return the health state for a named provider, or None if unknown."""
        with self._lock:
            return self._health.get(provider_name)

    def get_observability_metrics(self) -> dict:
        """Return fallback/success/error counters for Prometheus scraping."""
        with self._lock:
            return {
                "fallback": dict(self._fallback_counters),
                "success": dict(self._success_counters),
                "errors": dict(self._error_counters),
            }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _active_providers(self) -> list[IMarketDataProvider]:
        """Return providers that are not currently blacklisted."""
        now = datetime.now(timezone.utc)
        active = []
        with self._lock:
            for provider in self._providers:
                name = provider.provider_name
                blacklisted_until = self._blacklisted_until.get(name)
                if blacklisted_until is not None and now < blacklisted_until:
                    logger.debug(
                        "Resolver: skipping blacklisted provider %s until %s",
                        name, blacklisted_until,
                    )
                    self._fallback_counters[name] += 1
                    continue
                active.append(provider)
        return active

    def _record_success(self, name: str) -> None:
        with self._lock:
            self._failure_counts[name] = 0
            self._success_counters[name] += 1
            health = self._health.get(name)
            if health:
                self._health[name] = ProviderHealth(
                    provider_name=name,
                    status=ProviderStatus.HEALTHY,
                    last_checked=datetime.now(timezone.utc),
                    consecutive_failures=0,
                )
            # Lift blacklist on successful response
            self._blacklisted_until.pop(name, None)

    def _record_empty(self, name: str) -> None:
        """Soft failure — empty response. Increment failure count but do not blacklist."""
        with self._lock:
            self._failure_counts[name] += 1
            self._fallback_counters[name] += 1

    def _record_failure(self, name: str, error: str) -> None:
        with self._lock:
            self._failure_counts[name] += 1
            self._error_counters[name] += 1
            count = self._failure_counts[name]
            now = datetime.now(timezone.utc)

            if count >= _FAILURE_THRESHOLD:
                until = now + timedelta(seconds=_BLACKLIST_DURATION_SECONDS)
                self._blacklisted_until[name] = until
                logger.warning(
                    "Resolver: blacklisting provider %s for %ds after %d consecutive failures",
                    name, _BLACKLIST_DURATION_SECONDS, count,
                )
                self._health[name] = ProviderHealth(
                    provider_name=name,
                    status=ProviderStatus.BLACKLISTED,
                    last_checked=now,
                    last_error=error,
                    consecutive_failures=count,
                )
            else:
                self._health[name] = ProviderHealth(
                    provider_name=name,
                    status=ProviderStatus.DEGRADED,
                    last_checked=now,
                    last_error=error,
                    consecutive_failures=count,
                )

    def _run_health_checks(self) -> None:
        """Background loop: probe blacklisted providers and update health state."""
        while True:
            time.sleep(_HEALTH_CHECK_INTERVAL_SECONDS)
            now = datetime.now(timezone.utc)
            for provider in self._providers:
                name = provider.provider_name
                with self._lock:
                    blacklisted_until = self._blacklisted_until.get(name)
                if blacklisted_until is None or now < blacklisted_until:
                    continue
                # Blacklist period elapsed — probe the provider
                logger.info("Resolver: re-probing blacklisted provider %s", name)
                try:
                    health = provider.health_check()
                    with self._lock:
                        self._health[name] = health
                        if health.status == ProviderStatus.HEALTHY:
                            self._failure_counts[name] = 0
                            self._blacklisted_until.pop(name, None)
                            logger.info(
                                "Resolver: provider %s recovered and un-blacklisted", name
                            )
                except Exception as exc:
                    logger.error(
                        "Resolver: health check for %s raised: %s", name, exc
                    )

    def _start_health_monitor(self) -> None:
        thread = threading.Thread(
            target=self._run_health_checks,
            name="market-data-health-monitor",
            daemon=True,
        )
        thread.start()
