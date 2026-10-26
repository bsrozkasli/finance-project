"""Rate-limit detection, Retry-After parsing and the typed error (no live HTTP)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from email.utils import format_datetime
from types import SimpleNamespace

import httpx
import pytest
from yfinance.exceptions import YFRateLimitError

from app.errors import DependencyUnavailableError, InsufficientDataError, RateLimitedError
from app.providers import rate_limit
from app.providers.rate_limit import is_rate_limited, merge_rate_limited, parse_retry_after


def _http_error(status: int, body: str = "", headers: dict | None = None) -> httpx.HTTPStatusError:
    request = httpx.Request("GET", "https://example.test/x")
    response = httpx.Response(status, text=body, headers=headers or {}, request=request)
    return httpx.HTTPStatusError("provider said no", request=request, response=response)


def test_typed_error_is_unrelated_to_existing_errors():
    error = RateLimitedError(provider="yahoo", retry_after=30)
    assert isinstance(error, RuntimeError)
    assert not isinstance(error, (InsufficientDataError, DependencyUnavailableError))
    assert error.provider == "yahoo"
    assert error.retry_after == 30


@pytest.mark.parametrize(
    ("given", "expected"),
    [(None, None), (0, 1), (0.2, 1), (30, 30), (3600, 3600), (999999, 3600), (-5, 1)],
)
def test_retry_after_is_clamped_to_one_through_3600(given, expected):
    assert RateLimitedError(provider=None, retry_after=given).retry_after == expected


def test_http_429_is_rate_limited_and_other_statuses_are_not():
    assert is_rate_limited(_http_error(429))
    assert not is_rate_limited(_http_error(500))
    assert not is_rate_limited(_http_error(404))


def test_yfinance_rate_limit_error_is_detected():
    assert is_rate_limited(YFRateLimitError())


def test_missing_yfinance_class_does_not_break_detection(monkeypatch):
    monkeypatch.delattr(rate_limit.yfinance.exceptions, "YFRateLimitError")
    assert not is_rate_limited(RuntimeError("something else"))
    assert not is_rate_limited(_http_error(500))


def test_finnhub_api_exception_with_429_is_detected():
    from finnhub.exceptions import FinnhubAPIException

    response = SimpleNamespace(status_code=429, text="slow down", json=lambda: {"error": "API limit reached"})
    assert is_rate_limited(FinnhubAPIException(response))
    response_500 = SimpleNamespace(status_code=500, text="boom", json=lambda: {"error": "boom"})
    assert not is_rate_limited(FinnhubAPIException(response_500))


def test_message_fallback_matches_the_exceptions_own_message():
    assert is_rate_limited(RuntimeError("HTTP Error 429: Too Many Requests"))
    assert not is_rate_limited(RuntimeError("fine"))


def test_message_fallback_never_reads_a_response_body():
    error = _http_error(500, body="Too Many Requests in the article text")
    assert not is_rate_limited(error)


def test_integer_seconds_header():
    assert parse_retry_after({"Retry-After": "30"}) == 30
    assert parse_retry_after(httpx.Headers({"retry-after": " 7 "})) == 7
    assert parse_retry_after({"retry-after": "12"}) == 12


def test_http_date_header_becomes_delta_seconds():
    when = datetime.now(timezone.utc) + timedelta(seconds=90)
    parsed = parse_retry_after({"Retry-After": format_datetime(when, usegmt=True)})
    assert parsed is not None and 85 <= parsed <= 91


def test_past_http_date_is_zero():
    when = datetime.now(timezone.utc) - timedelta(hours=1)
    assert parse_retry_after({"Retry-After": format_datetime(when, usegmt=True)}) == 0


@pytest.mark.parametrize("value", ["", "soon", "-5", "1.5e3x", "Tue, 99 Foo 2026"])
def test_garbage_or_negative_header_is_none(value):
    assert parse_retry_after({"Retry-After": value}) is None


def test_absent_header_and_headers_are_none():
    assert parse_retry_after({}) is None
    assert parse_retry_after(None) is None


def test_huge_value_is_passed_through_and_clamped_by_the_error():
    assert parse_retry_after({"Retry-After": "99999999"}) == 99999999
    assert RateLimitedError(provider="tiingo", retry_after=99999999).retry_after == 3600


def test_merge_takes_max_retry_after_and_first_provider():
    merged = merge_rate_limited([
        RateLimitedError(provider="yahoo", retry_after=None),
        RateLimitedError(provider="tiingo", retry_after=45),
        RateLimitedError(provider="finnhub", retry_after=20),
    ])
    assert (merged.provider, merged.retry_after) == ("yahoo", 45)
    assert merge_rate_limited([RateLimitedError(provider="yahoo")]).retry_after is None
