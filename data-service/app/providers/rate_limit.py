"""Detect a provider rate limit and carry it as ``RateLimitedError`` (decision 2026-10-26, D-2)."""

from __future__ import annotations

import re
from collections.abc import Iterable, Mapping
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx
import yfinance.exceptions

from app.errors import RateLimitedError

_RATE_LIMIT_MESSAGE = "too many requests"
_WHOLE_SECONDS = re.compile(r"\d+")


def _is_finnhub_429(exc: BaseException) -> bool:
    try:
        from finnhub.exceptions import FinnhubAPIException
    except ImportError:  # pragma: no cover - finnhub is a declared dependency
        return False
    return isinstance(exc, FinnhubAPIException) and getattr(exc, "status_code", None) == 429


def is_rate_limited(exc: BaseException) -> bool:
    """True for a provider 429. The text match reads only the exception's own message, never a response body."""
    if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code == 429:
        return True
    yf_rate_limit = getattr(yfinance.exceptions, "YFRateLimitError", None)
    if yf_rate_limit is not None and isinstance(exc, yf_rate_limit):
        return True
    if _is_finnhub_429(exc):
        return True
    return _RATE_LIMIT_MESSAGE in str(exc).lower()


def parse_retry_after(headers: Mapping[str, str] | None) -> int | None:
    """Whole seconds from a ``Retry-After`` header (seconds or HTTP date); ``None`` if absent or unparseable."""
    if not headers:
        return None
    raw = headers.get("Retry-After")
    if raw is None:
        raw = headers.get("retry-after")
    if raw is None:
        return None
    value = str(raw).strip()
    if _WHOLE_SECONDS.fullmatch(value):
        return int(value)
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError, IndexError):
        return None
    if when is None:
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=timezone.utc)
    return max(0, int((when - datetime.now(timezone.utc)).total_seconds()))


def raise_if_rate_limited(exc: BaseException, provider: str) -> None:
    """Raise ``RateLimitedError`` (chained to ``exc``) when ``exc`` is a provider rate limit; otherwise return."""
    if not is_rate_limited(exc):
        return
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    raise RateLimitedError(provider=provider, retry_after=parse_retry_after(headers)) from exc


def merge_rate_limited(errors: Iterable[RateLimitedError]) -> RateLimitedError:
    """One error for several limited providers: the first provider, the largest known ``retry_after``."""
    items = list(errors)
    known = [error.retry_after for error in items if error.retry_after is not None]
    return RateLimitedError(provider=items[0].provider, retry_after=max(known) if known else None)


__all__ = [
    "is_rate_limited",
    "merge_rate_limited",
    "parse_retry_after",
    "raise_if_rate_limited",
]
