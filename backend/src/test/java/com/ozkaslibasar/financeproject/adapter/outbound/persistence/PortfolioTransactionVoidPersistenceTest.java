package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** D-1: a deleted ledger event is voided, never physically removed, and keeps its origin reserved. */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioTransactionVoidPersistenceTest {

    private static final String USER = "void-user";

    @Autowired
    private PortfolioPort portfolioPort;
    @Autowired
    private PortfolioTransactionPort transactionPort;
    @Autowired
    private PortfolioLedgerService ledgerService;
    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Long portfolioId;

    @AfterEach
    void cleanUp() {
        if (portfolioId != null) {
            portfolioPort.deleteByIdAndUserId(portfolioId, USER);
        }
    }

    @Test
    void voidedEventStaysInTheTableButLeavesEveryActiveRead() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Void", "USD", null, false, null, null)).id();
        PortfolioTransaction buy = ledgerService.addTransaction(manual(PortfolioTransactionAction.BUY, "10", "100"));
        PortfolioTransaction other = ledgerService.addTransaction(manual(PortfolioTransactionAction.BUY, "5", "100"));
        Instant voidedAt = Instant.parse("2026-10-25T09:00:00Z");

        transactionPort.voidByIdAndPortfolioIdAndUserId(buy.id(), portfolioId, USER, voidedAt);

        Integer rows = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM portfolio_transactions WHERE id = ? AND voided_at IS NOT NULL",
                Integer.class, buy.id());
        assertThat(rows).isEqualTo(1);
        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER))
                .extracting(PortfolioTransaction::id).containsExactly(other.id());
        assertThat(transactionPort.findByIdAndPortfolioIdAndUserId(buy.id(), portfolioId, USER)).isEmpty();
        List<PortfolioHolding> holdings = ledgerService.calculateHoldings(portfolioId, USER);
        assertThat(holdings).hasSize(1);
        assertThat(holdings.get(0).quantity()).isEqualByComparingTo("5");

        List<PortfolioTransaction> all = transactionPort.findByIdsIncludingVoided(
                portfolioId, USER, List.of(buy.id(), other.id()));
        assertThat(all).extracting(PortfolioTransaction::id).containsExactlyInAnyOrder(buy.id(), other.id());
        assertThat(all).filteredOn(t -> t.id().equals(buy.id())).singleElement()
                .satisfies(t -> assertThat(t.voidedAt()).isEqualTo(voidedAt));
        assertThat(all).filteredOn(t -> t.id().equals(other.id())).singleElement()
                .satisfies(t -> assertThat(t.voidedAt()).isNull());
    }

    @Test
    void voidingIsOnceOnlyAndUnknownIdsChangeNothing() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Void once", "USD", null, false, null, null)).id();
        PortfolioTransaction buy = ledgerService.addTransaction(manual(PortfolioTransactionAction.BUY, "10", "100"));
        Instant first = Instant.parse("2026-10-25T09:00:00Z");

        transactionPort.voidByIdAndPortfolioIdAndUserId(buy.id(), portfolioId, USER, first);
        transactionPort.voidByIdAndPortfolioIdAndUserId(buy.id(), portfolioId, USER, Instant.parse("2026-10-26T09:00:00Z"));
        transactionPort.voidByIdAndPortfolioIdAndUserId(987654L, portfolioId, USER, first);
        transactionPort.voidByIdAndPortfolioIdAndUserId(buy.id(), portfolioId, "someone-else", first);

        assertThat(transactionPort.findByIdsIncludingVoided(portfolioId, USER, List.of(buy.id())))
                .singleElement().satisfies(t -> assertThat(t.voidedAt()).isEqualTo(first));
        assertThat(transactionPort.findByIdsIncludingVoided(portfolioId, USER, List.of(987654L))).isEmpty();
        assertThat(transactionPort.findByIdsIncludingVoided(portfolioId, USER, List.of())).isEmpty();
    }

    @Test
    void voidedEventKeepsItsSourceAndOriginLocatorReserved() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Void locator", "USD", null, false, null, null)).id();
        PortfolioTransaction buy = ledgerService.addTransaction(manual(PortfolioTransactionAction.BUY, "10", "100"));
        transactionPort.voidByIdAndPortfolioIdAndUserId(buy.id(), portfolioId, USER, Instant.now());

        assertThatThrownBy(() -> transactionPort.save(new PortfolioTransaction(null, portfolioId, USER, "AAPL",
                PortfolioAssetType.US_STOCK, PortfolioTransactionAction.BUY, BigDecimal.ONE, BigDecimal.TEN, "USD",
                BigDecimal.ZERO, BigDecimal.ONE, LocalDate.of(2026, 10, 3), PortfolioTransactionSource.MANUAL, null,
                null, null, buy.originLocator())))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private PortfolioTransaction manual(PortfolioTransactionAction action, String quantity, String price) {
        return new PortfolioTransaction(null, portfolioId, USER, "AAPL", PortfolioAssetType.US_STOCK, action,
                new BigDecimal(quantity), new BigDecimal(price), "USD", BigDecimal.ZERO, BigDecimal.ONE,
                LocalDate.of(2026, 10, 1), PortfolioTransactionSource.MANUAL, null, null, null);
    }
}
