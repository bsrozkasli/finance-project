"""Earnings analysis service using Finnhub earnings data.

Fetches historical EPS data from Finnhub and computes a composite
earnings score (0-100) based on beat ratio, surprise magnitude,
streak consistency, and surprise variance.
"""

from __future__ import annotations

import statistics
from datetime import datetime, timezone

import httpx

from app.config import settings
from app.models.earnings import (
    EarningsAnalysisResponse,
    EarningsMetrics,
    EarningsQuarter,
)

_FINNHUB_EARNINGS_URL = "https://finnhub.io/api/v1/stock/earnings"


class EarningsAnalysisService:
    """Stateless service that analyses historical earnings data."""

    @classmethod
    async def analyze(cls, symbol: str) -> EarningsAnalysisResponse:
        """Fetch earnings history from Finnhub and return scored analysis.

        Args:
            symbol: Ticker symbol (e.g. ``"AAPL"``).

        Returns:
            ``EarningsAnalysisResponse`` with metrics, score, and history.

        Raises:
            ValueError: If the Finnhub API key is not configured.
        """

        if not settings.FINNHUB_API_KEY:
            raise ValueError("FINNHUB_API_KEY is not configured")

        symbol = symbol.strip().upper()

        raw_quarters = await cls._fetch_earnings(symbol)

        if not raw_quarters:
            return cls._empty_response(symbol)

        history = cls._parse_quarters(raw_quarters)
        metrics = cls._compute_metrics(history)

        return EarningsAnalysisResponse(
            symbol=symbol,
            metrics=metrics,
            history=history,
            calculated_at=datetime.now(timezone.utc),
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @classmethod
    async def _fetch_earnings(cls, symbol: str) -> list[dict]:
        """Call Finnhub ``/stock/earnings`` and return the raw JSON list."""

        params: dict[str, str | int] = {
            "symbol": symbol,
            "limit": 20,
            "token": settings.FINNHUB_API_KEY,
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(_FINNHUB_EARNINGS_URL, params=params)
            response.raise_for_status()
            data = response.json()

        if not isinstance(data, list):
            return []
        return data

    @classmethod
    def _parse_quarters(cls, raw: list[dict]) -> list[EarningsQuarter]:
        """Convert raw Finnhub objects into ``EarningsQuarter`` models."""

        quarters: list[EarningsQuarter] = []
        for item in raw:
            actual = item.get("actual")
            estimate = item.get("estimate")

            beat: bool | None = None
            if actual is not None and estimate is not None:
                beat = actual > estimate

            quarters.append(
                EarningsQuarter(
                    period=item.get("period", ""),
                    actual=actual,
                    estimate=estimate,
                    surprise=item.get("surprise"),
                    surprise_pct=item.get("surprisePercent"),
                    beat=beat,
                )
            )
        return quarters

    @classmethod
    def _compute_metrics(cls, history: list[EarningsQuarter]) -> EarningsMetrics:
        """Derive aggregated metrics and a composite score from *history*."""

        # Only quarters with both actual and estimate are scoreable
        scoreable = [q for q in history if q.actual is not None and q.estimate is not None]
        total = len(scoreable)

        if total == 0:
            return EarningsMetrics(
                earnings_score=50,
                beat_ratio=0.0,
                miss_ratio=0.0,
                average_surprise_pct=0.0,
                consecutive_beats=0,
                consecutive_misses=0,
                quarters_analyzed=0,
            )

        beats = sum(1 for q in scoreable if q.beat is True)
        misses = sum(1 for q in scoreable if q.beat is False)

        beat_ratio = beats / total
        miss_ratio = misses / total

        # Average surprise percentage – use 0.0 for quarters missing the field
        surprise_pcts = [q.surprise_pct for q in history if q.surprise_pct is not None]
        avg_surprise_pct = statistics.mean(surprise_pcts) if surprise_pcts else 0.0

        # Consecutive streaks from most recent quarter backwards
        consecutive_beats = cls._count_streak(scoreable, beat=True)
        consecutive_misses = cls._count_streak(scoreable, beat=False)

        # --- Composite score ---------------------------------------------------
        # 1. Beat-ratio component (40 pts)
        beat_component = beat_ratio * 40

        # 2. Surprise component (30 pts) – linearly mapped from [-30%, +30%]
        surprise_component = min(1.0, max(0.0, (avg_surprise_pct + 30) / 60)) * 30

        # 3. Streak component (20 pts) – up to 5 consecutive beats = full marks
        streak_component = min(1.0, consecutive_beats / 5) * 20

        # 4. Consistency component (10 pts) – lower std-dev of surprise% = better
        if len(surprise_pcts) >= 2:
            std_dev = statistics.stdev(surprise_pcts)
            consistency_component = max(0.0, 1.0 - std_dev / 30) * 10
        else:
            consistency_component = 5.0  # neutral default when data is scarce

        raw_score = beat_component + surprise_component + streak_component + consistency_component
        earnings_score = int(min(100, max(0, round(raw_score))))

        return EarningsMetrics(
            earnings_score=earnings_score,
            beat_ratio=round(beat_ratio, 4),
            miss_ratio=round(miss_ratio, 4),
            average_surprise_pct=round(avg_surprise_pct, 4),
            consecutive_beats=consecutive_beats,
            consecutive_misses=consecutive_misses,
            quarters_analyzed=total,
        )

    @staticmethod
    def _count_streak(scoreable: list[EarningsQuarter], *, beat: bool) -> int:
        """Count consecutive quarters matching *beat* from the front of the list.

        Finnhub returns quarters most-recent-first, so index 0 is the latest.
        """

        count = 0
        for q in scoreable:
            if q.beat is beat:
                count += 1
            else:
                break
        return count

    @classmethod
    def _empty_response(cls, symbol: str) -> EarningsAnalysisResponse:
        """Return a neutral response when no earnings data is available."""

        return EarningsAnalysisResponse(
            symbol=symbol,
            metrics=EarningsMetrics(
                earnings_score=50,
                beat_ratio=0.0,
                miss_ratio=0.0,
                average_surprise_pct=0.0,
                consecutive_beats=0,
                consecutive_misses=0,
                quarters_analyzed=0,
            ),
            history=[],
            calculated_at=datetime.now(timezone.utc),
        )
