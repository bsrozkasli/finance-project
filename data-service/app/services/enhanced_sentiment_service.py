from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.models.sentiment import (
    AnalystRecommendation,
    EnhancedSentimentResponse,
    InsiderTransaction,
)

logger = logging.getLogger(__name__)

# Titles that qualify as C-suite executives
_C_SUITE_KEYWORDS = {"CEO", "CFO", "COO", "CTO", "PRESIDENT", "CHAIRMAN"}


class EnhancedSentimentService:
    """Combines news, analyst, and insider signals into a single sentiment score."""

    FINNHUB_BASE_URL = "https://finnhub.io/api/v1"

    # --- public entry point ------------------------------------------------

    @classmethod
    async def analyze(cls, symbol: str) -> EnhancedSentimentResponse:
        """Run the full enhanced-sentiment pipeline for *symbol*.

        Each data source is fetched independently; failures are isolated and
        the respective sub-score defaults to a neutral value so the composite
        result is always returned.
        """
        symbol = symbol.strip().upper()
        now = datetime.now(timezone.utc)

        # 1. News sentiment (reuse existing service)
        news_score, news_label = await cls._fetch_news_sentiment(symbol)

        # 2. Analyst recommendations (Finnhub)
        analyst_score, analyst_consensus, analyst_data = await cls._fetch_analyst_data(symbol)

        # 3. Insider transactions (Finnhub)
        insider_score, insider_summary, insider_txns = await cls._fetch_insider_data(symbol)

        # 4. Composite score  (0-100)
        sentiment_score = cls._compute_composite(news_score, analyst_score, insider_score)

        return EnhancedSentimentResponse(
            symbol=symbol,
            news_score=news_score,
            news_label=news_label,
            analyst_score=analyst_score,
            analyst_consensus=analyst_consensus,
            analyst_data=analyst_data,
            insider_score=insider_score,
            insider_summary=insider_summary,
            recent_insider_transactions=insider_txns,
            sentiment_score=sentiment_score,
            calculated_at=now,
        )

    # --- news --------------------------------------------------------------

    @classmethod
    async def _fetch_news_sentiment(cls, symbol: str) -> tuple[float, str]:
        """Delegate to the existing ``SentimentService`` for LLM-based news
        sentiment.  Returns ``(score, label)`` defaulting to neutral on error.
        """
        try:
            from app.services.sentiment_service import SentimentService

            news_result = await SentimentService.analyze_sentiment(symbol)
            return news_result.score, news_result.label
        except Exception:
            logger.warning("News sentiment fetch failed for %s, defaulting to neutral", symbol)
            return 0.0, "NEUTRAL"

    # --- analyst recommendations -------------------------------------------

    @classmethod
    async def _fetch_analyst_data(
        cls, symbol: str
    ) -> tuple[float, str, AnalystRecommendation | None]:
        """Fetch the most-recent analyst recommendation from Finnhub and
        compute a normalised score in ``[-1, 1]``.
        """
        try:
            url = f"{cls.FINNHUB_BASE_URL}/stock/recommendation"
            params = {"symbol": symbol, "token": settings.FINNHUB_API_KEY}

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=15.0)
                response.raise_for_status()
                data = response.json()

            if not data:
                return 0.0, "Hold", None

            # Most-recent entry is first in the list
            latest = data[0]

            strong_buy = int(latest.get("strongBuy", 0))
            buy = int(latest.get("buy", 0))
            hold = int(latest.get("hold", 0))
            sell = int(latest.get("sell", 0))
            strong_sell = int(latest.get("strongSell", 0))
            period = str(latest.get("period", ""))

            analyst_rec = AnalystRecommendation(
                period=period,
                strong_buy=strong_buy,
                buy=buy,
                hold=hold,
                sell=sell,
                strong_sell=strong_sell,
            )

            analyst_score = cls._compute_analyst_score(
                strong_buy, buy, hold, sell, strong_sell
            )
            consensus = cls._analyst_consensus_label(analyst_score)

            return analyst_score, consensus, analyst_rec

        except Exception:
            logger.warning("Analyst data fetch failed for %s, defaulting to neutral", symbol)
            return 0.0, "Hold", None

    @staticmethod
    def _compute_analyst_score(
        strong_buy: int, buy: int, hold: int, sell: int, strong_sell: int
    ) -> float:
        """Weighted score normalised to ``[-1, 1]``."""
        weighted = (strong_buy * 2) + (buy * 1) + (hold * 0) + (sell * -1) + (strong_sell * -2)
        total = strong_buy + buy + hold + sell + strong_sell
        if total <= 0:
            return 0.0
        score = weighted / (total * 2)
        return max(-1.0, min(1.0, score))

    @staticmethod
    def _analyst_consensus_label(score: float) -> str:
        if score > 0.5:
            return "Strong Buy"
        if score > 0.2:
            return "Buy"
        if score > -0.2:
            return "Hold"
        if score > -0.5:
            return "Sell"
        return "Strong Sell"

    # --- insider transactions ----------------------------------------------

    @classmethod
    async def _fetch_insider_data(
        cls, symbol: str
    ) -> tuple[float, str, list[InsiderTransaction]]:
        """Fetch insider transactions from Finnhub and compute a directional
        score based on buy/sell activity weighted by executive seniority.
        """
        try:
            url = f"{cls.FINNHUB_BASE_URL}/stock/insider-transactions"
            params = {"symbol": symbol, "token": settings.FINNHUB_API_KEY}

            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=15.0)
                response.raise_for_status()
                raw = response.json()

            transactions_raw = raw.get("data", [])
            if not transactions_raw:
                return 0.0, "No recent insider activity", []

            # Take last 10 transactions
            transactions_raw = transactions_raw[:10]

            insider_txns: list[InsiderTransaction] = []
            cumulative_score = 0.0

            for txn in transactions_raw:
                name = str(txn.get("name", "Unknown"))
                # Finnhub may not always provide a title; fall back to empty
                title = str(txn.get("title", "") or "")
                code = str(txn.get("transactionCode", ""))
                shares = float(txn.get("change", 0))
                value = txn.get("transactionPrice")
                date = str(txn.get("transactionDate", ""))

                # Determine human-readable transaction type
                if code == "P":
                    txn_type = "Purchase"
                elif code == "S":
                    txn_type = "Sale"
                else:
                    txn_type = code or "Other"

                insider_txns.append(
                    InsiderTransaction(
                        name=name,
                        title=title,
                        transaction_type=txn_type,
                        shares=abs(shares),
                        value=float(value) if value is not None else None,
                        date=date,
                    )
                )

                is_c_suite = cls._is_c_suite(name, title)

                if code == "P":
                    cumulative_score += 0.3 if is_c_suite else 0.15
                elif code == "S":
                    cumulative_score += -0.15 if is_c_suite else -0.1

            insider_score = max(-1.0, min(1.0, cumulative_score))
            summary = cls._insider_summary_label(insider_score, len(insider_txns))

            return insider_score, summary, insider_txns

        except Exception:
            logger.warning("Insider data fetch failed for %s, defaulting to neutral", symbol)
            return 0.0, "No insider data available", []

    @staticmethod
    def _is_c_suite(name: str, title: str) -> bool:
        """Return ``True`` if the insider is a C-suite executive."""
        combined = f"{name} {title}".upper()
        return any(keyword in combined for keyword in _C_SUITE_KEYWORDS)

    @staticmethod
    def _insider_summary_label(score: float, count: int) -> str:
        if count == 0:
            return "No recent insider activity"
        if score > 0.3:
            return "Strong insider buying"
        if score > 0.1:
            return "Moderate insider buying"
        if score > -0.1:
            return "Mixed insider activity"
        if score > -0.3:
            return "Moderate insider selling"
        return "Strong insider selling"

    # --- composite ---------------------------------------------------------

    @staticmethod
    def _compute_composite(news: float, analyst: float, insider: float) -> int:
        """Weighted composite mapped to a 0-100 scale.

        Weights: news 40%, analyst 40%, insider 20%.
        """
        raw = news * 0.4 + analyst * 0.4 + insider * 0.2
        normalized = (raw + 1) / 2 * 100
        return int(round(max(0, min(100, normalized))))
