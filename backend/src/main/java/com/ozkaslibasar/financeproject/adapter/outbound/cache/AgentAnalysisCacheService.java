package com.ozkaslibasar.financeproject.adapter.outbound.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.ozkaslibasar.financeproject.domain.model.DecisionStatus;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

/**
 * Redis cache for agent analysis responses ({@code agent-analysis:{ticker}}, 15-minute TTL).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AgentAnalysisCacheService {

    public static final String KEY_PREFIX = "agent-analysis:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

    @Value("${agent-analysis.cache-ttl-minutes:15}")
    private long cacheTtlMinutes;

    public Optional<AgentAnalysisResult> get(String ticker) {
        String key = key(ticker);
        String json = redisTemplate.opsForValue().get(key);
        if (json == null || json.isBlank()) {
            meterRegistry.counter("agent.analysis.cache", "result", "miss").increment();
            return Optional.empty();
        }
        try {
            CachedAgentAnalysisPayload payload = objectMapper.readValue(json, CachedAgentAnalysisPayload.class);
            // An entry written before decision_status existed (or any non-OK entry) may hold a
            // placeholder verdict: it is a miss, never served (decision D-2.2).
            if (!payload.hasOkDecisionStatus()) {
                invalidate(ticker);
                meterRegistry.counter("agent.analysis.cache", "result", "miss").increment();
                return Optional.empty();
            }
            meterRegistry.counter("agent.analysis.cache", "result", "hit").increment();
            return Optional.of(payload.toDomain(true));
        } catch (JsonProcessingException e) {
            log.warn("Invalid cache payload for key={}: {}", key, e.getMessage());
            invalidate(ticker);
            meterRegistry.counter("agent.analysis.cache", "result", "miss").increment();
            return Optional.empty();
        }
    }

    public void put(AgentAnalysisResult result) {
        String key = key(result.ticker());
        try {
            String json = objectMapper.writeValueAsString(CachedAgentAnalysisPayload.from(result));
            redisTemplate.opsForValue().set(key, json, Duration.ofMinutes(cacheTtlMinutes));
        } catch (JsonProcessingException e) {
            log.warn("Could not serialize agent analysis cache for {}: {}", result.ticker(), e.getMessage());
        }
    }

    public void invalidate(String ticker) {
        redisTemplate.delete(key(ticker));
    }

    public void invalidateAll() {
        var keys = redisTemplate.keys(KEY_PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }

    private String key(String ticker) {
        return KEY_PREFIX + ticker.toUpperCase();
    }

    public record DecisionStatusPayload(String status, String reason) {
    }

    /**
     * JSON-friendly cache payload matching the API contract.
     */
    public record CachedAgentAnalysisPayload(
            String ticker,
            String decision,
            Integer confidence,
            DecisionStatusPayload decision_status,
            String fundamental_summary,
            String technical_summary,
            String risk_summary,
            String bull_case,
            String bear_case,
            String portfolio_manager_reasoning,
            Map<String, Object> metrics_used,
            String generated_at
    ) {
        static CachedAgentAnalysisPayload from(AgentAnalysisResult result) {
            return new CachedAgentAnalysisPayload(
                    result.ticker(),
                    result.decision(),
                    result.confidence(),
                    result.decisionStatus() == null || result.decisionStatus().status() == null
                            ? null
                            : new DecisionStatusPayload(
                                    result.decisionStatus().status().name(), result.decisionStatus().reason()),
                    result.fundamentalSummary(),
                    result.technicalSummary(),
                    result.riskSummary(),
                    result.bullCase(),
                    result.bearCase(),
                    result.portfolioManagerReasoning(),
                    result.metricsUsed(),
                    result.generatedAt().toString()
            );
        }

        /** True only for an entry carrying {@code decision_status.status == "OK"}. */
        boolean hasOkDecisionStatus() {
            return decision_status != null
                    && WatchlistResearchStatus.OK.name().equals(decision_status.status());
        }

        AgentAnalysisResult toDomain(boolean fromCache) {
            return new AgentAnalysisResult(
                    ticker,
                    decision,
                    confidence,
                    new DecisionStatus(WatchlistResearchStatus.OK, decision_status.reason()),
                    fundamental_summary,
                    technical_summary,
                    risk_summary,
                    bull_case,
                    bear_case,
                    portfolio_manager_reasoning,
                    metrics_used != null ? metrics_used : Map.of(),
                    Instant.parse(generated_at),
                    fromCache
            );
        }
    }
}
