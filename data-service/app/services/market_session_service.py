from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.models.market_sessions import MarketSession, MarketSessionsResponse

xcals = None


class MarketSessionService:
    EXCHANGE_ALIASES = {"NYSE": "XNYS", "NASDAQ": "XNYS", "US": "XNYS", "BIST": "XIST", "IST": "XIST"}

    @classmethod
    def get_sessions(cls, exchanges: list[str]) -> MarketSessionsResponse:
        now = datetime.now(timezone.utc)
        sessions = [cls._session(exchange, now) for exchange in exchanges]
        return MarketSessionsResponse(sessions=sessions, observed_at=now)

    @classmethod
    def _session(cls, raw_exchange: str, now: datetime) -> MarketSession:
        exchange = cls.EXCHANGE_ALIASES.get(raw_exchange.upper(), raw_exchange.upper())
        if xcals is None:
            return cls._fallback_session(exchange, now)
        try:
            calendar = xcals.get_calendar(exchange)
            timezone_name = str(calendar.tz)
            start = now.date() - timedelta(days=2)
            end = now.date() + timedelta(days=7)
            sessions = calendar.sessions_in_range(start, end)
            current_open = current_close = None
            next_open = next_close = None
            for session in sessions:
                opened = calendar.session_open(session).to_pydatetime().astimezone(timezone.utc)
                closed = calendar.session_close(session).to_pydatetime().astimezone(timezone.utc)
                if opened <= now <= closed:
                    current_open, current_close = opened, closed
                    break
                if opened > now and next_open is None:
                    next_open, next_close = opened, closed
            if current_open:
                state = "REGULAR"
                return MarketSession(exchange=exchange, state=state, timezone=timezone_name, next_open=current_open, next_close=current_close)
            state = "PRE_MARKET" if next_open and next_open.date() == now.date() else "CLOSED"
            return MarketSession(exchange=exchange, state=state, timezone=timezone_name, next_open=next_open, next_close=next_close)
        except Exception:
            return cls._fallback_session(exchange, now)
    @classmethod
    def _fallback_session(cls, exchange: str, now: datetime) -> MarketSession:
        """Provide session state when exchange-calendars is unavailable."""
        schedule = {
            "XNYS": ("America/New_York", time(9, 30), time(16, 0)),
            "XIST": ("Europe/Istanbul", time(10, 0), time(18, 0)),
        }
        timezone_name, open_at, close_at = schedule.get(
            exchange, ("UTC", time(9, 30), time(16, 0))
        )
        local_now = now.astimezone(ZoneInfo(timezone_name))
        session_open = datetime.combine(local_now.date(), open_at, ZoneInfo(timezone_name))
        session_close = datetime.combine(local_now.date(), close_at, ZoneInfo(timezone_name))
        if local_now.weekday() < 5 and session_open <= local_now <= session_close:
            state = "REGULAR"
            next_open = session_open.astimezone(timezone.utc)
            next_close = session_close.astimezone(timezone.utc)
        elif local_now.weekday() < 5 and local_now < session_open:
            state = "PRE_MARKET"
            next_open = session_open.astimezone(timezone.utc)
            next_close = session_close.astimezone(timezone.utc)
        else:
            state = "CLOSED"
            next_day = local_now.date() + timedelta(days=1)
            while next_day.weekday() >= 5:
                next_day += timedelta(days=1)
            next_open = datetime.combine(next_day, open_at, ZoneInfo(timezone_name)).astimezone(timezone.utc)
            next_close = datetime.combine(next_day, close_at, ZoneInfo(timezone_name)).astimezone(timezone.utc)
        return MarketSession(
            exchange=exchange,
            state=state,
            timezone=timezone_name,
            next_open=next_open,
            next_close=next_close,
            source="timezone_schedule_fallback",
        )