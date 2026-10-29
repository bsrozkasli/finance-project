package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioLedgerLockPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.LedgerInconsistencyException;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** R-17 / R-18 on real PostgreSQL: a void is validated, atomic with its same-transaction work, and serialized. */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioLedgerVoidPersistenceTest {

    private static final String USER = "void-lock-user";

    @Autowired
    private PortfolioPort portfolioPort;
    @Autowired
    private PortfolioTransactionPort transactionPort;
    @Autowired
    private PortfolioLedgerService ledger;
    @Autowired
    private PortfolioLedgerLockPort lockPort;
    @Autowired
    private JdbcTemplate jdbc;

    private Long portfolioId;

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM portfolios WHERE user_id = ?", USER);
    }

    @Test
    void refusesVoidingABuyWithADependentSellAndLeavesEverythingActive() {
        portfolioId = newPortfolio("Dependent");
        PortfolioTransaction buy = ledger.addTransaction(event(PortfolioTransactionAction.BUY, "10"));
        ledger.addTransaction(event(PortfolioTransactionAction.SELL, "4"));
        AtomicInteger sameTransactionWork = new AtomicInteger();

        assertThatThrownBy(() -> ledger.voidTransaction(
                portfolioId, USER, buy.id(), Instant.now(), sameTransactionWork::incrementAndGet))
                .isInstanceOf(LedgerInconsistencyException.class)
                .hasMessageContaining("AAPL");

        assertThat(sameTransactionWork).hasValue(0);
        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).hasSize(2);
        assertThat(ledger.calculateHoldings(portfolioId, USER)).singleElement()
                .satisfies(h -> assertThat(h.quantity()).isEqualByComparingTo("6"));
    }

    @Test
    void voidsTheSellAndThenTheBuy() {
        portfolioId = newPortfolio("Sell then buy");
        PortfolioTransaction buy = ledger.addTransaction(event(PortfolioTransactionAction.BUY, "10"));
        PortfolioTransaction sell = ledger.addTransaction(event(PortfolioTransactionAction.SELL, "4"));

        ledger.voidTransaction(portfolioId, USER, sell.id(), Instant.now(), () -> { });
        ledger.voidTransaction(portfolioId, USER, buy.id(), Instant.now(), () -> { });

        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).isEmpty();
        assertThatThrownBy(() -> ledger.voidTransaction(portfolioId, USER, buy.id(), Instant.now(), () -> { }))
                .isInstanceOf(java.util.NoSuchElementException.class);
    }

    @Test
    void rollsBackTheSameTransactionWorkWhenItFails() {
        portfolioId = newPortfolio("Atomic");
        PortfolioTransaction buy = ledger.addTransaction(event(PortfolioTransactionAction.BUY, "10"));

        assertThatThrownBy(() -> ledger.voidTransaction(portfolioId, USER, buy.id(), Instant.now(), () -> {
            jdbc.update("UPDATE portfolios SET name = 'changed-in-work' WHERE id = ?", portfolioId);
            throw new IllegalStateException("journal delete failed");
        })).isInstanceOf(IllegalStateException.class);

        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT name FROM portfolios WHERE id = ?", String.class, portfolioId))
                .isEqualTo("Atomic");
    }

    @Test
    void runsTheLockedWorkAtReadCommitted() {
        portfolioId = newPortfolio("Isolation");

        String level = lockPort.withPortfolioLock(portfolioId,
                () -> jdbc.queryForObject("SHOW transaction_isolation", String.class));

        assertThat(level).isEqualTo("read committed");
    }

    @Test
    void aSellAndAVoidOfItsBuyNeverInterleaveIntoAnOversoldLedger() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        int sellWon = 0;
        int voidWon = 0;
        try {
            for (int round = 0; round < 12; round++) {
                portfolioId = newPortfolio("Race " + round);
                PortfolioTransaction buy = ledger.addTransaction(event(PortfolioTransactionAction.BUY, "10"));
                CyclicBarrier barrier = new CyclicBarrier(2);
                Future<PortfolioTransaction> sell = pool.submit((Callable<PortfolioTransaction>) () -> {
                    barrier.await(20, TimeUnit.SECONDS);
                    return ledger.addTransaction(event(PortfolioTransactionAction.SELL, "10"));
                });
                Future<Boolean> voided = pool.submit((Callable<Boolean>) () -> {
                    barrier.await(20, TimeUnit.SECONDS);
                    ledger.voidTransaction(portfolioId, USER, buy.id(), Instant.now(), () -> { });
                    return true;
                });

                Throwable sellFailure = failure(sell);
                Throwable voidFailure = failure(voided);

                // Exactly one side wins: the sell is rejected only if the void happened first, and the void is
                // refused only if the sell landed first. Never both, never neither.
                assertThat(sellFailure == null ^ voidFailure == null).isTrue();
                if (sellFailure == null) {
                    assertThat(voidFailure).isInstanceOf(LedgerInconsistencyException.class);
                    sellWon++;
                } else {
                    assertThat(sellFailure).isInstanceOf(IllegalArgumentException.class);
                    voidWon++;
                }
                // The stored ledger always replays; an oversold ledger would throw here.
                assertThat(ledger.calculateHoldings(portfolioId, USER)).isNotNull();
                jdbc.update("DELETE FROM portfolios WHERE id = ?", portfolioId);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(sellWon + voidWon).isEqualTo(12);
    }

    private static Throwable failure(Future<?> future) throws Exception {
        try {
            future.get(60, TimeUnit.SECONDS);
            return null;
        } catch (ExecutionException e) {
            return e.getCause();
        }
    }

    private Long newPortfolio(String name) {
        return portfolioPort.save(new Portfolio(null, USER, name, "USD", null, false, null, null)).id();
    }

    private PortfolioTransaction event(PortfolioTransactionAction action, String quantity) {
        return new PortfolioTransaction(null, portfolioId, USER, "AAPL", PortfolioAssetType.US_STOCK, action,
                new BigDecimal(quantity), new BigDecimal("100"), "USD", BigDecimal.ZERO, BigDecimal.ONE,
                LocalDate.of(2026, 10, 1), PortfolioTransactionSource.MANUAL, null, null, null);
    }
}
