"""
FinnhubProvider — news, analyst recommendations, and sentiment provider.

Responsibilities:
- Company news
- Analyst buy/sell/hold recommendations
- Basic financial metrics / sentiment

Finnhub free tier: 60 API calls/minute.
API docs: https://finnhub.io/docs/api

Business code must access this through IMarketDataProvider only.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import finnhub

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


class FinnhubProvider:
    """
    Concrete IMarketDataProvider implementation using the official Finnhub SDK.

    This provider specialises in news and analyst recommendations.
    OHLCV and financial statements are not supported and will return empty
    results — the MarketDataResolver handles routing correctly.
    """

    _PROVIDER_NAME = "finnhub"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ValueError("FINNHUB_API_KEY must be set to use FinnhubProvider")
        self._api_key = api_key
        self._client = finnhub.Client(api_key=api_key)

    @property
    def provider_name(self) -> str:
        return self._PROVIDER_NAME

    # ------------------------------------------------------------------
    # News
    # ------------------------------------------------------------------

    def get_news(
        self,
        symbol: str,
        from_date: str,
        to_date: str,
    ) -> list[NewsItem]:
        """
        Fetch company news from Finnhub.

        Args:
            symbol:    Ticker symbol.
            from_date: ISO date 'YYYY-MM-DD'.
            to_date:   ISO date 'YYYY-MM-DD'.
        """
        try:
            raw = self._client.company_news(symbol.upper(), _from=from_date, to=to_date)
            if not raw:
                return []

            items: list[NewsItem] = []
            for article in raw[:30]:  # cap at 30 to avoid token overload downstream
                headline = article.get("headline", "")
                if not headline:
                    continue
                dt_ts = article.get("datetime", 0)
                try:
                    pub_date = datetime.fromtimestamp(dt_ts, tz=timezone.utc)
                except Exception:
                    pub_date = datetime.now(timezone.utc)

                items.append(
                    NewsItem(
                        headline=headline,
                        summary=article.get("summary", ""),
                        source=article.get("source", "Finnhub"),
                        url=article.get("url", ""),
                        published_at=pub_date,
                    )
                )
            return items

        except Exception as exc:
            logger.error(
                "FinnhubProvider.get_news failed for symbol=%s: %s", symbol, exc
            )
            return []

    # ------------------------------------------------------------------
    # Analyst recommendations
    # ------------------------------------------------------------------

    def get_analyst_recommendations(
        self, symbol: str
    ) -> list[AnalystRecommendation]:
        try:
            raw = self._client.recommendation_trends(symbol.upper())
            if not raw:
                return []

            recommendations: list[AnalystRecommendation] = []
            for item in raw:
                recommendations.append(
                    AnalystRecommendation(
                        period=item.get("period", ""),
                        strong_buy=item.get("strongBuy", 0),
                        buy=item.get("buy", 0),
                        hold=item.get("hold", 0),
                        sell=item.get("sell", 0),
                        strong_sell=item.get("strongSell", 0),
                    )
                )
            return recommendations

        except Exception as exc:
            logger.error(
                "FinnhubProvider.get_analyst_recommendations failed for symbol=%s: %s",
                symbol, exc,
            )
            return []

    # ------------------------------------------------------------------
    # Unsupported capabilities
    # ------------------------------------------------------------------

    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",
        period: str = "1y",
    ) -> list[OHLCVBar]:
        """Not available via Finnhub free tier — returns empty list."""
        return []

    def get_financial_statements(self, symbol: str) -> FinancialStatements:
        """Not supported — returns empty statements."""
        return FinancialStatements(symbol=symbol.upper())

    def get_asset_info(self, symbol: str) -> Optional[AssetInfo]:
        """
        Fetch basic asset metadata from Finnhub company profile endpoint.
        """
        try:
            profile = self._client.company_profile2(symbol=symbol.upper())
            if not profile:
                return None
            return AssetInfo(
                symbol=profile.get("ticker", symbol).upper(),
                name=profile.get("name", symbol),
                exchange=profile.get("exchange"),
                currency=profile.get("currency"),
                industry=profile.get("finnhubIndustry"),
                market_cap=int(profile["marketCapitalization"] * 1_000_000)
                if profile.get("marketCapitalization")
                else None,
            )
        except Exception as exc:
            logger.error(
                "FinnhubProvider.get_asset_info failed for symbol=%s: %s", symbol, exc
            )
            return None

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    def health_check(self) -> ProviderHealth:
        start = time.monotonic()
        try:
            result = self._client.quote("AAPL")
            latency_ms = (time.monotonic() - start) * 1000
            if result and result.get("c"):  # 'c' is the current price
                return ProviderHealth(
                    provider_name=self._PROVIDER_NAME,
                    status=ProviderStatus.HEALTHY,
                    latency_ms=latency_ms,
                    last_checked=datetime.now(timezone.utc),
                )
            return ProviderHealth(
                provider_name=self._PROVIDER_NAME,
                status=ProviderStatus.DEGRADED,
                latency_ms=latency_ms,
                last_checked=datetime.now(timezone.utc),
                last_error="Empty quote response",
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
