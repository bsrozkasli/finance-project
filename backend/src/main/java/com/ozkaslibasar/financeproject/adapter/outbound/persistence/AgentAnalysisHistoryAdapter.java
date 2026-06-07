package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.AgentAnalysisHistoryEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.AgentAnalysisHistoryJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisHistoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AgentAnalysisHistoryAdapter implements AgentAnalysisHistoryPort {

    private final AgentAnalysisHistoryJpaRepository repository;

    @Override
    public void save(AgentAnalysisResult result, String analysisJson) {
        AgentAnalysisHistoryEntity entity = new AgentAnalysisHistoryEntity();
        entity.setTicker(result.ticker());
        entity.setDecision(result.decision());
        entity.setConfidence(result.confidence());
        entity.setAnalysisJson(analysisJson);
        entity.setCreatedAt(result.generatedAt());
        repository.save(entity);
    }
}
