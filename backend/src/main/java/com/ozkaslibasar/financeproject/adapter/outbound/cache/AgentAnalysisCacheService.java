package com.ozkaslibasar.financeproject.adapter.outbound.cache;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
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

    /**
     * JSON-friendly cache payload matching the API contract.
     */
    public record CachedAgentAnalysisPayload(
            String ticker,
            String decision,
            int confidence,
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

        AgentAnalysisResult toDomain(boolean fromCache) {
            return new AgentAnalysisResult(
                    ticker,
                    decision,
                    confidence,
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
