package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServiceResearchAdapter;
import com.redis.testcontainers.RedisContainer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Real Redis (Testcontainers) with the real cacheManager and the real @Cacheable proxy on the research
 * adapter. The data-service HTTP boundary is a MockRestServiceServer stub; no live provider.
 * Covers D-1 (failures are not remembered) and D-4 (outcomes are cached only when OK).
 */
@SpringJUnitConfig(ResearchCacheRedisTest.Config.class)
@ImportAutoConfiguration({CacheAutoConfiguration.class, RedisAutoConfiguration.class})
@TestPropertySource(properties = "data-service.base-url=http://data-service.test")
@Testcontainers(disabledWithoutDocker = true)
class ResearchCacheRedisTest {

    private static final String BASE = "http://data-service.test/api/v1/research/";

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
    @Import({RedisConfig.class, DataServiceResearchAdapter.class})
    static class Config {
        @Bean
        RestTemplate restTemplate() {
            return new RestTemplate();
        }

        @Bean
        MockRestServiceServer dataService(RestTemplate restTemplate) {
            return MockRestServiceServer.bindTo(restTemplate).build();
        }
    }

    // The cache proxy is a JDK proxy, so inject by port interface.
    @Autowired
    private ResearchDataPort adapter;
    @Autowired
    private SmartReportScorePort scorePort;
    @Autowired
    private MockRestServiceServer server;
    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void reset() {
        server.reset();
        cacheManager.getCache("researchCache").clear();
    }

    private void expectFailure(String path) {
        server.expect(once(), requestTo(BASE + path)).andExpect(method(GET))
                .andRespond(withStatus(INTERNAL_SERVER_ERROR));
    }

    private void expectBody(String path, String body) {
        server.expect(once(), requestTo(BASE + path)).andExpect(method(GET))
                .andRespond(withSuccess(body, APPLICATION_JSON));
    }

    /** Failure then success: the second call must reach the stub and return data; a third is served from cache. */
    private <T> void assertFailureIsNotRemembered(String path, String body, Supplier<T> call, java.util.function.Predicate<T> hasData) {
        expectFailure(path);
        assertThat(hasData.test(call.get())).isFalse();
        server.verify();
        server.reset();
        expectBody(path, body);
        T second = call.get();
        assertThat(hasData.test(second)).isTrue();
        server.verify();
        server.reset(); // no expectation left: any further stub hit fails the next call
        T third = call.get(); // no further expectation: a stub hit would fail here
        assertThat(hasData.test(third)).isTrue();
        server.verify();
    }

    @Test
    void fundamentalFailureIsNotCachedButSuccessIs() {
        assertFailureIsNotRemembered("fundamental/AAPL",
                "{\"symbol\":\"AAPL\",\"metrics\":{\"roe\":0.2},\"fiscal_year\":\"2025\",\"currency\":\"USD\"}",
                () -> adapter.fetchFundamental("AAPL"), Optional::isPresent);
    }

    @Test
    void valuationFailureIsNotCachedButSuccessIs() {
        assertFailureIsNotRemembered("valuation/AAPL",
                "{\"symbol\":\"AAPL\",\"metrics\":{\"pe\":21.5}}",
                () -> adapter.fetchValuation("AAPL"), Optional::isPresent);
    }

    @Test
    void earningsFailureIsNotCachedButSuccessIs() {
        assertFailureIsNotRemembered("earnings/AAPL",
                "{\"symbol\":\"AAPL\",\"history\":[{\"period\":\"2026Q1\",\"actual\":1.5,\"estimate\":1.4}]}",
                () -> adapter.fetchEarnings("AAPL"), (List<ResearchDataPort.EarningsQuarter> l) -> !l.isEmpty());
    }

    @Test
    void institutionalFailureIsNotCachedButSuccessIs() {
        assertFailureIsNotRemembered("institutional-scores/AAPL",
                "{\"symbol\":\"AAPL\",\"scores\":{\"piotroski_f_score\":7}}",
                () -> adapter.fetchInstitutionalScores("AAPL"), Optional::isPresent);
    }

    @Test
    void compositeFailureIsNotCachedButSuccessIs() {
        assertFailureIsNotRemembered("composite/AAPL",
                "{\"symbol\":\"AAPL\",\"overall_score\":61,\"grade\":\"B\",\"recommendation\":\"Buy\"}",
                () -> scorePort.fetchCompositeScore("AAPL"), Optional::isPresent);
    }
}
