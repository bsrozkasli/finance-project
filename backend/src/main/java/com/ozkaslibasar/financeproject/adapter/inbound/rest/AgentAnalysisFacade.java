package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.cache.AgentAnalysisCacheService;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisHistoryPort;
import com.ozkaslibasar.financeproject.domain.service.AgentAnalysisUseCase;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Inbound orchestration: Redis cache, domain use case, persistence.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AgentAnalysisFacade {

    private final AgentAnalysisUseCase agentAnalysisUseCase;
    private final AgentAnalysisCacheService cacheService;
    private final AgentAnalysisHistoryPort historyPort;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    public Optional<AgentAnalysisResult> getAnalysis(String ticker) {
        String symbol = ticker.toUpperCase();
        Optional<AgentAnalysisResult> cached = cacheService.get(symbol);
        if (cached.isPresent()) {
            return cached;
        }

        Timer.Sample sample = Timer.start(meterRegistry);
        Optional<AgentAnalysisResult> fresh = agentAnalysisUseCase.analyze(symbol);
        sample.stop(meterRegistry.timer("agent.execution.time"));

        fresh.ifPresent(result -> {
            cacheService.put(result);
            persist(result);
        });
        return fresh;
    }

    public void invalidateCache(String ticker) {
        cacheService.invalidate(ticker);
    }

    public void invalidateAllCache() {
        cacheService.invalidateAll();
    }

    private void persist(AgentAnalysisResult result) {
        try {
            String json = objectMapper.writeValueAsString(result);
            historyPort.save(result, json);
        } catch (JsonProcessingException e) {
            log.warn("Could not persist agent analysis history for {}: {}", result.ticker(), e.getMessage());
        }
    }
}
