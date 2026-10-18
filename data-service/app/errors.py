"""Typed analytics failures that routers translate into explicit HTTP statuses."""


class InsufficientDataError(ValueError):
    """The request is valid, but the available evidence is too short or sparse to calculate."""


class DependencyUnavailableError(RuntimeError):
    """A required provider credential or service is unavailable and no fallback exists."""
