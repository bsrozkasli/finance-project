"""
YahooProvider — primary market data provider backed by yfinance.

Responsibilities:
- OHLCV historical price data
- Financial statements (income, balance sheet, cash flow)
- Corporate actions
- Asset metadata

Business code must access this class exclusively through IMarketDataProvider.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import pandas as pd
import yfinance as yf

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


class YahooProvider:
    """
    Concrete IMarketDataProvider implementation using yfinance.

    This class wraps the yfinance library and translates all raw output
    into the provider-agnostic value objects defined in base.py.
    """

    _PROVIDER_NAME = "yahoo"

    @property
    def provider_name(self) -> str:
        return self._PROVIDER_NAME

    # ------------------------------------------------------------------
    # OHLCV
    # ------------------------------------------------------------------

    def get_ohlcv(
        self,
        symbol: str,
        interval: str = "1d",
        period: str = "1y",
    ) -> list[OHLCVBar]:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(
                period=period,
                interval=interval,
                auto_adjust=False,
                actions=False,
            )
            if hist is None or hist.empty:
                logger.warning(
                    "YahooProvider: empty OHLCV for symbol=%s interval=%s period=%s",
                    symbol, interval, period,
                )
                return []

            bars: list[OHLCVBar] = []
            for ts, row in hist.iterrows():
                close = row.get("Close")
                if pd.isna(close):
                    continue
                # Normalise timestamp to UTC
                dt: datetime = pd.Timestamp(ts).to_pydatetime()
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                else:
                    dt = dt.astimezone(timezone.utc)

                bars.append(
                    OHLCVBar(
                        timestamp=dt,
                        open=float(row["Open"]) if not pd.isna(row.get("Open")) else float(close),
                        high=float(row["High"]) if not pd.isna(row.get("High")) else float(close),
                        low=float(row["Low"]) if not pd.isna(row.get("Low")) else float(close),
                        close=float(close),
                        volume=int(row["Volume"]) if not pd.isna(row.get("Volume")) else None,
                    )
                )
            return bars

        except Exception as exc:
            logger.error(
                "YahooProvider.get_ohlcv failed for symbol=%s: %s", symbol, exc
            )
            return []

    # ------------------------------------------------------------------
    # Financial statements
    # ------------------------------------------------------------------

    def get_financial_statements(self, symbol: str) -> FinancialStatements:
        try:
            ticker = yf.Ticker(symbol)
            financials = self._safe_df(ticker, "financials")
            balance_sheet = self._safe_df(ticker, "balance_sheet")
            cashflow = self._safe_df(ticker, "cashflow")

            return FinancialStatements(
                symbol=symbol.upper(),
                # Income statement
                revenue=self._extract_series(financials, ["Total Revenue"]),
                net_income=self._extract_series(
                    financials, ["Net Income", "Net Income Common Stockholders"]
                ),
                operating_cash_flow=self._extract_series(
                    cashflow,
                    ["Operating Cash Flow", "Total Cash From Operating Activities"],
                ),
                # Balance sheet
                total_assets=self._extract_series(balance_sheet, ["Total Assets"]),
                total_liabilities=self._extract_series(
                    balance_sheet, ["Total Liabilities Net Minority Interest", "Total Liab"]
                ),
                total_equity=self._extract_series(
                    balance_sheet,
                    [
                        "Stockholders Equity",
                        "Total Stockholder Equity",
                        "Total Equity Gross Minority Interest",
                    ],
                ),
                current_assets=self._extract_series(
                    balance_sheet, ["Total Current Assets", "Current Assets"]
                ),
                current_liabilities=self._extract_series(
                    balance_sheet,
                    ["Current Liabilities", "Total Current Liabilities"],
                ),
                total_debt=self._extract_series(
                    balance_sheet, ["Total Debt", "Long Term Debt"]
                ),
                cash=self._extract_series(
                    balance_sheet,
                    [
                        "Cash And Cash Equivalents",
                        "Cash Cash Equivalents And Short Term Investments",
                    ],
                ),
                capital_expenditure=self._extract_series(
                    cashflow,
                    ["Capital Expenditure", "Capital Expenditures"],
                    absolute=True,
                ),
                fiscal_years=self._extract_fiscal_years(financials),
            )

        except Exception as exc:
            logger.error(
                "YahooProvider.get_financial_statements failed for symbol=%s: %s",
                symbol,
                exc,
            )
            return FinancialStatements(symbol=symbol.upper())

    # ------------------------------------------------------------------
    # Asset info
    # ------------------------------------------------------------------

    def get_asset_info(self, symbol: str) -> Optional[AssetInfo]:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            if not info or not isinstance(info, dict):
                return None
            return AssetInfo(
                symbol=info.get("symbol", symbol).upper(),
                name=info.get("shortName") or info.get("longName") or symbol,
                exchange=info.get("exchange"),
                currency=info.get("currency"),
                sector=info.get("sector"),
                industry=info.get("industry"),
                market_cap=info.get("marketCap"),
            )
        except Exception as exc:
            logger.error(
                "YahooProvider.get_asset_info failed for symbol=%s: %s", symbol, exc
            )
            return None

    # ------------------------------------------------------------------
    # News
    # ------------------------------------------------------------------

    def get_news(
        self,
        symbol: str,
        from_date: str,  # noqa: ARG002 — Yahoo ignores date params in .news
        to_date: str,  # noqa: ARG002
    ) -> list[NewsItem]:
        try:
            ticker = yf.Ticker(symbol)
            raw_news = ticker.news or []
            items: list[NewsItem] = []
            for article in raw_news[:20]:
                content = article.get("content", {}) if isinstance(article, dict) else {}
                headline = content.get("title", "")
                summary = content.get("summary", "")
                source_info = content.get("provider", {}) or {}
                source = source_info.get("displayName", "Yahoo Finance")
                url_info = content.get("canonicalUrl", {}) or {}
                url = url_info.get("url", "")
                pub_date_str = content.get("pubDate")
                try:
                    pub_date = datetime.fromisoformat(
                        pub_date_str.replace("Z", "+00:00")
                    ) if pub_date_str else datetime.now(timezone.utc)
                except Exception:
                    pub_date = datetime.now(timezone.utc)

                if headline:
                    items.append(
                        NewsItem(
                            headline=headline,
                            summary=summary,
                            source=source,
                            url=url,
                            published_at=pub_date,
                        )
                    )
            return items
        except Exception as exc:
            logger.error(
                "YahooProvider.get_news failed for symbol=%s: %s", symbol, exc
            )
            return []

    # ------------------------------------------------------------------
    # Analyst recommendations — Yahoo does not offer a clean endpoint;
    # return empty to let Finnhub take over via the resolver.
    # ------------------------------------------------------------------

    def get_analyst_recommendations(
        self, symbol: str  # noqa: ARG002
    ) -> list[AnalystRecommendation]:
        return []

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    def health_check(self) -> ProviderHealth:
        start = time.monotonic()
        try:
            ticker = yf.Ticker("AAPL")
            hist = ticker.history(period="1d", interval="1d")
            latency_ms = (time.monotonic() - start) * 1000
            if hist is None or hist.empty:
                return ProviderHealth(
                    provider_name=self._PROVIDER_NAME,
                    status=ProviderStatus.DEGRADED,
                    latency_ms=latency_ms,
                    last_checked=datetime.now(timezone.utc),
                    last_error="Empty response from Yahoo for health probe",
                )
            return ProviderHealth(
                provider_name=self._PROVIDER_NAME,
                status=ProviderStatus.HEALTHY,
                latency_ms=latency_ms,
                last_checked=datetime.now(timezone.utc),
            )
        except Exception as exc:
            latency_ms = (time.monotonic() - start) * 1000
            return ProviderHealth(
                provider_name=self._PROVIDER_NAME,
                status=ProviderStatus.UNHEALTHY,
                latency_ms=latency_ms,
                last_checked=datetime.now(timezone.utc),
                last_error=str(exc),
                consecutive_failures=1,
            )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _safe_df(ticker: yf.Ticker, attr: str) -> pd.DataFrame:
        try:
            df = getattr(ticker, attr, None)
            if df is None or not isinstance(df, pd.DataFrame) or df.empty:
                return pd.DataFrame()
            return df
        except Exception:
            return pd.DataFrame()

    @classmethod
    def _extract_series(
        cls,
        df: pd.DataFrame,
        keys: list[str],
        absolute: bool = False,
    ) -> list[float]:
        """Return all column values for the first matching row key."""
        if df.empty:
            return []
        for key in keys:
            if key in df.index:
                values = []
                for col_idx in range(df.shape[1]):
                    val = df.loc[key].iloc[col_idx]
                    if pd.notna(val):
                        v = float(val)
                        values.append(abs(v) if absolute else v)
                    else:
                        values.append(0.0)
                return values
        return []

    @classmethod
    def _extract_fiscal_years(cls, financials: pd.DataFrame) -> list[str]:
        if financials.empty:
            return []
        result = []
        for col in financials.columns:
            if hasattr(col, "strftime"):
                result.append(col.strftime("%Y-%m-%d"))
            else:
                result.append(str(col))
        return result
