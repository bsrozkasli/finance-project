from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from app.models.agent_analysis import AgentAnalysisResponse


client = TestClient(app)


def test_agent_analysis_requires_azure_config():
    with patch("app.routers.agent_analysis.settings") as mock_settings:
        mock_settings.AZURE_OPENAI_API_KEY = ""
        mock_settings.AZURE_OPENAI_DEPLOYMENT_NAME = ""
        response = client.post(
            "/api/v1/agent-analysis",
            json={
                "ticker": "AAPL",
                "price": 150.0,
                "metrics": {"fundamentals": {"roe": 20.0}},
                "sentiment": {"sentiment_score": 60},
            },
        )
    assert response.status_code == 503


def test_agent_analysis_returns_response_when_service_succeeds():
    fake = AgentAnalysisResponse(
        decision="BUY",
        confidence=85,
        fundamental_summary="Strong fundamentals.",
        technical_summary="Bullish momentum.",
        risk_summary="Moderate risk.",
        bull_case="Growth story.",
        bear_case="Valuation risk.",
        portfolio_manager_reasoning="Buy on quality.",
        token_usage=100,
    )
    with patch("app.routers.agent_analysis.settings") as mock_settings:
        mock_settings.AZURE_OPENAI_API_KEY = "key"
        mock_settings.AZURE_OPENAI_DEPLOYMENT_NAME = "gpt"
        with patch(
            "app.routers.agent_analysis.AgentAnalysisService.analyze",
            return_value=fake,
        ):
            response = client.post(
                "/api/v1/agent-analysis",
                json={
                    "ticker": "AAPL",
                    "price": 150.0,
                    "metrics": {"technical": {"rsi": 55.0}},
                    "sentiment": {},
                },
            )
    assert response.status_code == 200
    body = response.json()
    assert body["decision"] == "BUY"
    assert body["confidence"] == 85
