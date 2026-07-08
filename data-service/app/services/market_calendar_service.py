from __future__ import annotations

import logging
from datetime import date as Date, datetime, time, timedelta, timezone
from typing import Any, TypeVar

from pydantic import BaseModel

from app.config import settings
from app.models.market_calendar import EarningsEvent, EconomicEvent, MacroSnapshot, MarketCalendar
from app.providers.fmp_provider import FmpProvider, filter_earnings_by_symbols
from app.providers.fred_provider import FredProvider

RedisClient: Any
try:
    from redis.asyncio import Redis as RedisClient
except ImportError:  # pragma: no cover - exercised only when optional dependency is absent
    RedisClient = None

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

MACRO_CACHE_TTL_SECONDS = 4 * 60 * 60
CALENDAR_LOOKAHEAD_DAYS = 30
_MACRO_CACHE_KEY = "data-service:macro:snapshot"
_CALENDAR_CACHE_KEY = "data-service:market-calendar"


class MarketCalendarService:
    """Caches slow-changing macro and calendar provider responses.

    Redis is the source of truth when available so cache entries survive
    data-service restarts. The in-memory fields remain a local fallback when
    Redis is unavailable.
    """

    _macro_snapshot: MacroSnapshot | None = None
    _macro_expires_at: datetime | None = None
    _calendar: MarketCalendar | None = None
    _calendar_expires_at: datetime | None = None
    _redis_client: Any | None = None

    @classmethod
    async def macro_snapshot(cls) -> MacroSnapshot:
        now = datetime.now(timezone.utc)
        if cls._macro_snapshot is not None and cls._macro_expires_at is not None and now < cls._macro_expires_at:
            return cls._macro_snapshot

        cached = await cls._read_cache(_MACRO_CACHE_KEY, MacroSnapshot)
        if cached is not None:
            cls._macro_snapshot = cached
            cls._macro_expires_at = now + timedelta(seconds=MACRO_CACHE_TTL_SECONDS)
            return cached

        snapshot = await FredProvider(settings.FRED_API_KEY).get_macro_snapshot()
        cls._macro_snapshot = snapshot
        cls._macro_expires_at = now + timedelta(seconds=MACRO_CACHE_TTL_SECONDS)
        await cls._write_cache(_MACRO_CACHE_KEY, snapshot, MACRO_CACHE_TTL_SECONDS)
        return snapshot

    @classmethod
    async def earnings(cls, symbols: list[str] | None = None) -> list[EarningsEvent]:
        calendar = await cls._ensure_daily_calendar()
        return filter_earnings_by_symbols(calendar.earnings, symbols)

    @classmethod
    async def economic_events(cls) -> list[EconomicEvent]:
        calendar = await cls._ensure_daily_calendar()
        return list(calendar.economic_events)

    @classmethod
    async def market_calendar(cls, symbols: list[str] | None = None) -> MarketCalendar:
        calendar = await cls._ensure_daily_calendar()
        return MarketCalendar(
            earnings=filter_earnings_by_symbols(calendar.earnings, symbols),
            economic_events=list(calendar.economic_events),
            cached_at=calendar.cached_at,
        )

    @classmethod
    async def _ensure_daily_calendar(cls) -> MarketCalendar:
        now = datetime.now(timezone.utc)
        if cls._calendar is not None and cls._calendar_expires_at is not None and now < cls._calendar_expires_at:
            return cls._calendar

        cached = await cls._read_cache(_CALENDAR_CACHE_KEY, MarketCalendar)
        if cached is not None:
            cls._calendar = cached
            cls._calendar_expires_at = cls._next_midnight(now)
            return cached

        provider = FmpProvider(settings.FMP_API_KEY)
        today, end = cls._calendar_window(now)
        calendar = MarketCalendar(
            earnings=provider.get_earnings_calendar(today, end),
            economic_events=provider.get_economic_events(today, end),
            cached_at=now,
        )
        cls._calendar = calendar
        cls._calendar_expires_at = cls._next_midnight(now)
        ttl_seconds = max(1, int((cls._calendar_expires_at - now).total_seconds()))
        await cls._write_cache(_CALENDAR_CACHE_KEY, calendar, ttl_seconds)
        return calendar

    @staticmethod
    def _calendar_window(now: datetime) -> tuple[Date, Date]:
        # Window is calculated at fetch time so the 30-day lookahead slides after the daily cache expires.
        today = now.date()
        return today, today + timedelta(days=CALENDAR_LOOKAHEAD_DAYS)

    @staticmethod
    def _next_midnight(now: datetime) -> datetime:
        tomorrow = now.date() + timedelta(days=1)
        return datetime.combine(tomorrow, time.min, tzinfo=timezone.utc)

    @classmethod
    async def _read_cache(cls, key: str, model: type[T]) -> T | None:
        client = cls._redis()
        if client is None:
            return None
        try:
            raw = await client.get(key)
            if not raw:
                return None
            return model.model_validate_json(raw)
        except Exception as exc:
            logger.warning("Redis cache read failed for %s: %s", key, exc)
            return None

    @classmethod
    async def _write_cache(cls, key: str, value: BaseModel, ttl_seconds: int) -> None:
        client = cls._redis()
        if client is None:
            return
        try:
            await client.set(key, value.model_dump_json(), ex=ttl_seconds)
        except Exception as exc:
            logger.warning("Redis cache write failed for %s: %s", key, exc)

    @classmethod
    def _redis(cls) -> Any | None:
        if cls._redis_client is not None:
            return cls._redis_client
        if RedisClient is None:
            return None
        cls._redis_client = RedisClient(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            decode_responses=True,
        )
        return cls._redis_client

    @classmethod
    def clear_cache(cls) -> None:
        cls._macro_snapshot = None
        cls._macro_expires_at = None
        cls._calendar = None
        cls._calendar_expires_at = None