package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;

/**
 * Persists completed agent analyses for audit and replay.
 */
public interface AgentAnalysisHistoryPort {

    void save(AgentAnalysisResult result, String analysisJson);
}
