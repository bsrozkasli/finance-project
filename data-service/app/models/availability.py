"""Explicit evidence-availability state shared by analytics responses (C0a).

Legacy numeric and label fields keep their historical defaults; this object
tells consumers whether those values are real evidence.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator

SectionStatus = Literal["available", "unavailable", "insufficient", "unparseable"]

_REASON_CODE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")


class SectionAvailability(BaseModel):
    model_config = ConfigDict(frozen=True)

    status: SectionStatus
    unavailable_reason: str | None = None

    @model_validator(mode="after")
    def _reason_matches_status(self) -> "SectionAvailability":
        if self.status == "available":
            if self.unavailable_reason is not None:
                raise ValueError("an available section has no unavailable_reason")
        elif self.unavailable_reason is None or not _REASON_CODE.fullmatch(self.unavailable_reason):
            raise ValueError("a non-available section needs a snake_case unavailable_reason code")
        return self

    @classmethod
    def available(cls) -> "SectionAvailability":
        return cls(status="available")

    @classmethod
    def unavailable(cls, reason: str) -> "SectionAvailability":
        return cls(status="unavailable", unavailable_reason=reason)

    @classmethod
    def insufficient(cls, reason: str) -> "SectionAvailability":
        return cls(status="insufficient", unavailable_reason=reason)

    @classmethod
    def unparseable(cls, reason: str) -> "SectionAvailability":
        return cls(status="unparseable", unavailable_reason=reason)
