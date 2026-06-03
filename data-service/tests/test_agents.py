from unittest.mock import MagicMock
import pytest

from app.agents.fundamentals_analyst import run_fundamentals_analyst
from app.agents.technical_analyst import run_technical_analyst
from app.agents.risk_analyst import run_risk_analyst
from app.agents.bull_researcher import run_bull_researcher
from app.agents.bear_researcher import run_bear_researcher
from app.agents.portfolio_manager import run_portfolio_manager


@pytest.fixture
def mock_llm():
    return MagicMock()


def create_mock_response(content, tokens=50):
    response = MagicMock()
    response.content = content
    response.response_metadata = {"token_usage": {"total_tokens": tokens}}
    return response


def test_run_fundamentals_analyst(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("Strong fundamentals analysis.", 42)
    content, tokens = run_fundamentals_analyst(mock_llm, "AAPL", '{"fundamentals": {"roe": 20.0}}')
    
    assert content == "Strong fundamentals analysis."
    assert tokens == 42
    mock_llm.invoke.assert_called_once()


def test_run_technical_analyst(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("Bullish technical indicators.", 35)
    content, tokens = run_technical_analyst(mock_llm, "AAPL", '{"technical": {"rsi": 55.0}}')
    
    assert content == "Bullish technical indicators."
    assert tokens == 35
    mock_llm.invoke.assert_called_once()


def test_run_risk_analyst(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("Low risk profile.", 28)
    content, tokens = run_risk_analyst(mock_llm, "AAPL", '{"risk": {"beta": 1.1}}')
    
    assert content == "Low risk profile."
    assert tokens == 28
    mock_llm.invoke.assert_called_once()


def test_run_bull_researcher(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("Bull thesis description.", 60)
    content, tokens = run_bull_researcher(mock_llm, "AAPL", "Some context info")
    
    assert content == "Bull thesis description."
    assert tokens == 60
    mock_llm.invoke.assert_called_once()


def test_run_bear_researcher(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("Bear thesis description.", 15)
    content, tokens = run_bear_researcher(mock_llm, "AAPL", "Some context info")
    
    assert content == "Bear thesis description."
    assert tokens == 15
    mock_llm.invoke.assert_called_once()


def test_run_portfolio_manager_json(mock_llm):
    pm_json = '{"decision": "BUY", "confidence": 85, "reasoning": "Excellent risk reward."}'
    mock_llm.invoke.return_value = create_mock_response(pm_json, 120)
    decision, reasoning, confidence, tokens = run_portfolio_manager(mock_llm, "AAPL", "Debate context")
    
    assert decision == "BUY"
    assert confidence == 85
    assert reasoning == "Excellent risk reward."
    assert tokens == 120
    mock_llm.invoke.assert_called_once()


def test_run_portfolio_manager_fallback_buy(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("This is definitely a BUY decision for AAPL.", 100)
    decision, reasoning, confidence, tokens = run_portfolio_manager(mock_llm, "AAPL", "Debate context")
    
    assert decision == "BUY"
    assert confidence == 70
    assert reasoning == "This is definitely a BUY decision for AAPL."
    assert tokens == 100


def test_run_portfolio_manager_fallback_sell(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("We should SELL this stock now.", 90)
    decision, reasoning, confidence, tokens = run_portfolio_manager(mock_llm, "AAPL", "Debate context")
    
    assert decision == "SELL"
    assert confidence == 70
    assert reasoning == "We should SELL this stock now."
    assert tokens == 90


def test_run_portfolio_manager_fallback_hold(mock_llm):
    mock_llm.invoke.return_value = create_mock_response("Neither buy nor sell makes sense.", 80)
    decision, reasoning, confidence, tokens = run_portfolio_manager(mock_llm, "AAPL", "Debate context")
    
    assert decision == "HOLD"
    assert confidence == 50
    assert reasoning == "Neither buy nor sell makes sense."
    assert tokens == 80
