package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.PriceController;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapperImpl;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.PriceLookup;
import com.ozkaslibasar.financeproject.domain.service.AssetResearchDetailUseCase;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import com.redis.testcontainers.RedisContainer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real Redis (Testcontainers) with the real cacheManager bean and the real @Cacheable proxy on the latest-price
 * endpoint. The price service is the stubbed I/O boundary. Only OK answers may be remembered for the 30 seconds;
 * a stale answer must be looked up again.
 */
@WebMvcTest(controllers = PriceController.class)
@ContextConfiguration(classes = LatestPriceRedisCacheTest.Config.class)
@ImportAutoConfiguration({CacheAutoConfiguration.class, RedisAutoConfiguration.class})
@Testcontainers(disabledWithoutDocker = true)
class LatestPriceRedisCacheTest {

    private static final Instant CANDLE_TIME = Instant.parse("2026-06-26T20:00:00Z");

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
    @Import({RedisConfig.class, PriceController.class, RestMapperImpl.class})
    static class Config {
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PriceRefreshService priceRefreshService;

    @MockitoBean
    private AssetResearchDetailUseCase assetResearchDetailUseCase;

    @Test
    void staleAnswerIsNotRememberedSoTheSecondCallLooksUpAgain() throws Exception {
        when(priceRefreshService.lookupFreshLatest("STALEX"))
                .thenReturn(new PriceLookup(Optional.of(candle("STALEX")), PriceLookup.Origin.STORED_REFRESH_FAILED));

        String first = mockMvc.perform(get("/api/v1/prices/STALEX/latest"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String second = mockMvc.perform(get("/api/v1/prices/STALEX/latest"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        verify(priceRefreshService, times(2)).lookupFreshLatest("STALEX");
        assertThat(first).contains("\"priceStatus\":\"STALE\"");
        assertThat(second).contains("\"priceStatus\":\"STALE\"");
    }

    @Test
    void okAnswerIsServedFromRedisOnTheSecondCallWithTheSameBody() throws Exception {
        when(priceRefreshService.lookupFreshLatest("OKAY"))
                .thenReturn(new PriceLookup(Optional.of(candle("OKAY")), PriceLookup.Origin.FRESH));

        String first = mockMvc.perform(get("/api/v1/prices/OKAY/latest"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String second = mockMvc.perform(get("/api/v1/prices/OKAY/latest"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        verify(priceRefreshService, times(1)).lookupFreshLatest("OKAY");
        assertThat(second).isEqualTo(first);
        assertThat(second)
                .contains("\"priceStatus\":\"OK\"")
                .contains("\"priceAsOf\":\"2026-06-26T20:00:00Z\"")
                .contains("\"timestamp\":\"2026-06-26T20:00:00Z\"");
    }

    private PriceHistory candle(String symbol) {
        return new PriceHistory(symbol, BigDecimal.ONE, new BigDecimal("193.42"), BigDecimal.ONE, BigDecimal.ONE,
                BigDecimal.TEN, CANDLE_TIME);
    }
}
