"""Metrics-only multi-agent graph aligned with TradingAgents.propagate() contract."""

from __future__ import annotations

import json
import logging
import time

from prometheus_client import Counter, Histogram

from app.agents.bear_researcher import run_bear_researcher
from app.agents.bull_researcher import run_bull_researcher
from app.agents.fundamentals_analyst import run_fundamentals_analyst
from app.agents.portfolio_manager import run_portfolio_manager
from app.agents.risk_analyst import run_risk_analyst
from app.agents.technical_analyst import run_technical_analyst
from app.config import settings
from app.models.agent_analysis import AgentAnalysisRequest, AgentAnalysisResponse

logger = logging.getLogger(__name__)

AGENT_LATENCY = Histogram(
    "agent_analysis_latency_seconds",
    "End-to-end agent analysis latency",
    buckets=(1, 5, 15, 30, 60, 120, 300),
)
AGENT_FAILURES = Counter("agent_analysis_failures_total", "Agent analysis failures")
AGENT_TOKEN_USAGE = Counter("agent_azure_tokens_total", "Estimated Azure OpenAI tokens")


class MetricsTradingAgentsGraph:
    """LangGraph-style sequential pipeline using pre-calculated metrics only."""

    def __init__(self):
        self._llm = None

    def _llm_client(self):
        if self._llm is not None:
            return self._llm
        try:
            from langchain_openai import AzureChatOpenAI

            self._llm = AzureChatOpenAI(
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_deployment=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                temperature=0.2,
                max_tokens=settings.LLM_MAX_TOKENS,
            )
            return self._llm
        except Exception as exc:
            logger.error("Azure OpenAI client init failed: %s", exc)
            raise

    def propagate(self, request: AgentAnalysisRequest) -> AgentAnalysisResponse:
        """Run Fundamental → Technical → Risk → Bull → Bear → Portfolio Manager."""
        start = time.perf_counter()
        total_tokens = 0
        try:
            llm = self._llm_client()
            ticker = request.ticker.upper()
            metrics_json = json.dumps(
                {"price": request.price, "metrics": request.metrics, "sentiment": request.sentiment, "macro_context": request.macro_context},
                indent=2,
            )

            fundamental, t1 = run_fundamentals_analyst(llm, ticker, metrics_json)
            total_tokens += t1
            technical, t2 = run_technical_analyst(llm, ticker, metrics_json)
            total_tokens += t2
            risk, t3 = run_risk_analyst(llm, ticker, metrics_json)
            total_tokens += t3

            context = (
                f"Fundamental:\n{fundamental}\n\nTechnical:\n{technical}\n\nRisk:\n{risk}\n"
                f"Sentiment:\n{json.dumps(request.sentiment)}\nMacro context:\n{json.dumps(request.macro_context)}"
            )
            bull, t4 = run_bull_researcher(llm, ticker, context)
            total_tokens += t4
            bear, t5 = run_bear_researcher(llm, ticker, context)
            total_tokens += t5

            debate = f"Bull:\n{bull}\n\nBear:\n{bear}\n\nPrior summaries:\n{context}"
            decision, reasoning, confidence, t6 = run_portfolio_manager(llm, ticker, debate)
            total_tokens += t6

            AGENT_TOKEN_USAGE.inc(total_tokens)
            return AgentAnalysisResponse(
                decision=decision,
                confidence=confidence,
                fundamental_summary=fundamental,
                technical_summary=technical,
                risk_summary=risk,
                bull_case=bull,
                bear_case=bear,
                portfolio_manager_reasoning=reasoning,
                token_usage=total_tokens,
            )
        except Exception:
            AGENT_FAILURES.inc()
            raise
        finally:
            AGENT_LATENCY.observe(time.perf_counter() - start)
