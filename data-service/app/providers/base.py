"""
Base types and IMarketDataProvider Protocol for the provider abstraction layer.

Business logic must depend ONLY on these interfaces — never on yfinance,
Tiingo SDK, or Finnhub SDK directly.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional, Protocol, runtime_checkable


# ---------------------------------------------------------------------------
# Value objects
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class OHLCVBar:
    """One candlestick bar of OHLCV price data."""

    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: Optional[int]


@dataclass(frozen=True)
class AssetInfo:
    """Basic metadata about a tradable asset."""

    symbol: str
    name: str
    exchange: Optional[str] = None
    currency: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    market_cap: Optional[int] = None


@dataclass(frozen=True)
class FinancialStatements:
    """Raw financial statement data returned by a provider."""

    symbol: str
    # Income statement (most recent year first)
    revenue: list[float] = field(default_factory=list)
    net_income: list[float] = field(default_factory=list)
    operating_cash_flow: list[float] = field(default_factory=list)
    # Balance sheet
    total_assets: list[float] = field(default_factory=list)
    total_liabilities: list[float] = field(default_factory=list)
    total_equity: list[float] = field(default_factory=list)
    current_assets: list[float] = field(default_factory=list)
    current_liabilities: list[float] = field(default_factory=list)
    total_debt: list[float] = field(default_factory=list)
    cash: list[float] = field(default_factory=list)
    # Cash flow
    capital_expenditure: list[float] = field(default_factory=list)
    # Misc
    fiscal_years: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class NewsItem:
    """A single news article related to a symbol."""

    headline: str
    summary: str
    source: str
    url: str
    published_at: datetime
    sentiment_score: Optional[float] = None


@dataclass(frozen=True)
class AnalystRecommendation:
    """Analyst consensus recommendation for a period."""

    period: str
    strong_buy: int = 0
    buy: int = 0
    hold: int = 0
    sell: int = 0
    strong_sell: int = 0


# ---------------------------------------------------------------------------
# Provider health
# ---------------------------------------------------------------------------


class ProviderStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    BLACKLISTED = "blacklisted"


@dataclass
class ProviderHealth:
    """Live health state of a market data provider."""

    provider_name: str
    status: ProviderStatus
    latency_ms: Optional[float] = None
    error_rate: float = 0.0
    last_checked: Optional[datetime] = None
    last_error: Optional[str] = None
    consecutive_failures: int = 0


# ---------------------------------------------------------------------------
# Protocol
# ---------------------------------------------------------------------------


@runtime_checkable
class IMarketDataProvider(Protocol):
    """
    Provider-agnostic interface for fetching market data.

    Concrete implementations (Yahoo, Tiingo, Finnhub) must satisfy this
    protocol.  Business services depend on this interface only — they must
    never import yfinance, tiingo, or finnhub directly.
    """

    @property
    def provider_name(self) -> str:
        """Human-readable provider identifier (e.g. 'yahoo', 'tiingo')."""
        ...

    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",
        period: str = "1y",
    ) -> list[OHLCVBar]:
        """
        Fetch historical OHLCV bars.

        Args:
            symbol:   Ticker symbol (e.g. 'AAPL').
            interval: Bar interval compatible with the provider ('1d', '1h', …).
            period:   Lookback period ('1mo', '3mo', '1y', …).

        Returns:
            Non-null, possibly empty list of bars in ascending timestamp order.
        """
        ...

    def get_financial_statements(self, symbol: str) -> FinancialStatements:
        """
        Fetch the most recent annual financial statements.

        Returns:
            FinancialStatements with lists ordered most-recent-first.
            Lists may be empty if the provider does not supply this data.
        """
        ...

    def get_asset_info(self, symbol: str) -> Optional[AssetInfo]:
        """
        Fetch basic metadata for the given symbol.

        Returns:
            AssetInfo or None if the provider has no data for the symbol.
        """
        ...

    def get_news(
        self,
        symbol: str,
        from_date: str,
        to_date: str,
    ) -> list[NewsItem]:
        """
        Fetch recent news articles for the symbol.

        Args:
            symbol:    Ticker.
            from_date: ISO date string 'YYYY-MM-DD'.
            to_date:   ISO date string 'YYYY-MM-DD'.

        Returns:
            List of news items, empty if unsupported or unavailable.
        """
        ...

    def get_analyst_recommendations(
        self, symbol: str
    ) -> list[AnalystRecommendation]:
        """
        Fetch analyst buy/sell/hold recommendations.

        Returns:
            List of recommendations, empty if unsupported or unavailable.
        """
        ...

    def health_check(self) -> ProviderHealth:
        """
        Perform a lightweight connectivity/latency probe.

        Returns:
            ProviderHealth describing current status.
        """
        ...
