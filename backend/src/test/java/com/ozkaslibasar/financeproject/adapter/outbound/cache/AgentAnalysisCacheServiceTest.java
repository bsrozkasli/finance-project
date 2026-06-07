package com.ozkaslibasar.financeproject.adapter.outbound.cache;

import com.ozkaslibasar.financeproject.domain.model.AgentAnalysisResult;
import com.redis.testcontainers.RedisContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Testcontainers
class AgentAnalysisCacheServiceTest {

    @Container
    static final RedisContainer redis = new RedisContainer(DockerImageName.parse("redis:7.0-alpine"));

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
    }

    @Autowired
    private AgentAnalysisCacheService cacheService;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Test
    void shouldPutAndGetFromCache() {
        // Arrange
        AgentAnalysisResult result = new AgentAnalysisResult(
                "AAPL",
                "BUY",
                85,
                "Strong earnings growth",
                "Bullish moving average cross",
                "Low beta",
                "New product launch",
                "Supply chain issues",
                "Reasoning here",
                Map.of("pe_ratio", 28.5),
                Instant.now(),
                false
        );

        // Act
        cacheService.put(result);
        Optional<AgentAnalysisResult> cached = cacheService.get("AAPL");

        // Assert
        assertThat(cached).isPresent();
        assertThat(cached.get().ticker()).isEqualTo("AAPL");
        assertThat(cached.get().decision()).isEqualTo("BUY");
        assertThat(cached.get().confidence()).isEqualTo(85);
        assertThat(cached.get().fromCache()).isTrue();
    }

    @Test
    void shouldReturnEmptyWhenCacheMiss() {
        // Act
        Optional<AgentAnalysisResult> cached = cacheService.get("UNKNOWN");

        // Assert
        assertThat(cached).isEmpty();
    }

    @Test
    void shouldInvalidateTicker() {
        // Arrange
        AgentAnalysisResult result = new AgentAnalysisResult(
                "MSFT",
                "HOLD",
                60,
                "Stable earnings",
                "Neutral technicals",
                "Moderate risk",
                "Cloud growth",
                "High valuation",
                "Reasoning",
                Map.of(),
                Instant.now(),
                false
        );
        cacheService.put(result);
        assertThat(cacheService.get("MSFT")).isPresent();

        // Act
        cacheService.invalidate("MSFT");

        // Assert
        assertThat(cacheService.get("MSFT")).isEmpty();
    }

    @Test
    void shouldInvalidateAll() {
        // Arrange
        AgentAnalysisResult aapl = new AgentAnalysisResult(
                "AAPL", "BUY", 80, "S1", "S2", "S3", "S4", "S5", "S6", Map.of(), Instant.now(), false
        );
        AgentAnalysisResult goog = new AgentAnalysisResult(
                "GOOG", "SELL", 70, "S1", "S2", "S3", "S4", "S5", "S6", Map.of(), Instant.now(), false
        );
        cacheService.put(aapl);
        cacheService.put(goog);
        assertThat(cacheService.get("AAPL")).isPresent();
        assertThat(cacheService.get("GOOG")).isPresent();

        // Act
        cacheService.invalidateAll();

        // Assert
        assertThat(cacheService.get("AAPL")).isEmpty();
        assertThat(cacheService.get("GOOG")).isEmpty();
    }

    @Test
    void shouldReturnEmptyAndInvalidateOnCorruptJson() {
        // Arrange
        String key = AgentAnalysisCacheService.KEY_PREFIX + "AMZN";
        redisTemplate.opsForValue().set(key, "corrupt-json-string");

        // Act
        Optional<AgentAnalysisResult> cached = cacheService.get("AMZN");

        // Assert
        assertThat(cached).isEmpty();
        assertThat(redisTemplate.opsForValue().get(key)).isNull(); // Verify key was invalidated/deleted
    }
}
