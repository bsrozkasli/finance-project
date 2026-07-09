package com.ozkaslibasar.financeproject.integration;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
class CoreSystemIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static final GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("spring.cache.type", () -> "redis");
        registry.add("spring.task.scheduling.enabled", () -> "false");
        registry.add("data-service.base-url", () -> "http://data-service.test");
        registry.add("finnhub.api-key", () -> "");
        registry.add("tiingo.api-key", () -> "");
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @MockitoBean
    private FinancialDataPort financialDataPort;

    @BeforeEach
    void resetState() {
        redisTemplate.getConnectionFactory().getConnection().serverCommands().flushDb();
        jdbcTemplate.execute("""
                TRUNCATE TABLE
                    journal_trade_tags,
                    journal_trades,
                    portfolio_transactions,
                    watchlist_symbols,
                    watchlists,
                    portfolios,
                    price_history,
                    assets
                RESTART IDENTITY CASCADE
                """);
    }

    @Test
    void lazyPriceHistoryFallsBackToProviderAndPersistsRows() {
        PriceHistory first = price("AAPL", "2026-07-08T20:00:00Z", "100", "102", "105", "99", "1000");
        PriceHistory second = price("AAPL", "2026-07-09T20:00:00Z", "102", "108", "110", "101", "1200");
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenReturn(List.of(first, second));

        ResponseEntity<String> firstResponse = restTemplate.getForEntity(
                "/api/v1/prices/AAPL/history?interval=1d&range=1mo",
                String.class);

        assertThat(firstResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(firstResponse.getBody()).contains("AAPL");
        assertThat(countRows("price_history")).isEqualTo(2);

        ResponseEntity<String> secondResponse = restTemplate.getForEntity(
                "/api/v1/prices/AAPL/history?interval=1d&range=1mo",
                String.class);

        assertThat(secondResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(secondResponse.getBody()).contains("AAPL");
        assertThat(countRows("price_history")).isEqualTo(2);
        verify(financialDataPort).fetchPriceHistory("AAPL", "1d", "1mo");
    }

    @Test
    void watchlistsPersistNormalizedSymbolsAcrossRequests() {
        ResponseEntity<Map> created = restTemplate.postForEntity(
                "/api/v1/watchlists",
                Map.of("name", "Core"),
                Map.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number watchlistId = (Number) created.getBody().get("id");

        ResponseEntity<Map> updated = restTemplate.postForEntity(
                "/api/v1/watchlists/" + watchlistId + "/symbols",
                Map.of("symbol", " msft "),
                Map.class);

        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat((List<String>) updated.getBody().get("symbols")).containsExactly("MSFT");

        ResponseEntity<List> listed = restTemplate.getForEntity("/api/v1/watchlists", List.class);
        assertThat(listed.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(listed.getBody()).hasSize(1);
        Map<?, ?> watchlist = (Map<?, ?>) listed.getBody().get(0);
        assertThat((List<String>) watchlist.get("symbols")).containsExactly("MSFT");
    }

    @Test
    void portfolioTransactionCreatesDerivedHoldingAndLinkedJournalEntry() {
        ResponseEntity<Map> portfolioResponse = restTemplate.postForEntity(
                "/api/v1/portfolios",
                Map.of("name", "Default", "baseCurrency", "USD", "defaultPortfolio", true),
                Map.class);
        assertThat(portfolioResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number portfolioId = (Number) portfolioResponse.getBody().get("id");

        ResponseEntity<Map> transactionResponse = restTemplate.postForEntity(
                "/api/v1/portfolios/" + portfolioId + "/transactions",
                Map.of(
                        "symbol", "AAPL",
                        "assetType", "US_STOCK",
                        "action", "BUY",
                        "quantity", 2,
                        "price", 108,
                        "currency", "USD",
                        "tradeDate", "2026-07-09",
                        "source", "MANUAL",
                        "notes", "Integrated smoke trade",
                        "journalNotes", "Integrated smoke thesis"),
                Map.class);
        assertThat(transactionResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number transactionId = (Number) transactionResponse.getBody().get("id");

        ResponseEntity<List> holdingsResponse = restTemplate.getForEntity(
                "/api/v1/portfolios/" + portfolioId + "/holdings",
                List.class);
        assertThat(holdingsResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(holdingsResponse.getBody()).singleElement().satisfies(row -> {
            Map<?, ?> holding = (Map<?, ?>) row;
            assertThat(holding.get("symbol")).isEqualTo("AAPL");
            assertThat(((Number) holding.get("quantity")).doubleValue()).isEqualTo(2.0);
            assertThat(((Number) holding.get("averageCost")).doubleValue()).isEqualTo(108.0);
        });

        Integer journalCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM journal_trades WHERE portfolio_id = ? AND transaction_id = ? AND notes = ?",
                Integer.class,
                portfolioId.longValue(),
                transactionId.longValue(),
                "Integrated smoke thesis");
        assertThat(journalCount).isEqualTo(1);
    }

    @Test
    void validationErrorsUseStandardErrorShape() {
        ResponseEntity<Map> response = restTemplate.getForEntity(
                "/api/v1/portfolios/999/holdings",
                Map.class);

        assertThat(response.getStatusCode().is4xxClientError()).isTrue();
        assertThat(response.getBody()).containsKeys("timestamp", "status", "error", "message", "path");
    }

    private long countRows(String table) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
    }

    private PriceHistory price(
            String symbol,
            String timestamp,
            String open,
            String close,
            String high,
            String low,
            String volume) {
        return new PriceHistory(
                symbol,
                new BigDecimal(open),
                new BigDecimal(close),
                new BigDecimal(high),
                new BigDecimal(low),
                new BigDecimal(volume),
                Instant.parse(timestamp));
    }
}
