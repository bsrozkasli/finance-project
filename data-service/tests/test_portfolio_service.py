import numpy as np
import pandas as pd
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.models.portfolio import OptimizationObjective, OptimizationRequest
from app.providers.base import OHLCVBar
from app.providers.market_data_resolver import MarketDataResolver
from app.services import portfolio_service
from app.services.portfolio_service import PortfolioService
from main import app


def _correlated_price_matrix(symbols: list[str], periods: int = 320, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    n_assets = len(symbols)

    base_vol = 0.012
    correlation = 0.65
    covariance = np.full((n_assets, n_assets), correlation * (base_vol**2))
    np.fill_diagonal(covariance, base_vol**2)

    drift = np.linspace(0.0003, 0.0009, n_assets)
    returns = rng.multivariate_normal(drift, covariance, size=periods)

    prices = 100 * np.exp(np.cumsum(returns, axis=0))
    index = pd.date_range(end=pd.Timestamp.now(tz="UTC"), periods=periods, freq="D")
    return pd.DataFrame(prices, index=index, columns=symbols)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def symbols() -> list[str]:
    return ["AAPL", "MSFT", "GOOGL", "AMZN"]


@pytest.fixture
def synthetic_prices(symbols: list[str]) -> pd.DataFrame:
    return _correlated_price_matrix(symbols)


@pytest.fixture
def mock_price_matrix(monkeypatch, synthetic_prices: pd.DataFrame):
    def _mock_fetch_price_matrix(cls, symbols, lookback_period):
        return synthetic_prices[symbols]

    monkeypatch.setattr(PortfolioService, "_fetch_price_matrix", classmethod(_mock_fetch_price_matrix))


@pytest.mark.asyncio
async def test_optimize_weights_sum_to_one(symbols: list[str], mock_price_matrix):
    request = OptimizationRequest(
        symbols=symbols,
        objective=OptimizationObjective.MAX_SHARPE,
        risk_free_rate=0.02,
        lookback_period=252,
        min_weight=0.0,
        max_weight=0.7,
    )

    result = await PortfolioService.optimize(request)
    assert pytest.approx(1.0, rel=1e-5, abs=1e-5) == sum(result.portfolio_metrics.weights.values())


@pytest.mark.asyncio
async def test_optimize_respects_weight_bounds(symbols: list[str], mock_price_matrix):
    request = OptimizationRequest(
        symbols=symbols,
        objective=OptimizationObjective.MAX_RETURN,
        risk_free_rate=0.01,
        lookback_period=252,
        min_weight=0.1,
        max_weight=0.45,
    )

    result = await PortfolioService.optimize(request)
    weights = list(result.portfolio_metrics.weights.values())

    assert all(weight >= request.min_weight - 1e-6 for weight in weights)
    assert all(weight <= request.max_weight + 1e-6 for weight in weights)


@pytest.mark.asyncio
async def test_min_volatility_objective_has_lower_volatility_than_max_sharpe(symbols: list[str], mock_price_matrix):
    shared: dict[str, Any] = dict(symbols=symbols, risk_free_rate=0.02, lookback_period=252, min_weight=0.0, max_weight=0.8)

    min_vol = await PortfolioService.optimize(
        OptimizationRequest(objective=OptimizationObjective.MIN_VOLATILITY, **shared)
    )
    max_sharpe = await PortfolioService.optimize(
        OptimizationRequest(objective=OptimizationObjective.MAX_SHARPE, **shared)
    )

    assert min_vol.portfolio_metrics.volatility <= max_sharpe.portfolio_metrics.volatility + 1e-6


@pytest.mark.asyncio
async def test_rebalance_check_endpoint_flags_sell_when_current_weight_exceeds_threshold(client: TestClient):
    payload = {
        "target_weights": {"AAPL": 0.30, "MSFT": 0.70},
        "current_weights": {"AAPL": 0.42, "MSFT": 0.58},
        "threshold": 0.05,
    }

    response = client.post("/api/v1/portfolio/rebalance-check", json=payload)

    assert response.status_code == 200
    actions = {row["symbol"]: row for row in response.json()["actions"]}
    assert actions["AAPL"]["action"] == "SELL"
    assert actions["AAPL"]["requires_rebalance"] is True


def _session_bar(days_ago: int, close: float) -> OHLCVBar:
    session = datetime.now(timezone.utc).date() - timedelta(days=days_ago)
    return OHLCVBar(
        timestamp=datetime(session.year, session.month, session.day, 5, tzinfo=timezone.utc),
        open=close, high=close, low=close, close=close, volume=1000,
    )


def _install_resolver(monkeypatch, scripted_provider, ohlcv: dict):
    provider = scripted_provider("fx-portfolio", ohlcv=ohlcv)
    monkeypatch.setattr(portfolio_service, "get_resolver", lambda: MarketDataResolver([provider]))
    return provider


def test_fetch_price_matrix_uses_resolver_closes_without_live_call(monkeypatch, scripted_provider):
    today = datetime.now(timezone.utc).date()
    provider = _install_resolver(monkeypatch, scripted_provider, {
        # Day 50 is outside the 45-day lookback; day 0 (today) is excluded by the end-exclusive window.
        "AAPL": [_session_bar(50, 1.0)] + [_session_bar(n, 104.0 - n) for n in (4, 3, 2, 1, 0)],
        "MSFT": [_session_bar(n, 204.0 - n) for n in (4, 3, 2, 1, 0)],
    })

    prices = PortfolioService._fetch_price_matrix([" aapl ", "MSFT"], lookback_days=45)

    expected = pd.DataFrame(
        {"AAPL": [100.0, 101.0, 102.0, 103.0], "MSFT": [200.0, 201.0, 202.0, 203.0]},
        index=pd.DatetimeIndex([pd.Timestamp(today - timedelta(days=n)) for n in (4, 3, 2, 1)], name="Date"),
    )
    pd.testing.assert_frame_equal(prices, expected, check_index_type=False, check_freq=False)
    assert [(call[1], call[2]) for call in provider.calls_for("ohlcv")] == [
        (("AAPL", "1d", "3mo"), {"adjusted": True}),
        (("MSFT", "1d", "3mo"), {"adjusted": True}),
    ]


def test_fetch_price_matrix_drops_symbol_without_history(monkeypatch, scripted_provider):
    _install_resolver(monkeypatch, scripted_provider, {
        "AAPL": [_session_bar(n, 100.0 + n) for n in (4, 3, 2, 1)],
        "MSFT": [],
    })

    prices = PortfolioService._fetch_price_matrix(["AAPL", "MSFT"], lookback_days=45)

    assert list(prices.columns) == ["AAPL"]


def test_fetch_price_matrix_raises_when_no_symbol_has_history(monkeypatch, scripted_provider):
    _install_resolver(monkeypatch, scripted_provider, {})

    with pytest.raises(ValueError, match="No historical price data"):
        PortfolioService._fetch_price_matrix(["AAPL", "MSFT"], lookback_days=45)
