"""
MarketDataResolver - Chain-of-Responsibility orchestrator for market data providers.

Fallback sequence:
  1. YahooProvider  (primary - OHLCV, financial statements, asset info, news)
  2. TiingoProvider (fallback - OHLCV only, when Yahoo fails or returns stale data)
  3. FinnhubProvider (news, analyst recommendations, sentiment)

Features:
- Graceful degradation between providers
- Per-provider health tracking
- Automatic blacklisting of unhealthy providers
- Periodic re-evaluation of blacklisted providers (configurable interval)
- Prometheus counters, gauges, and latency histograms for observability
"""

from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from prometheus_client import Counter, Gauge, Histogram

from app.request_context import get_request_id

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

PROVIDER_SUCCESS_TOTAL = Counter(
    "market_provider_success_total",
    "Market provider calls that returned usable data",
    ["provider", "operation"],
)
PROVIDER_EMPTY_TOTAL = Counter(
    "market_provider_empty_total",
    "Market provider calls that returned no usable data",
    ["provider", "operation"],
)
PROVIDER_ERROR_TOTAL = Counter(
    "market_provider_error_total",
    "Market provider calls that raised an error",
    ["provider", "operation"],
)
PROVIDER_FALLBACK_TOTAL = Counter(
    "market_provider_fallback_total",
    "Provider fallback transitions after empty or failed provider calls",
    ["operation", "from_provider", "to_provider"],
)
PROVIDER_LATENCY_SECONDS = Histogram(
    "market_provider_latency_seconds",
    "Market provider call latency in seconds",
    ["provider", "operation", "result"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30),
)
PROVIDER_BLACKLISTED = Gauge(
    "market_provider_blacklisted",
    "Whether a provider is currently blacklisted (1) or active (0)",
    ["provider"],
)
PROVIDER_HEALTH_STATUS = Gauge(
    "market_provider_health_status",
    "Provider health status encoded as a labeled gauge",
    ["provider", "status"],
)

_STATUS_VALUES = tuple(status.value for status in ProviderStatus)

def _request_log_context() -> str:
    request_id = get_request_id()
    return f"request_id={request_id or 'none'}"

class MarketDataResolver:
    """
    Resolves market data requests across a chain of providers.

    Usage:
        resolver = MarketDataResolver([yahoo, tiingo, finnhub])
        bars = resolver.get_ohlcv("AAPL", "1d", "1y")
    """

    def __init__(self, providers: list[IMarketDataProvider]) -> None:
        self._providers = providers
        self._health: dict[str, ProviderHealth] = {
            p.provider_name: ProviderHealth(
                provider_name=p.provider_name,
                status=ProviderStatus.HEALTHY,
                last_checked=datetime.now(timezone.utc),
            )
            for p in providers
        }
        self._blacklisted_until: dict[str, datetime] = {}
        self._failure_counts: dict[str, int] = defaultdict(int)
        self._fallback_counters: dict[str, int] = defaultdict(int)
        self._success_counters: dict[str, int] = defaultdict(int)
        self._empty_counters: dict[str, int] = defaultdict(int)
        self._error_counters: dict[str, int] = defaultdict(int)
        self._lock = threading.Lock()
        for provider in providers:
            PROVIDER_BLACKLISTED.labels(provider=provider.provider_name).set(0)
            self._set_health_metric(provider.provider_name, ProviderStatus.HEALTHY)
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
        operation = "ohlcv"
        providers = self._active_providers()
        for index, provider in enumerate(providers):
            start = time.perf_counter()
            try:
                bars = provider.get_ohlcv(symbol, interval, period)
                if bars:
                    self._record_success(provider.provider_name, operation)
                    self._observe_latency(provider.provider_name, operation, "success", start)
                    return bars
                logger.warning(
                    "%s operation=ohlcv provider=%s symbol=%s result=empty action=try_next_provider",
                    _request_log_context(), provider.provider_name, symbol,
                )
                self._record_empty(provider.provider_name, operation)
                self._observe_latency(provider.provider_name, operation, "empty", start)
                self._record_fallback_to_next(operation, providers, index)
            except Exception as exc:
                logger.error(
                    "%s operation=ohlcv provider=%s symbol=%s result=error reason=%s",
                    _request_log_context(), provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, operation, str(exc))
                self._observe_latency(provider.provider_name, operation, "error", start)
                self._record_fallback_to_next(operation, providers, index)
        logger.error("%s operation=ohlcv symbol=%s result=exhausted", _request_log_context(), symbol)
        return []

    def get_financial_statements(self, symbol: str) -> FinancialStatements:
        """Try each provider in chain; return first non-empty statements."""
        operation = "financial_statements"
        providers = self._active_providers()
        for index, provider in enumerate(providers):
            start = time.perf_counter()
            try:
                stmts = provider.get_financial_statements(symbol)
                if stmts.revenue:
                    self._record_success(provider.provider_name, operation)
                    self._observe_latency(provider.provider_name, operation, "success", start)
                    return stmts
                self._record_empty(provider.provider_name, operation)
                self._observe_latency(provider.provider_name, operation, "empty", start)
                self._record_fallback_to_next(operation, providers, index)
            except Exception as exc:
                logger.error(
                    "%s operation=financial_statements provider=%s symbol=%s result=error reason=%s",
                    _request_log_context(), provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, operation, str(exc))
                self._observe_latency(provider.provider_name, operation, "error", start)
                self._record_fallback_to_next(operation, providers, index)
        return FinancialStatements(symbol=symbol.upper())

    def get_asset_info(self, symbol: str) -> Optional[AssetInfo]:
        """Try each provider in chain; return first non-None asset info."""
        operation = "asset_info"
        providers = self._active_providers()
        for index, provider in enumerate(providers):
            start = time.perf_counter()
            try:
                info = provider.get_asset_info(symbol)
                if info is not None:
                    self._record_success(provider.provider_name, operation)
                    self._observe_latency(provider.provider_name, operation, "success", start)
                    return info
                self._record_empty(provider.provider_name, operation)
                self._observe_latency(provider.provider_name, operation, "empty", start)
                self._record_fallback_to_next(operation, providers, index)
            except Exception as exc:
                logger.error(
                    "%s operation=asset_info provider=%s symbol=%s result=error reason=%s",
                    _request_log_context(), provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, operation, str(exc))
                self._observe_latency(provider.provider_name, operation, "error", start)
                self._record_fallback_to_next(operation, providers, index)
        return None

    def get_news(
        self,
        symbol: str,
        from_date: str,
        to_date: str,
    ) -> list[NewsItem]:
        """Try each provider in chain; return first non-empty news list."""
        operation = "news"
        providers = self._active_providers()
        for index, provider in enumerate(providers):
            start = time.perf_counter()
            try:
                news = provider.get_news(symbol, from_date, to_date)
                if news:
                    self._record_success(provider.provider_name, operation)
                    self._observe_latency(provider.provider_name, operation, "success", start)
                    return news
                self._record_empty(provider.provider_name, operation)
                self._observe_latency(provider.provider_name, operation, "empty", start)
                self._record_fallback_to_next(operation, providers, index)
            except Exception as exc:
                logger.error(
                    "%s operation=news provider=%s symbol=%s result=error reason=%s",
                    _request_log_context(), provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, operation, str(exc))
                self._observe_latency(provider.provider_name, operation, "error", start)
                self._record_fallback_to_next(operation, providers, index)
        return []

    def get_analyst_recommendations(
        self, symbol: str
    ) -> list[AnalystRecommendation]:
        """Try each provider in chain; return first non-empty recommendation list."""
        operation = "analyst_recommendations"
        providers = self._active_providers()
        for index, provider in enumerate(providers):
            start = time.perf_counter()
            try:
                recs = provider.get_analyst_recommendations(symbol)
                if recs:
                    self._record_success(provider.provider_name, operation)
                    self._observe_latency(provider.provider_name, operation, "success", start)
                    return recs
                self._record_empty(provider.provider_name, operation)
                self._observe_latency(provider.provider_name, operation, "empty", start)
                self._record_fallback_to_next(operation, providers, index)
            except Exception as exc:
                logger.error(
                    "%s operation=analyst_recommendations provider=%s symbol=%s result=error reason=%s",
                    _request_log_context(), provider.provider_name, symbol, exc,
                )
                self._record_failure(provider.provider_name, operation, str(exc))
                self._observe_latency(provider.provider_name, operation, "error", start)
                self._record_fallback_to_next(operation, providers, index)
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
        """Return fallback/success/empty/error counters for lightweight health checks."""
        with self._lock:
            return {
                "fallback": dict(self._fallback_counters),
                "success": dict(self._success_counters),
                "empty": dict(self._empty_counters),
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
                        "%s provider=%s result=blacklisted_skipped until=%s",
                        _request_log_context(), name, blacklisted_until,
                    )
                    self._fallback_counters[name] += 1
                    PROVIDER_BLACKLISTED.labels(provider=name).set(1)
                    continue
                PROVIDER_BLACKLISTED.labels(provider=name).set(0)
                active.append(provider)
        return active

    def _record_success(self, name: str, operation: str) -> None:
        with self._lock:
            self._failure_counts[name] = 0
            self._success_counters[name] += 1
            PROVIDER_SUCCESS_TOTAL.labels(provider=name, operation=operation).inc()
            self._health[name] = ProviderHealth(
                provider_name=name,
                status=ProviderStatus.HEALTHY,
                last_checked=datetime.now(timezone.utc),
                consecutive_failures=0,
            )
            self._blacklisted_until.pop(name, None)
            PROVIDER_BLACKLISTED.labels(provider=name).set(0)
            self._set_health_metric(name, ProviderStatus.HEALTHY)

    def _record_empty(self, name: str, operation: str) -> None:
        """Soft failure - empty response. Increment failure count but do not blacklist."""
        with self._lock:
            self._failure_counts[name] += 1
            self._fallback_counters[name] += 1
            self._empty_counters[name] += 1
            PROVIDER_EMPTY_TOTAL.labels(provider=name, operation=operation).inc()

    def _record_failure(self, name: str, operation: str, error: str) -> None:
        with self._lock:
            self._failure_counts[name] += 1
            self._error_counters[name] += 1
            PROVIDER_ERROR_TOTAL.labels(provider=name, operation=operation).inc()
            count = self._failure_counts[name]
            now = datetime.now(timezone.utc)

            if count >= _FAILURE_THRESHOLD:
                until = now + timedelta(seconds=_BLACKLIST_DURATION_SECONDS)
                self._blacklisted_until[name] = until
                logger.warning(
                    "%s provider=%s result=blacklisted duration_seconds=%s consecutive_failures=%s",
                    _request_log_context(), name, _BLACKLIST_DURATION_SECONDS, count,
                )
                status = ProviderStatus.BLACKLISTED
                PROVIDER_BLACKLISTED.labels(provider=name).set(1)
            else:
                status = ProviderStatus.DEGRADED

            self._health[name] = ProviderHealth(
                provider_name=name,
                status=status,
                last_checked=now,
                last_error=error,
                consecutive_failures=count,
            )
            self._set_health_metric(name, status)

    def _record_fallback_to_next(
        self,
        operation: str,
        providers: list[IMarketDataProvider],
        index: int,
    ) -> None:
        if index + 1 >= len(providers):
            return
        from_provider = providers[index].provider_name
        to_provider = providers[index + 1].provider_name
        PROVIDER_FALLBACK_TOTAL.labels(
            operation=operation,
            from_provider=from_provider,
            to_provider=to_provider,
        ).inc()

    def _observe_latency(
        self,
        provider: str,
        operation: str,
        result: str,
        start: float,
    ) -> None:
        PROVIDER_LATENCY_SECONDS.labels(
            provider=provider,
            operation=operation,
            result=result,
        ).observe(time.perf_counter() - start)

    def _set_health_metric(self, provider: str, status: ProviderStatus) -> None:
        for possible_status in _STATUS_VALUES:
            PROVIDER_HEALTH_STATUS.labels(
                provider=provider,
                status=possible_status,
            ).set(1 if possible_status == status.value else 0)

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
                logger.info("%s provider=%s result=reprobe_blacklisted", _request_log_context(), name)
                try:
                    health = provider.health_check()
                    with self._lock:
                        self._health[name] = health
                        self._set_health_metric(name, health.status)
                        if health.status == ProviderStatus.HEALTHY:
                            self._failure_counts[name] = 0
                            self._blacklisted_until.pop(name, None)
                            PROVIDER_BLACKLISTED.labels(provider=name).set(0)
                            logger.info(
                                "%s provider=%s result=recovered", _request_log_context(), name
                            )
                except Exception as exc:
                    logger.error(
                        "%s provider=%s result=health_check_error reason=%s", _request_log_context(), name, exc
                    )

    def _start_health_monitor(self) -> None:
        thread = threading.Thread(
            target=self._run_health_checks,
            name="market-data-health-monitor",
            daemon=True,
        )
        thread.start()