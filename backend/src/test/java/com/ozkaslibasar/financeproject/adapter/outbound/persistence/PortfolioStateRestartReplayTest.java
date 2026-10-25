package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.FinanceProjectApplication;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioStateService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * PRD-FR-014: restart and replay reproduce the Portfolio State. The context that accepted the ledger events is
 * closed and a new one (new pool, Flyway validation, JPA metadata) derives the state from the same PostgreSQL. Both
 * run in this JVM, so this proves the database round-trip (including numeric scale), not a new OS process.
 */
@Testcontainers(disabledWithoutDocker = true)
class PortfolioStateRestartReplayTest {

    private static final String USER = "state-restart-user";
    private static final LocalDate AS_OF = LocalDate.of(2026, 10, 20);

    @Container
    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    private static ConfigurableApplicationContext start() {
        return new SpringApplicationBuilder(FinanceProjectApplication.class)
                .profiles("test")
                .properties(
                        "spring.datasource.url=" + POSTGRES.getJdbcUrl(),
                        "spring.datasource.username=" + POSTGRES.getUsername(),
                        "spring.datasource.password=" + POSTGRES.getPassword(),
                        "spring.datasource.driver-class-name=org.postgresql.Driver",
                        "spring.jpa.show-sql=false",
                        "server.port=0")
                .run();
    }

    private static PortfolioTransaction tx(Long portfolioId, PortfolioTransactionAction action, String qty,
                                           String price, String fee, int day) {
        return new PortfolioTransaction(null, portfolioId, USER, "AAPL", PortfolioAssetType.US_STOCK, action,
                new BigDecimal(qty), new BigDecimal(price), "USD", new BigDecimal(fee), BigDecimal.ONE,
                LocalDate.of(2026, 10, day), PortfolioTransactionSource.MANUAL, null, null, null);
    }

    @Test
    void aNewApplicationContextDerivesTheSameStateAndVersion() {
        Long portfolioId;
        PortfolioState before;
        try (ConfigurableApplicationContext first = start()) {
            portfolioId = first.getBean(PortfolioPort.class)
                    .save(new Portfolio(null, USER, "State restart", "USD", null, false, null, null)).id();
            PortfolioLedgerService ledger = first.getBean(PortfolioLedgerService.class);
            ledger.addTransaction(tx(portfolioId, PortfolioTransactionAction.BUY, "10", "100.25", "1.5", 1));
            ledger.addTransaction(tx(portfolioId, PortfolioTransactionAction.SELL, "4", "130.10", "1", 2));
            before = first.getBean(PortfolioStateService.class).stateAt(portfolioId, USER, AS_OF);
        }

        try (ConfigurableApplicationContext second = start()) {
            PortfolioState after = second.getBean(PortfolioStateService.class).stateAt(portfolioId, USER, AS_OF);

            assertThat(after).isEqualTo(before);
            assertThat(after.sourceEventIds()).hasSize(2);
        }
    }
}
