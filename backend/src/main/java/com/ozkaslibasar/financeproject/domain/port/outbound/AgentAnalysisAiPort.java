package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.AgentMetricSnapshot;
import com.ozkaslibasar.financeproject.domain.model.AgentSentimentSnapshot;

import java.util.Optional;

/**
 * Outbound port for the FastAPI / TradingAgents reasoning layer.
 */
public interface AgentAnalysisAiPort {

    Optional<AgentAnalysisResult> runAnalysis(
            String ticker,
            AgentMetricSnapshot metrics,
            AgentSentimentSnapshot sentiment
    );
}
