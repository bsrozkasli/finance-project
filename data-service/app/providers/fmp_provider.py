from __future__ import annotations

import logging
from datetime import date as Date

import httpx

from app.models.market_calendar import EarningsEvent, EconomicEvent

logger = logging.getLogger(__name__)

_FMP_BASE_URL = "https://financialmodelingprep.com/stable"
_HIGH_IMPACT_KEYWORDS = (
    "FOMC",
    "CPI",
    "NFP",
    "NONFARM",
    "NON-FARM",
    "GDP",
    "PCE",
    "PPI",
    "RETAIL SALES",
    "INTEREST RATE",
    "RATE DECISION",
)


class FmpProvider:
    """Financial Modeling Prep calendar provider.

    Missing API keys or upstream failures degrade to empty lists to protect callers.
    """

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def get_earnings_calendar(self, from_date: Date | None = None, to_date: Date | None = None) -> list[EarningsEvent]:
        if not self._api_key:
            return []
        params = self._date_params(from_date, to_date)
        try:
            data = self._get("/earning-calendar", params)
            events = [self._to_earnings_event(item) for item in data]
            return [event for event in events if event is not None]
        except Exception as exc:
            logger.warning("FMP earnings calendar unavailable: %s", exc)
            return []

    def get_economic_events(self, from_date: Date | None = None, to_date: Date | None = None) -> list[EconomicEvent]:
        if not self._api_key:
            return []
        params = self._date_params(from_date, to_date)
        try:
            data = self._get("/economic-calendar", params)
            events = [self._to_economic_event(item) for item in data]
            return [event for event in events if event is not None and is_high_impact_event(event.event)]
        except Exception as exc:
            logger.warning("FMP economic calendar unavailable: %s", exc)
            return []

    def _get(self, path: str, params: dict[str, str]) -> list[dict]:
        request_params = {**params, "apikey": self._api_key}
        with httpx.Client(timeout=15.0) as client:
            response = client.get(_FMP_BASE_URL + path, params=request_params)
            response.raise_for_status()
            payload = response.json()
        return payload if isinstance(payload, list) else []

    @staticmethod
    def _date_params(from_date: Date | None, to_date: Date | None) -> dict[str, str]:
        params: dict[str, str] = {}
        if from_date is not None:
            params["from"] = from_date.isoformat()
        if to_date is not None:
            params["to"] = to_date.isoformat()
        return params

    @staticmethod
    def _to_earnings_event(item: dict) -> EarningsEvent | None:
        symbol = item.get("symbol") or item.get("ticker")
        if not symbol:
            return None
        return EarningsEvent(
            symbol=str(symbol).upper(),
            date=_parse_date(item.get("date")),
            eps_estimate=_parse_float(item.get("epsEstimated") or item.get("epsEstimate")),
            eps_actual=_parse_float(item.get("eps") or item.get("epsActual")),
            revenue_estimate=_parse_float(item.get("revenueEstimated") or item.get("revenueEstimate")),
            revenue_actual=_parse_float(item.get("revenue") or item.get("revenueActual")),
            time=item.get("time"),
        )

    @staticmethod
    def _to_economic_event(item: dict) -> EconomicEvent | None:
        event = item.get("event") or item.get("title") or item.get("name")
        if not event:
            return None
        return EconomicEvent(
            event=str(event),
            date=_parse_date(item.get("date")),
            country=item.get("country"),
            impact=item.get("impact") or item.get("importance"),
            actual=item.get("actual"),
            estimate=item.get("estimate") or item.get("forecast"),
            previous=item.get("previous"),
        )


def is_high_impact_event(event_name: str) -> bool:
    upper = event_name.upper()
    return any(keyword in upper for keyword in _HIGH_IMPACT_KEYWORDS)


def filter_earnings_by_symbols(events: list[EarningsEvent], symbols: list[str] | None) -> list[EarningsEvent]:
    if not symbols:
        return events
    allowed = {symbol.strip().upper() for symbol in symbols if symbol.strip()}
    if not allowed:
        return events
    return [event for event in events if event.symbol.upper() in allowed]


def _parse_date(raw: object) -> Date | None:
    if not raw:
        return None
    try:
        return Date.fromisoformat(str(raw)[:10])
    except ValueError:
        return None


def _parse_float(raw: object) -> float | None:
    if raw in (None, ""):
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None