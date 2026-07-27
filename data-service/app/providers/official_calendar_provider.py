from __future__ import annotations

import logging
import re
from datetime import date as Date, datetime, timezone

import httpx

from app.models.market_calendar import EconomicEvent

logger = logging.getLogger(__name__)

_MONTHS = {name: index for index, name in enumerate(("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"), 1)}


class OfficialCalendarProvider:
    BLS_ICS = "https://www.bls.gov/schedule/news_release/bls.ics"
    FOMC_URL = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm"
    TCMB_URL = "https://www.tcmb.gov.tr/wps/wcm/connect/en/tcmb+en/main+menu/announcements/calendar"

    def __init__(self, timeout: float = 15.0) -> None:
        self.timeout = timeout

    def get_events(self, from_date: Date, to_date: Date) -> list[EconomicEvent]:
        events: list[EconomicEvent] = []
        events.extend(self._fetch_bls(from_date, to_date))
        events.extend(self._fetch_fomc(from_date, to_date))
        events.extend(self._fetch_tcmb(from_date, to_date))
        return events

    def _fetch_bls(self, from_date: Date, to_date: Date) -> list[EconomicEvent]:
        try:
            content = self._get(self.BLS_ICS)
            events: list[EconomicEvent] = []
            for block in content.split("BEGIN:VEVENT")[1:]:
                summary = self._ics_value(block, "SUMMARY")
                if "Employment Situation" not in summary:
                    continue
                raw_date = self._ics_value(block, "DTSTART")
                timestamp = datetime.strptime(raw_date[:15], "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)
                if from_date <= timestamp.date() <= to_date:
                    events.append(EconomicEvent(event="US Nonfarm Payrolls (Employment Situation)", date=timestamp, country="US", impact="CRITICAL", event_type="NFP", currency="USD", source="BLS", source_url=self.BLS_ICS))
            return events
        except Exception as exc:
            logger.warning("BLS release calendar unavailable: %s", exc)
            return []

    def _fetch_fomc(self, from_date: Date, to_date: Date) -> list[EconomicEvent]:
        try:
            content = self._get(self.FOMC_URL)
            events: list[EconomicEvent] = []
            pattern = r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:[-–]\d{1,2})?,?\s+(20\d{2})"
            for month, day, year in re.findall(pattern, content):
                event_date = Date(int(year), _MONTHS[month], int(day))
                if from_date <= event_date <= to_date:
                    events.append(EconomicEvent(event="FOMC Meeting / Rate Decision", date=datetime.combine(event_date, datetime.min.time(), tzinfo=timezone.utc), country="US", impact="CRITICAL", event_type="FOMC", currency="USD", source="Federal Reserve", source_url=self.FOMC_URL))
            return self._dedupe(events)
        except Exception as exc:
            logger.warning("Federal Reserve calendar unavailable: %s", exc)
            return []

    def _fetch_tcmb(self, from_date: Date, to_date: Date) -> list[EconomicEvent]:
        try:
            content = self._get(self.TCMB_URL)
            events: list[EconomicEvent] = []
            pattern = r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})"
            for month, day, year in re.findall(pattern, content):
                event_date = Date(int(year), _MONTHS[month], int(day))
                if from_date <= event_date <= to_date:
                    events.append(EconomicEvent(event="TCMB Monetary Policy Committee Decision", date=datetime.combine(event_date, datetime.min.time(), tzinfo=timezone.utc), country="TR", impact="CRITICAL", event_type="TCMB_RATE_DECISION", currency="TRY", source="TCMB", source_url=self.TCMB_URL))
            return self._dedupe(events)
        except Exception as exc:
            logger.warning("TCMB calendar unavailable: %s", exc)
            return []

    def _get(self, url: str) -> str:
        with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            return response.text

    @staticmethod
    def _ics_value(block: str, key: str) -> str:
        match = re.search(rf"(?:^|\n){key}(?:;[^:]*)?:(.*)", block)
        return match.group(1).strip() if match else ""

    @staticmethod
    def _dedupe(events: list[EconomicEvent]) -> list[EconomicEvent]:
        seen: set[tuple[str, str | None]] = set()
        result: list[EconomicEvent] = []
        for event in events:
            key = (event.event, event.date.isoformat() if event.date else None)
            if key not in seen:
                seen.add(key)
                result.append(event)
        return result