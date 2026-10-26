package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.ozkaslibasar.financeproject.adapter.outbound.cache.AgentAnalysisCacheService;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.DecisionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisHistoryPort;
import com.ozkaslibasar.financeproject.domain.service.AgentAnalysisUseCase;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AgentAnalysisFacadeTest {

    private AgentAnalysisUseCase useCase;
    private AgentAnalysisCacheService cache;
    private AgentAnalysisHistoryPort history;
    private AgentAnalysisFacade facade;

    @BeforeEach
    void setUp() {
        useCase = mock(AgentAnalysisUseCase.class);
        cache = mock(AgentAnalysisCacheService.class);
        history = mock(AgentAnalysisHistoryPort.class);
        when(cache.get("AAPL")).thenReturn(Optional.empty());
        facade = new AgentAnalysisFacade(useCase, cache, history,
                new ObjectMapper().registerModule(new JavaTimeModule()), new SimpleMeterRegistry());
    }

    private static AgentAnalysisResult result(String decision, Integer confidence, DecisionStatus status) {
        return new AgentAnalysisResult("AAPL", decision, confidence, status, "f", "t", "r", "bu", "be",
                "reasoning", Map.of(), Instant.parse("2026-10-26T10:00:00Z"), false);
    }

    @Test
    void okResultIsCachedAndPersisted() {
        AgentAnalysisResult ok = result("BUY", 80, new DecisionStatus(WatchlistResearchStatus.OK, null));
        when(useCase.analyze("AAPL")).thenReturn(Optional.of(ok));

        assertThat(facade.getAnalysis("AAPL")).contains(ok);

        verify(cache).put(ok);
        verify(history).save(any(), any());
    }

    @Test
    void failedResultIsNotCachedAndNotPersistedBecauseThereIsNoDecision() {
        AgentAnalysisResult failed = result(null, null,
                new DecisionStatus(WatchlistResearchStatus.FAILED, "pm_response_not_json_default_hold"));
        when(useCase.analyze("AAPL")).thenReturn(Optional.of(failed));

        assertThat(facade.getAnalysis("AAPL")).contains(failed);

        verify(cache, never()).put(any());
        verify(history, never()).save(any(), any());
    }

    @Test
    void unknownStatusResultIsNotCachedButIsPersistedAndReturned() {
        AgentAnalysisResult unknown = result("HOLD", 50, null);
        when(useCase.analyze("AAPL")).thenReturn(Optional.of(unknown));

        assertThat(facade.getAnalysis("AAPL")).contains(unknown);

        verify(cache, never()).put(any());
        verify(history).save(any(), any());
    }
}
