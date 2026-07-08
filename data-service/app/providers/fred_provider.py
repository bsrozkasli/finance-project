from __future__ import annotations

import asyncio
import logging
from datetime import date as Date, datetime, timezone

import httpx

from app.models.market_calendar import MacroSnapshot

logger = logging.getLogger(__name__)

_FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
_FRED_SERIES = {
    "fed_funds_rate": "FEDFUNDS",
    "cpi": "CPIAUCSL",
    "gdp_growth": "A191RL1Q225SBEA",
    "unemployment_rate": "UNRATE",
    "treasury_10y": "DGS10",
    "treasury_2y": "DGS2",
}


class FredProvider:
    """FRED macroeconomic series provider.

    Missing API keys or upstream failures degrade to a snapshot with null fields.
    FRED represents missing values as the string '.', which is parsed as None.
    """

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    async def get_macro_snapshot(self) -> MacroSnapshot:
        if not self._api_key:
            return self.empty_snapshot()

        series: dict[str, list[tuple[Date, float | None]]] = {}
        async with httpx.AsyncClient(timeout=15.0) as client:
            results = await asyncio.gather(
                *(self._fetch_series(client, series_id) for series_id in _FRED_SERIES.values()),
                return_exceptions=True,
            )

        for (field, series_id), result in zip(_FRED_SERIES.items(), results):
            if isinstance(result, BaseException):
                logger.warning("FRED series %s unavailable: %s", series_id, result)
                series[field] = []
            else:
                series[field] = result

        fed_funds_rate = self._latest_value(series.get("fed_funds_rate", []))
        cpi_series = series.get("cpi", [])
        cpi = self._latest_value(cpi_series)
        treasury_10y = self._latest_value(series.get("treasury_10y", []))
        treasury_2y = self._latest_value(series.get("treasury_2y", []))

        observed_dates = [rows[-1][0] for rows in series.values() if rows]
        observed_at = max(observed_dates) if observed_dates else None

        return MacroSnapshot(
            fed_funds_rate=fed_funds_rate,
            cpi=cpi,
            cpi_yoy=self._cpi_yoy(cpi_series),
            gdp_growth=self._latest_value(series.get("gdp_growth", [])),
            unemployment_rate=self._latest_value(series.get("unemployment_rate", [])),
            treasury_10y=treasury_10y,
            treasury_2y=treasury_2y,
            yield_curve_spread=self._spread(treasury_10y, treasury_2y),
            observed_at=observed_at,
            cached_at=datetime.now(timezone.utc),
        )

    async def _fetch_series(self, client: httpx.AsyncClient, series_id: str) -> list[tuple[Date, float | None]]:
        params = {
            "series_id": series_id,
            "api_key": self._api_key,
            "file_type": "json",
            "sort_order": "asc",
        }
        response = await client.get(_FRED_BASE_URL, params=params)
        response.raise_for_status()
        payload = response.json()

        rows: list[tuple[Date, float | None]] = []
        for item in payload.get("observations", []):
            value_date = self._parse_date(item.get("date"))
            if value_date is None:
                continue
            rows.append((value_date, self.parse_value(item.get("value"))))
        return rows

    @staticmethod
    def parse_value(value: object) -> float | None:
        if value is None or value == ".":
            return None
        try:
            return float(str(value))
        except (TypeError, ValueError):
            return None

    @staticmethod
    def empty_snapshot() -> MacroSnapshot:
        return MacroSnapshot(cached_at=datetime.now(timezone.utc))

    @staticmethod
    def _parse_date(raw: object) -> Date | None:
        if not raw:
            return None
        try:
            return Date.fromisoformat(str(raw))
        except ValueError:
            return None

    @staticmethod
    def _latest_value(rows: list[tuple[Date, float | None]]) -> float | None:
        for _, value in reversed(rows):
            if value is not None:
                return value
        return None

    @staticmethod
    def _spread(ten_year: float | None, two_year: float | None) -> float | None:
        if ten_year is None or two_year is None:
            return None
        return ten_year - two_year

    @staticmethod
    def _cpi_yoy(rows: list[tuple[Date, float | None]]) -> float | None:
        valid = [(dt, value) for dt, value in rows if value is not None]
        if len(valid) < 13:
            return None
        latest = valid[-1][1]
        prior = valid[-13][1]
        if latest is None or prior in (None, 0):
            return None
        return ((latest - prior) / prior) * 100.0