from unittest.mock import MagicMock
import pytest

from app.models.agent_analysis import AgentAnalysisRequest
from app.trading_agents.metrics_trading_graph import MetricsTradingAgentsGraph


def create_mock_response(content, tokens=10):
    response = MagicMock()
    response.content = content
    response.response_metadata = {"token_usage": {"total_tokens": tokens}}
    return response


def test_metrics_trading_graph_propagate():
    # 1. Arrange
    graph = MetricsTradingAgentsGraph()
    mock_llm = MagicMock()
    graph._llm = mock_llm

    # Setup the mock responses for each agent in order:
    # 1. Fundamentals analyst
    # 2. Technical analyst
    # 3. Risk analyst
    # 4. Bull researcher
    # 5. Bear researcher
    # 6. Portfolio manager (expects JSON or fallback text)
    responses = [
        create_mock_response("Fundamentals: Strong balance sheet.", 15),
        create_mock_response("Technical: Overbought RSI.", 20),
        create_mock_response("Risk: High beta.", 25),
        create_mock_response("Bull Case: Strong growth drivers.", 30),
        create_mock_response("Bear Case: Competition risk.", 35),
        create_mock_response('{"decision": "BUY", "confidence": 80, "reasoning": "Overall bullish setup."}', 40)
    ]
    mock_llm.invoke.side_effect = responses

    request = AgentAnalysisRequest(
        ticker="AAPL",
        price=175.50,
        metrics={
            "fundamentals": {"roe": 22.0},
            "technical": {"rsi": 71.0}
        },
        sentiment={
            "score": 75.0
        }
    )

    # 2. Act
    response = graph.propagate(request)

    # 3. Assert
    assert response.decision == "BUY"
    assert response.confidence == 80
    assert response.fundamental_summary == "Fundamentals: Strong balance sheet."
    assert response.technical_summary == "Technical: Overbought RSI."
    assert response.risk_summary == "Risk: High beta."
    assert response.bull_case == "Bull Case: Strong growth drivers."
    assert response.bear_case == "Bear Case: Competition risk."
    assert response.portfolio_manager_reasoning == "Overall bullish setup."
    assert response.token_usage == 15 + 20 + 25 + 30 + 35 + 40  # 165 tokens

    # Ensure the LLM was called 6 times
    assert mock_llm.invoke.call_count == 6


def test_metrics_trading_graph_propagate_failure_increments_counter():
    graph = MetricsTradingAgentsGraph()
    mock_llm = MagicMock()
    mock_llm.invoke.side_effect = Exception("OpenAI API Error")
    graph._llm = mock_llm

    request = AgentAnalysisRequest(
        ticker="AAPL",
        price=175.50,
        metrics={},
        sentiment={}
    )

    # We expect propagate to raise the exception, and increment AGENT_FAILURES counter
    with pytest.raises(Exception) as exc_info:
        graph.propagate(request)

    assert "OpenAI API Error" in str(exc_info.value)
