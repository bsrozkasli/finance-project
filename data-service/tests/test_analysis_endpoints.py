import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np

from main import app


@pytest.fixture
def client():
    return TestClient(app)


@patch('app.routers.analysis.yf.Ticker')
def test_get_patterns_endpoint_smoke_test(mock_ticker_class, client):
    """Smoke test for GET /patterns/{symbol} endpoint."""
    # Mock yfinance response
    mock_ticker = MagicMock()
    mock_ticker_class.return_value = mock_ticker
    
    # Create sample historical data
    dates = pd.date_range(start='2024-01-01', periods=100, freq='D')
    history_data = pd.DataFrame({
        'Open': np.linspace(100, 150, 100),
        'High': np.linspace(102, 152, 100),
        'Low': np.linspace(98, 148, 100),
        'Close': np.linspace(101, 151, 100),
        'Volume': np.full(100, 1000000),
    }, index=dates)
    history_data.index.name = 'Date'
    
    mock_ticker.history.return_value = history_data
    
    # Call the endpoint
    response = client.get("/api/v1/patterns/AAPL")
    
    # Assertions
    assert response.status_code == 200
    data = response.json()
    
    assert data['symbol'] == 'AAPL'
    assert data['interval'] == '1d'
    assert isinstance(data['patterns'], list)
    assert 'detected_at' in data
    
    # Check that all patterns have valid structure
    for pattern in data['patterns']:
        assert 'pattern_type' in pattern
        assert 'direction' in pattern
        assert 0.0 <= pattern['confidence'] <= 1.0
        assert 'start_index' in pattern
        assert 'end_index' in pattern
        assert 'description' in pattern


@patch('app.routers.analysis.yf.Ticker')
def test_get_patterns_endpoint_with_custom_interval(mock_ticker_class, client):
    """Test GET /patterns/{symbol} endpoint with custom interval."""
    mock_ticker = MagicMock()
    mock_ticker_class.return_value = mock_ticker
    
    # Create sample historical data
    dates = pd.date_range(start='2024-01-01', periods=100, freq='h')
    history_data = pd.DataFrame({
        'Open': np.linspace(100, 150, 100),
        'High': np.linspace(102, 152, 100),
        'Low': np.linspace(98, 148, 100),
        'Close': np.linspace(101, 151, 100),
        'Volume': np.full(100, 1000000),
    }, index=dates)
    history_data.index.name = 'Datetime'
    
    mock_ticker.history.return_value = history_data
    
    # Call the endpoint with custom parameters
    response = client.get("/api/v1/patterns/AAPL?interval=1h&range=1mo")
    
    # Assertions
    assert response.status_code == 200
    data = response.json()
    
    assert data['symbol'] == 'AAPL'
    assert data['interval'] == '1h'
    assert isinstance(data['patterns'], list)



@patch('app.routers.analysis.yf.Ticker')
def test_get_patterns_endpoint_no_data(mock_ticker_class, client):
    """Test GET /patterns/{symbol} endpoint when no data is available."""
    mock_ticker = MagicMock()
    mock_ticker_class.return_value = mock_ticker
    mock_ticker.history.return_value = None
    
    # Call the endpoint
    response = client.get("/api/v1/patterns/INVALID")
    
    # Should return 404 error
    assert response.status_code == 404


@patch('app.routers.analysis.yf.Ticker')
def test_get_patterns_insufficient_data(mock_ticker_class, client):
    """Test GET /patterns/{symbol} endpoint with insufficient data."""
    mock_ticker = MagicMock()
    mock_ticker_class.return_value = mock_ticker
    
    # Create minimal historical data (less than minimum required)
    dates = pd.date_range(start='2024-01-01', periods=30, freq='D')
    history_data = pd.DataFrame({
        'Open': np.linspace(100, 110, 30),
        'High': np.linspace(102, 112, 30),
        'Low': np.linspace(98, 108, 30),
        'Close': np.linspace(101, 111, 30),
        'Volume': np.full(30, 1000000),
    }, index=dates)
    history_data.index.name = 'Date'
    
    mock_ticker.history.return_value = history_data
    
    # Call the endpoint
    response = client.get("/api/v1/patterns/AAPL")
    
    # Should return 200 with empty patterns list
    assert response.status_code == 200
    data = response.json()
    
    assert data['symbol'] == 'AAPL'
    assert data['patterns'] == []
    assert data['dominant_pattern'] is None


@patch('app.routers.analysis.yf.Ticker')
def test_get_technical_analysis_insufficient_candles_returns_422(mock_ticker_class, client):
    mock_ticker = MagicMock()
    mock_ticker_class.return_value = mock_ticker

    dates = pd.date_range(start='2024-01-01', periods=29, freq='D')
    history_data = pd.DataFrame({
        'Open': np.linspace(100, 110, 29),
        'High': np.linspace(102, 112, 29),
        'Low': np.linspace(98, 108, 29),
        'Close': np.linspace(101, 111, 29),
        'Volume': np.full(29, 1000000),
    }, index=dates)
    history_data.index.name = 'Date'
    mock_ticker.history.return_value = history_data

    response = client.get("/api/v1/technical/AAPL?interval=1d&range=1mo")

    assert response.status_code == 422
    assert "At least 30 candles" in response.json()["detail"]


@patch('app.routers.analysis.yf.Ticker')
def test_get_technical_signals_insufficient_candles_returns_422(mock_ticker_class, client):
    mock_ticker = MagicMock()
    mock_ticker_class.return_value = mock_ticker

    dates = pd.date_range(start='2024-01-01', periods=29, freq='D')
    history_data = pd.DataFrame({
        'Open': np.linspace(100, 110, 29),
        'High': np.linspace(102, 112, 29),
        'Low': np.linspace(98, 108, 29),
        'Close': np.linspace(101, 111, 29),
        'Volume': np.full(29, 1000000),
    }, index=dates)
    history_data.index.name = 'Date'
    mock_ticker.history.return_value = history_data

    response = client.get("/api/v1/technical/AAPL/signals?interval=1d&range=1mo")

    assert response.status_code == 422
    assert "At least 30 candles" in response.json()["detail"]
