"""Typed analytics failures that routers translate into explicit HTTP statuses."""


class InsufficientDataError(ValueError):
    """The request is valid, but the available evidence is too short or sparse to calculate."""


class DependencyUnavailableError(RuntimeError):
    """A required provider credential or service is unavailable and no fallback exists."""


_MIN_RETRY_AFTER_SECONDS = 1
_MAX_RETRY_AFTER_SECONDS = 3600


class RateLimitedError(RuntimeError):
    """An upstream market-data provider rate limited the request (HTTP 429 at the boundary).

    ``retry_after`` is the provider's wait hint in seconds, clamped to 1..3600, or ``None`` when unknown.
    """

    def __init__(self, provider: str | None = None, retry_after: float | None = None) -> None:
        super().__init__(f"Market data provider rate limited: {provider or 'unknown'}")
        self.provider = provider
        self.retry_after = (
            None if retry_after is None else min(max(retry_after, _MIN_RETRY_AFTER_SECONDS), _MAX_RETRY_AFTER_SECONDS)
        )
