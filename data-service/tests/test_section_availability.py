"""Invariants of the explicit evidence-availability value object (C0a)."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.models.availability import SectionAvailability


def test_available_has_no_reason():
    assert SectionAvailability.available().model_dump() == {"status": "available", "unavailable_reason": None}


@pytest.mark.parametrize(
    ("factory", "status"),
    [
        (SectionAvailability.unavailable, "unavailable"),
        (SectionAvailability.insufficient, "insufficient"),
        (SectionAvailability.unparseable, "unparseable"),
    ],
)
def test_non_available_states_carry_their_reason(factory, status):
    assert factory("no_articles_in_lookback").model_dump() == {
        "status": status,
        "unavailable_reason": "no_articles_in_lookback",
    }


def test_available_with_reason_is_rejected():
    with pytest.raises(ValidationError):
        SectionAvailability(status="available", unavailable_reason="no_articles_in_lookback")


def test_unavailable_without_reason_is_rejected():
    with pytest.raises(ValidationError):
        SectionAvailability(status="unavailable")


def test_unknown_status_is_rejected():
    with pytest.raises(ValidationError):
        SectionAvailability(status="partial", unavailable_reason="some_reason")


def test_reason_must_be_a_snake_case_code():
    with pytest.raises(ValidationError):
        SectionAvailability.unavailable("token=secret-123 upstream failed")


def test_value_object_is_immutable():
    availability = SectionAvailability.available()
    with pytest.raises(ValidationError):
        availability.status = "unavailable"
