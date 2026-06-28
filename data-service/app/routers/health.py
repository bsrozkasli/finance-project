"""
Health check endpoints for provider status monitoring.

These endpoints expose the live health state of each market data provider
so that the MarketDataResolver can be externally observed, and so
integration tests / ops tooling can verify provider availability.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.providers.base import ProviderHealth

router = APIRouter(prefix="/health", tags=["health"])


def _get_resolver():
    """Lazy import to avoid circular dependency at module load time."""
    from app.dependencies import get_resolver
    return get_resolver()


@router.get("/provider/yahoo", response_model=dict, summary="Yahoo Finance provider health")
def health_yahoo() -> dict:
    """Check the health of the Yahoo Finance (yfinance) provider."""
    resolver = _get_resolver()
    health: ProviderHealth | None = resolver.get_provider_health("yahoo")
    if health is None:
        raise HTTPException(status_code=404, detail="Provider 'yahoo' not registered")
    return _health_to_dict(health)


@router.get("/provider/tiingo", response_model=dict, summary="Tiingo provider health")
def health_tiingo() -> dict:
    """Check the health of the Tiingo EOD fallback provider."""
    resolver = _get_resolver()
    health: ProviderHealth | None = resolver.get_provider_health("tiingo")
    if health is None:
        raise HTTPException(status_code=404, detail="Provider 'tiingo' not registered")
    return _health_to_dict(health)


@router.get("/provider/finnhub", response_model=dict, summary="Finnhub provider health")
def health_finnhub() -> dict:
    """Check the health of the Finnhub news/sentiment provider."""
    resolver = _get_resolver()
    health: ProviderHealth | None = resolver.get_provider_health("finnhub")
    if health is None:
        raise HTTPException(status_code=404, detail="Provider 'finnhub' not registered")
    return _health_to_dict(health)


@router.get("/providers", response_model=list, summary="All providers health")
def health_all_providers() -> list:
    """Return the health status of all registered providers."""
    resolver = _get_resolver()
    return [_health_to_dict(h) for h in resolver.get_all_provider_health()]


@router.get("/metrics", response_model=dict, summary="Resolver observability metrics")
def resolver_metrics() -> dict:
    """Return fallback/success/error counters for the MarketDataResolver."""
    resolver = _get_resolver()
    return resolver.get_observability_metrics()


def _health_to_dict(health: ProviderHealth) -> dict:
    return {
        "provider": health.provider_name,
        "status": health.status.value,
        "latency_ms": health.latency_ms,
        "error_rate": health.error_rate,
        "consecutive_failures": health.consecutive_failures,
        "last_error": health.last_error,
        "last_checked": health.last_checked.isoformat() if health.last_checked else None,
    }
