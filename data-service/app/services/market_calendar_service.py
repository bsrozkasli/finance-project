from __future__ import annotations

from datetime import datetime, time, timedelta, timezone

from app.config import settings
from app.models.market_calendar import EarningsEvent, EconomicEvent, MacroSnapshot, MarketCalendar
from app.providers.fmp_provider import FmpProvider, filter_earnings_by_symbols
from app.providers.fred_provider import FredProvider


class MarketCalendarService:
    """Caches slow-changing macro and calendar provider responses."""

    _macro_snapshot: MacroSnapshot | None = None
    _macro_expires_at: datetime | None = None
    _earnings: list[EarningsEvent] | None = None
    _economic_events: list[EconomicEvent] | None = None
    _calendar_cached_at: datetime | None = None
    _calendar_expires_at: datetime | None = None

    @classmethod
    def macro_snapshot(cls) -> MacroSnapshot:
        now = datetime.now(timezone.utc)
        if cls._macro_snapshot is not None and cls._macro_expires_at is not None and now < cls._macro_expires_at:
            return cls._macro_snapshot

        snapshot = FredProvider(settings.FRED_API_KEY).get_macro_snapshot()
        cls._macro_snapshot = snapshot
        cls._macro_expires_at = now + timedelta(hours=1)
        return snapshot

    @classmethod
    def earnings(cls, symbols: list[str] | None = None) -> list[EarningsEvent]:
        cls._ensure_daily_calendar()
        return filter_earnings_by_symbols(cls._earnings or [], symbols)

    @classmethod
    def economic_events(cls) -> list[EconomicEvent]:
        cls._ensure_daily_calendar()
        return list(cls._economic_events or [])

    @classmethod
    def market_calendar(cls, symbols: list[str] | None = None) -> MarketCalendar:
        cls._ensure_daily_calendar()
        return MarketCalendar(
            earnings=filter_earnings_by_symbols(cls._earnings or [], symbols),
            economic_events=list(cls._economic_events or []),
            cached_at=cls._calendar_cached_at or datetime.now(timezone.utc),
        )

    @classmethod
    def _ensure_daily_calendar(cls) -> None:
        now = datetime.now(timezone.utc)
        if cls._calendar_expires_at is not None and now < cls._calendar_expires_at:
            return

        provider = FmpProvider(settings.FMP_API_KEY)
        today = now.date()
        end = today + timedelta(days=30)
        cls._earnings = provider.get_earnings_calendar(today, end)
        cls._economic_events = provider.get_economic_events(today, end)
        cls._calendar_cached_at = now
        cls._calendar_expires_at = cls._next_midnight(now)

    @staticmethod
    def _next_midnight(now: datetime) -> datetime:
        tomorrow = now.date() + timedelta(days=1)
        return datetime.combine(tomorrow, time.min, tzinfo=timezone.utc)

    @classmethod
    def clear_cache(cls) -> None:
        cls._macro_snapshot = None
        cls._macro_expires_at = None
        cls._earnings = None
        cls._economic_events = None
        cls._calendar_cached_at = None
        cls._calendar_expires_at = None