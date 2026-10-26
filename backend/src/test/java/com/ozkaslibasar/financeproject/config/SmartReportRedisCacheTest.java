package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.SmartReportController;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort.ComponentAvailability;
import com.redis.testcontainers.RedisContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.context.annotation.Configuration;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real Redis (Testcontainers) with the real cacheManager bean and the real @Cacheable proxy on the
 * smart report path. The score and market-data ports are the stubbed I/O boundary.
 */
@WebMvcTest(controllers = SmartReportController.class)
@ContextConfiguration(classes = SmartReportRedisCacheTest.Config.class)
@ImportAutoConfiguration({CacheAutoConfiguration.class, RedisAutoConfiguration.class})
@Testcontainers(disabledWithoutDocker = true)
class SmartReportRedisCacheTest {

    @Container
    static final RedisContainer redis = new RedisContainer(DockerImageName.parse("redis:7.0-alpine"));

    @DynamicPropertySource
    static void redisProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.cache.type", () -> "redis");
    }

    // Explicit context: the package's DomainConfigWiringTest.TestApplication must not be picked up.
    @Configuration
    @Import({RedisConfig.class, SmartReportController.class})
    static class Config {
        @Bean
        SmartReportUseCase smartReportUseCase(SmartReportScorePort scorePort, SmartReportMarketDataPort marketDataPort) {
            return new SmartReportUseCase(scorePort, marketDataPort);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private SmartReportScorePort scorePort;

    @MockitoBean
    private SmartReportMarketDataPort marketDataPort;

    @Test
    void secondRequestIsServedFromRedisWithIdenticalBodyIncludingSectionStatus() throws Exception {
        when(scorePort.fetchCompositeScore("AAPL")).thenReturn(Optional.of(new SmartReportScorePort.CompositeScore(
                51, "C", "Hold",
                new SmartReportScorePort.ScoreBreakdown(50, null, 50, 50, 50, 50, 50, 70),
                Map.of("fundamental_score", new ComponentAvailability("available", null),
                        "valuation_score", new ComponentAvailability("unavailable", "valuation_component_unavailable")),
                List.of("valuation"))));
        when(marketDataPort.fetchCompanyMetrics("AAPL")).thenReturn(
                Optional.of(new SmartReportMarketDataPort.CompanyMetrics(20.0, 3.0, 0.5, 0.2, 0.3, 0.01)));
        when(marketDataPort.fetchPeers("AAPL")).thenReturn(List.of());

        String first = mockMvc.perform(get("/api/v1/reports/smart/AAPL"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String second = mockMvc.perform(get("/api/v1/reports/smart/AAPL"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        verify(scorePort, times(1)).fetchCompositeScore("AAPL");
        assertThat(second).isEqualTo(first);
        assertThat(second).contains("\"sectionStatus\"").contains("valuation_component_unavailable");
        assertThat(second).contains("\"peers\":[{\"symbol\":\"AAPL\"");
    }
}
