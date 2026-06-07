"""
TiingoProvider — EOD OHLCV fallback provider backed by the Tiingo REST API.

Responsibilities:
- End-of-day OHLCV historical price data (fallback when Yahoo fails/stale)
- Historical price recovery

Tiingo free tier: 500 requests/hour, 50 symbols/day for EOD data.
API docs: https://api.tiingo.com/documentation/end-of-day

Business code must access this through IMarketDataProvider only.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.providers.base import (
    AnalystRecommendation,
    AssetInfo,
    FinancialStatements,
    NewsItem,
    OHLCVBar,
    ProviderHealth,
    ProviderStatus,
)

logger = logging.getLogger(__name__)

_TIINGO_BASE = "https://api.tiingo.com"
_TIINGO_EOD_PATH = "/tiingo/daily/{ticker}/prices"
_TIINGO_META_PATH = "/tiingo/daily/{ticker}"


class TiingoProvider:
    """
    Concrete IMarketDataProvider implementation for Tiingo EOD data.

    Only OHLCV and basic asset info are supported.
    Financial statements, news, and analyst recommendations are not
    available from Tiingo free tier and will return empty results.
    """

    _PROVIDER_NAME = "tiingo"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("TIINGO_API_KEY must be set to use TiingoProvider")
        self._api_key = api_key
        self._headers = {
            "Content-Type": "application/json",
            "Authorization": f"Token {api_key}",
        }

    @property
    def provider_name(self) -> str:
        return self._PROVIDER_NAME

    # ------------------------------------------------------------------
    # OHLCV — primary capability
    # ------------------------------------------------------------------

    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",  # noqa: ARG002 — Tiingo EOD is always daily
        period: str = "1y",
    ) -> list[OHLCVBar]:
        """
        Fetch EOD OHLCV bars from Tiingo.

        Note: Tiingo EOD is always daily regardless of `interval`.
        Intraday data requires a separate subscription.
        """
        start_date, end_date = self._period_to_dates(period)
        url = _TIINGO_BASE + _TIINGO_EOD_PATH.format(ticker=symbol.lower())
        params = {
            "startDate": start_date,
            "endDate": end_date,
            "resampleFreq": "daily",
        }

        try:
            with httpx.Client(timeout=15.0) as client:
                response = client.get(url, headers=self._headers, params=params)
                response.raise_for_status()
                data: list[dict] = response.json()

            if not data:
                logger.warning(
                    "TiingoProvider: empty OHLCV for symbol=%s period=%s",
                    symbol, period,
                )
                return []

            bars: list[OHLCVBar] = []
            for row in data:
                date_str = row.get("date", "")
                try:
                    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                except Exception:
                    continue

                close = row.get("close") or row.get("adjClose")
                if close is None:
                    continue

                bars.append(
                    OHLCVBar(
                        timestamp=dt.astimezone(timezone.utc),
                        open=float(row.get("open") or close),
                        high=float(row.get("high") or close),
                        low=float(row.get("low") or close),
                        close=float(close),
                        volume=int(row["volume"]) if row.get("volume") is not None else None,
                    )
                )
            return bars

        except httpx.HTTPStatusError as exc:
            logger.error(
                "TiingoProvider HTTP error for symbol=%s: %s %s",
                symbol, exc.response.status_code, exc.response.text[:200],
            )
            return []
        except Exception as exc:
            logger.error(
                "TiingoProvider.get_ohlcv failed for symbol=%s: %s", symbol, exc
            )
            return []

    # ------------------------------------------------------------------
    # Asset info
    # ------------------------------------------------------------------

    def get_asset_info(self, symbol: str) -> Optional[AssetInfo]:
        url = _TIINGO_BASE + _TIINGO_META_PATH.format(ticker=symbol.lower())
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url, headers=self._headers)
                response.raise_for_status()
                data = response.json()

            return AssetInfo(
                symbol=data.get("ticker", symbol).upper(),
                name=data.get("name", symbol),
                exchange=data.get("exchangeCode"),
                currency="USD",  # Tiingo free tier is USD-only
            )
        except Exception as exc:
            logger.error(
                "TiingoProvider.get_asset_info failed for symbol=%s: %s", symbol, exc
            )
            return None

    # ------------------------------------------------------------------
    # Unsupported capabilities — return empty, let resolver fall through
    # ------------------------------------------------------------------

    def get_financial_statements(self, symbol: str) -> FinancialStatements:
        """Not available on Tiingo free tier — returns empty statements."""
        return FinancialStatements(symbol=symbol.upper())

    def get_news(self, symbol: str, from_date: str, to_date: str) -> list[NewsItem]:
        """Not supported — returns empty list."""
        return []

    def get_analyst_recommendations(
        self, symbol: str
    ) -> list[AnalystRecommendation]:
        """Not supported — returns empty list."""
        return []

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    def health_check(self) -> ProviderHealth:
        start = time.monotonic()
        try:
            url = _TIINGO_BASE + _TIINGO_EOD_PATH.format(ticker="aapl")
            params = {"startDate": "2020-01-02", "endDate": "2020-01-02"}
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url, headers=self._headers, params=params)
                response.raise_for_status()
            latency_ms = (time.monotonic() - start) * 1000
            return ProviderHealth(
                provider_name=self._PROVIDER_NAME,
                status=ProviderStatus.HEALTHY,
                latency_ms=latency_ms,
                last_checked=datetime.now(timezone.utc),
            )
        except httpx.HTTPStatusError as exc:
            latency_ms = (time.monotonic() - start) * 1000
            status = (
                ProviderStatus.UNHEALTHY
                if exc.response.status_code in (401, 403)
                else ProviderStatus.DEGRADED
            )
            return ProviderHealth(
                provider_name=self._PROVIDER_NAME,
                status=status,
                latency_ms=latency_ms,
                last_checked=datetime.now(timezone.utc),
                last_error=f"HTTP {exc.response.status_code}",
            )
        except Exception as exc:
            latency_ms = (time.monotonic() - start) * 1000
            return ProviderHealth(
                provider_name=self._PROVIDER_NAME,
                status=ProviderStatus.UNHEALTHY,
                latency_ms=latency_ms,
                last_checked=datetime.now(timezone.utc),
                last_error=str(exc),
            )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _period_to_dates(period: str) -> tuple[str, str]:
        """Convert yfinance-style period string to (startDate, endDate) ISO strings."""
        from datetime import timedelta

        end = datetime.now(timezone.utc)
        _map: dict[str, timedelta] = {
            "1d": timedelta(days=1),
            "5d": timedelta(days=5),
            "1mo": timedelta(days=30),
            "3mo": timedelta(days=90),
            "6mo": timedelta(days=180),
            "1y": timedelta(days=365),
            "2y": timedelta(days=730),
            "5y": timedelta(days=1825),
            "10y": timedelta(days=3650),
            "ytd": timedelta(days=(end - end.replace(month=1, day=1)).days),
            "max": timedelta(days=365 * 20),
        }
        delta = _map.get(period, timedelta(days=365))
        start = end - delta
        return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
