from __future__ import annotations

from app.models.agent_analysis import AgentAnalysisRequest, AgentAnalysisResponse
from app.trading_agents.metrics_trading_graph import MetricsTradingAgentsGraph


class AgentAnalysisService:
    """Facade over MetricsTradingAgentsGraph.propagate()."""

    _graph: MetricsTradingAgentsGraph | None = None

    @classmethod
    def _get_graph(cls) -> MetricsTradingAgentsGraph:
        if cls._graph is None:
            cls._graph = MetricsTradingAgentsGraph()
        return cls._graph

    @classmethod
    def analyze(cls, request: AgentAnalysisRequest) -> AgentAnalysisResponse:
        return cls._get_graph().propagate(request)
