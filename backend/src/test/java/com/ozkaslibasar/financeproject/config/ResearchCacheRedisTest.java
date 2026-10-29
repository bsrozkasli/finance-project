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

import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;
import org.springframework.test.web.client.ResponseCreator;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.HttpMethod.GET;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.TOO_MANY_REQUESTS;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;
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

    /**
     * D-4: FAILED, EMPTY, INSUFFICIENT_DATA and RATE_LIMITED are never remembered (each call reaches the stub);
     * an OK outcome is stored and read back equal through the real Redis serializer (no stub for the third call).
     */
    private <T> void assertOnlyOkOutcomeIsCached(String path, String okBody, Supplier<ProviderFetch<T>> call) {
        for (ResponseCreator nonOk : List.of(
                withStatus(INTERNAL_SERVER_ERROR), withStatus(NOT_FOUND),
                withStatus(UNPROCESSABLE_ENTITY), withStatus(TOO_MANY_REQUESTS))) {
            server.reset();
            server.expect(once(), requestTo(BASE + path)).andExpect(method(GET)).andRespond(nonOk);
            assertThat(call.get().ok()).isFalse();
            server.verify();
        }
        server.reset();
        expectBody(path, okBody);
        ProviderFetch<T> ok = call.get();
        assertThat(ok.ok()).isTrue();
        server.verify();

        server.reset(); // nothing expected: a stub hit would fail
        ProviderFetch<T> fromCache = call.get();
        assertThat(fromCache).isEqualTo(ok);
        assertThat(fromCache.data()).isNotNull();
    }

    @Test
    void fundamentalOutcomeIsCachedOnlyWhenOkAndRoundTripsThroughRedis() {
        assertOnlyOkOutcomeIsCached("fundamental/AAPL",
                "{\"symbol\":\"AAPL\",\"metrics\":{\"roe\":0.2},\"fiscal_year\":\"2025\",\"currency\":\"USD\"}",
                () -> adapter.fetchFundamentalResult("AAPL"));
    }

    @Test
    void earningsOutcomeIsCachedOnlyWhenOkAndRoundTripsThroughRedis() {
        assertOnlyOkOutcomeIsCached("earnings/AAPL",
                "{\"symbol\":\"AAPL\",\"history\":[{\"period\":\"2026Q1\",\"actual\":1.5,\"estimate\":1.4,\"beat\":true}]}",
                () -> adapter.fetchEarningsResult("AAPL"));
    }

    @Test
    void institutionalOutcomeIsCachedOnlyWhenOkAndRoundTripsThroughRedis() {
        assertOnlyOkOutcomeIsCached("institutional-scores/AAPL",
                "{\"symbol\":\"AAPL\",\"scores\":{\"piotroski_f_score\":7,\"altman_z_score\":3.1,\"economic_moat\":\"wide\"}}",
                () -> adapter.fetchInstitutionalScoresResult("AAPL"));
    }

    @Test
    void outcomeCacheKeysDoNotCollideWithTheOptionalMethodKeys() {
        expectBody("fundamental/AAPL", "{\"symbol\":\"AAPL\",\"metrics\":{\"roe\":0.2}}");
        assertThat(adapter.fetchFundamentalResult("AAPL").ok()).isTrue();
        server.verify();
        server.reset();
        // The Optional method has its own key and value type, so it must still reach the stub once.
        expectBody("fundamental/AAPL", "{\"symbol\":\"AAPL\",\"metrics\":{\"roe\":0.2}}");
        assertThat(adapter.fetchFundamental("AAPL")).isPresent();
        server.verify();
    }

    @Test
    void technicalOutcomeValueRoundTripsThroughTheSharedSerializer() {
        ProviderFetch<TechnicalAnalysisPort.TechnicalAnalysisResult> fetch = ProviderFetch.ok(
                new TechnicalAnalysisPort.TechnicalAnalysisResult("AAPL", "t", 55.0, 1.0, 0.5, 0.5, 200.0, 190.0,
                        180.0, 2.0, 191.0, 190.0, 185.0, 170.0, 192.0, "BUY", 0.7));
        cacheManager.getCache("researchCache").put("technical-result:AAPL", fetch);

        Object read = cacheManager.getCache("researchCache").get("technical-result:AAPL").get();

        assertThat(read).isEqualTo(fetch);
    }
}
