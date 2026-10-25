package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportBatchStatus;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioCsvImportPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.DuplicateOriginLocatorException;
import com.ozkaslibasar.financeproject.domain.service.PortfolioCsvImportService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-002 Task 4 / D-4: CSV staging persistence and the (source, origin_locator) uniqueness that makes
 * concurrent acceptance create one event per identity. Real PostgreSQL: the unique index is database behaviour.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioCsvImportRepositoryAdapterTest {

    private static final String USER = "default";
    private static final String HEADER =
            "trade_date,action,symbol,asset_type,quantity,price,currency,fee,fx_rate_to_base,notes\n";

    @Autowired
    private PortfolioCsvImportService service;
    @Autowired
    private PortfolioLedgerService ledger;
    @Autowired
    private PortfolioCsvImportPort importPort;
    @Autowired
    private PortfolioTransactionPort transactionPort;
    @Autowired
    private PortfolioPort portfolioPort;
    @Autowired
    private JdbcTemplate jdbc;

    private Long portfolioId;
    private Long secondPortfolioId;

    @AfterEach
    void cleanUp() {
        // Cascades remove batches, rows and ledger events, which also frees their reserved locators.
        if (portfolioId != null) {
            jdbc.update("DELETE FROM portfolios WHERE id = ?", portfolioId);
        }
        if (secondPortfolioId != null) {
            jdbc.update("DELETE FROM portfolios WHERE id = ?", secondPortfolioId);
        }
    }

    private Long newPortfolio(String name) {
        return portfolioPort.save(new Portfolio(null, USER, name, "USD", null, false, null, null)).id();
    }

    private static byte[] csv(String... lines) {
        return (HEADER + String.join("\n", lines) + "\n").getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void roundTripsStagedBatchWithParsedValuesAndInvalidRows() {
        portfolioId = newPortfolio("CSV round trip");

        CsvImportBatch staged = service.stage(portfolioId, USER, csv(
                "2026-10-01,BUY,AAPL,US_STOCK,10.5,100.25,USD,1.5,1,\"hello, \"\"csv\"\"\"",
                "not-a-date,BUY,AAPL,US_STOCK,1,1,USD,0,1,"));
        CsvImportBatch loaded = importPort.findByIdAndPortfolioIdAndUserId(staged.id(), portfolioId, USER).orElseThrow();

        assertThat(loaded.status()).isEqualTo(CsvImportBatchStatus.STAGED);
        assertThat(loaded.fileSha256()).isEqualTo(staged.fileSha256()).hasSize(64);
        assertThat(loaded.createdAt()).isNotNull();
        assertThat(loaded.acceptedAt()).isNull();
        assertThat(loaded.rows()).hasSize(2);
        CsvImportRow valid = loaded.rows().get(0);
        assertThat(valid.rowNumber()).isEqualTo(1);
        assertThat(valid.status()).isEqualTo(CsvImportRowStatus.VALID);
        assertThat(valid.originLocator()).startsWith("csv:");
        assertThat(valid.rawLine()).contains("AAPL");
        assertThat(valid.transaction().quantity()).isEqualByComparingTo("10.5");
        assertThat(valid.transaction().price()).isEqualByComparingTo("100.25");
        assertThat(valid.transaction().fee()).isEqualByComparingTo("1.5");
        assertThat(valid.transaction().notes()).isEqualTo("hello, \"csv\"");
        assertThat(valid.transaction().source()).isEqualTo(PortfolioTransactionSource.CSV);
        CsvImportRow invalid = loaded.rows().get(1);
        assertThat(invalid.status()).isEqualTo(CsvImportRowStatus.INVALID);
        assertThat(invalid.originLocator()).isNull();
        assertThat(invalid.transaction()).isNull();
        assertThat(invalid.message()).isNotBlank();
        assertThat(importPort.findByIdAndPortfolioIdAndUserId(staged.id(), portfolioId, "someone-else")).isEmpty();
        assertThat(importPort.findByIdAndPortfolioIdAndUserId(staged.id(), portfolioId + 999, USER)).isEmpty();
    }

    @Test
    void rowResultAndAcceptanceAreConditionalAndHappenOnce() {
        portfolioId = newPortfolio("CSV conditional");
        CsvImportBatch staged = service.stage(portfolioId, USER,
                csv("2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,"));
        Long rowId = staged.rows().get(0).id();

        assertThat(importPort.recordRowResult(rowId, CsvImportRowStatus.REJECTED, "nope", null)).isTrue();
        assertThat(importPort.recordRowResult(rowId, CsvImportRowStatus.ACCEPTED, null, 1L)).isFalse();
        assertThat(importPort.markAccepted(staged.id(), Instant.parse("2026-10-25T10:00:00Z"))).isTrue();
        assertThat(importPort.markAccepted(staged.id(), Instant.parse("2026-10-26T10:00:00Z"))).isFalse();

        CsvImportBatch loaded = importPort.findByIdAndPortfolioIdAndUserId(staged.id(), portfolioId, USER).orElseThrow();
        assertThat(loaded.status()).isEqualTo(CsvImportBatchStatus.ACCEPTED);
        assertThat(loaded.acceptedAt()).isEqualTo(Instant.parse("2026-10-25T10:00:00Z"));
        assertThat(loaded.rows().get(0).status()).isEqualTo(CsvImportRowStatus.REJECTED);
        assertThat(loaded.rows().get(0).message()).isEqualTo("nope");
    }

    @Test
    void existenceCheckCountsVoidedEventsAndConflictingInsertRaisesDomainException() {
        portfolioId = newPortfolio("CSV exists");
        CsvImportBatch staged = service.stage(portfolioId, USER,
                csv("2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,"));
        String locator = staged.rows().get(0).originLocator();
        assertThat(transactionPort.existsBySourceAndOriginLocator(PortfolioTransactionSource.CSV, locator)).isFalse();

        CsvImportBatch accepted = service.accept(portfolioId, USER, staged.id()).orElseThrow();
        Long eventId = accepted.rows().get(0).transactionId();
        assertThat(eventId).isNotNull();
        assertThat(transactionPort.existsBySourceAndOriginLocator(PortfolioTransactionSource.CSV, locator)).isTrue();
        assertThat(transactionPort.existsBySourceAndOriginLocator(PortfolioTransactionSource.MANUAL, locator)).isFalse();

        transactionPort.voidByIdAndPortfolioIdAndUserId(eventId, portfolioId, USER, Instant.now());
        assertThat(transactionPort.existsBySourceAndOriginLocator(PortfolioTransactionSource.CSV, locator)).isTrue();

        PortfolioTransaction again = service.stage(portfolioId, USER,
                csv("2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,")).rows().get(0).transaction();
        PortfolioTransaction conflicting = new PortfolioTransaction(null, portfolioId, USER, again.symbol(),
                again.assetType(), again.action(), again.quantity(), again.price(), again.currency(), again.fee(),
                again.fxRateToBase(), again.tradeDate(), PortfolioTransactionSource.CSV, null, null, null, locator);
        assertThatThrownBy(() -> transactionPort.save(conflicting)).isInstanceOf(DuplicateOriginLocatorException.class);
    }

    @Test
    void reimportAfterAcceptanceIsAllDuplicate() {
        portfolioId = newPortfolio("CSV reimport");
        byte[] file = csv("2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,", "2026-10-02,SELL,AAPL,US_STOCK,4,110,USD,0,1,");
        service.accept(portfolioId, USER, service.stage(portfolioId, USER, file).id());

        CsvImportBatch again = service.stage(portfolioId, USER, csv(
                "2026-10-02,SELL,AAPL,US_STOCK,4,110,USD,0,1,", "2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,"));

        assertThat(again.rows()).extracting(CsvImportRow::status).containsOnly(CsvImportRowStatus.DUPLICATE);
        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).hasSize(2);
    }

    @Test
    void concurrentAcceptOfTwoBatchesWithTheSameRowsCreatesOneEventPerLocator() throws Exception {
        portfolioId = newPortfolio("CSV concurrent");
        String[] lines = new String[25];
        for (int i = 0; i < lines.length; i++) {
            lines[i] = "2026-10-01,BUY,AAPL,US_STOCK,1," + (100 + i) + ",USD,0,1,";
        }
        CsvImportBatch one = service.stage(portfolioId, USER, csv(lines));
        CsvImportBatch two = service.stage(portfolioId, USER, csv(lines));
        assertThat(one.rows()).extracting(CsvImportRow::status).containsOnly(CsvImportRowStatus.VALID);
        assertThat(two.rows()).extracting(CsvImportRow::status).containsOnly(CsvImportRowStatus.VALID);

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Future<CsvImportBatch>> results = pool.invokeAll(List.<Callable<CsvImportBatch>>of(
                    () -> {
                        barrier.await(20, TimeUnit.SECONDS);
                        return service.accept(portfolioId, USER, one.id()).orElseThrow();
                    },
                    () -> {
                        barrier.await(20, TimeUnit.SECONDS);
                        return service.accept(portfolioId, USER, two.id()).orElseThrow();
                    }));
            List<CsvImportBatch> done = List.of(results.get(0).get(60, TimeUnit.SECONDS),
                    results.get(1).get(60, TimeUnit.SECONDS));

            assertThat(done).allSatisfy(b -> assertThat(b.status()).isEqualTo(CsvImportBatchStatus.ACCEPTED));
            List<Map<String, Object>> events = jdbc.queryForList(
                    "SELECT origin_locator, COUNT(*) AS n FROM portfolio_transactions "
                            + "WHERE portfolio_id = ? AND source = 'CSV' GROUP BY origin_locator", portfolioId);
            assertThat(events).hasSize(lines.length);
            assertThat(events).allSatisfy(e -> assertThat(((Number) e.get("n")).intValue()).isEqualTo(1));

            // Every locator is ACCEPTED in exactly one batch and DUPLICATE in the other.
            Map<String, List<CsvImportRowStatus>> byLocator = done.stream().flatMap(b -> b.rows().stream())
                    .collect(Collectors.groupingBy(CsvImportRow::originLocator,
                            Collectors.mapping(CsvImportRow::status, Collectors.toList())));
            assertThat(byLocator).hasSize(lines.length);
            assertThat(byLocator.values()).allSatisfy(statuses -> assertThat(statuses)
                    .containsExactlyInAnyOrder(CsvImportRowStatus.ACCEPTED, CsvImportRowStatus.DUPLICATE));
        } finally {
            pool.shutdownNow();
        }
        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).hasSize(lines.length);
    }

    @Test
    void concurrentAcceptOfTheSameBatchEndsWithEveryRowAcceptedAndOneEventPerLocator() throws Exception {
        portfolioId = newPortfolio("CSV same batch");
        String[] lines = new String[25];
        for (int i = 0; i < lines.length; i++) {
            lines[i] = "2026-10-01,BUY,AAPL,US_STOCK,1," + (100 + i) + ",USD,0,1,";
        }
        CsvImportBatch batch = service.stage(portfolioId, USER, csv(lines));

        CyclicBarrier barrier = new CyclicBarrier(2);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<CsvImportBatch> accept = () -> {
                barrier.await(20, TimeUnit.SECONDS);
                return service.accept(portfolioId, USER, batch.id()).orElseThrow();
            };
            List<Future<CsvImportBatch>> results = pool.invokeAll(List.of(accept, accept));
            results.get(0).get(60, TimeUnit.SECONDS);
            results.get(1).get(60, TimeUnit.SECONDS);
        } finally {
            pool.shutdownNow();
        }

        CsvImportBatch loaded = importPort.findByIdAndPortfolioIdAndUserId(batch.id(), portfolioId, USER).orElseThrow();
        assertThat(loaded.status()).isEqualTo(CsvImportBatchStatus.ACCEPTED);
        assertThat(loaded.rows()).extracting(CsvImportRow::status).containsOnly(CsvImportRowStatus.ACCEPTED);
        assertThat(loaded.rows()).extracting(CsvImportRow::transactionId).doesNotContainNull().doesNotHaveDuplicates();
        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).hasSize(lines.length)
                .extracting(PortfolioTransaction::id)
                .containsExactlyInAnyOrderElementsOf(loaded.rows().stream().map(CsvImportRow::transactionId).toList());
    }

    @Test
    void sameRowsInAnotherPortfolioAreNotDuplicates() {
        portfolioId = newPortfolio("CSV portfolio A");
        secondPortfolioId = newPortfolio("CSV portfolio B");
        byte[] file = csv("2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,");
        service.accept(portfolioId, USER, service.stage(portfolioId, USER, file).id());

        CsvImportBatch other = service.stage(secondPortfolioId, USER, file);

        assertThat(other.rows()).extracting(CsvImportRow::status).containsExactly(CsvImportRowStatus.VALID);
        CsvImportBatch accepted = service.accept(secondPortfolioId, USER, other.id()).orElseThrow();
        assertThat(accepted.rows()).extracting(CsvImportRow::status).containsExactly(CsvImportRowStatus.ACCEPTED);
    }

    @Test
    void concurrentSellsOfTheSameHoldingCannotBothSucceed() throws Exception {
        for (int round = 0; round < 3; round++) {
            Long id = newPortfolio("Oversell " + round);
            try {
                ledger.addTransaction(trade(id, PortfolioTransactionAction.BUY, "10", "2026-10-01"));
                CyclicBarrier barrier = new CyclicBarrier(2);
                ExecutorService pool = Executors.newFixedThreadPool(2);
                try {
                    Callable<Boolean> sell = () -> {
                        barrier.await(20, TimeUnit.SECONDS);
                        try {
                            ledger.addTransaction(trade(id, PortfolioTransactionAction.SELL, "6", "2026-10-02"));
                            return true;
                        } catch (IllegalArgumentException e) {
                            return false;
                        }
                    };
                    List<Future<Boolean>> results = pool.invokeAll(List.of(sell, sell));
                    boolean first = results.get(0).get(60, TimeUnit.SECONDS);
                    boolean second = results.get(1).get(60, TimeUnit.SECONDS);
                    assertThat(first ^ second).as("exactly one sell succeeds").isTrue();
                } finally {
                    pool.shutdownNow();
                }
                assertThat(ledger.calculateHoldings(id, USER)).singleElement()
                        .satisfies(h -> assertThat(h.quantity()).isEqualByComparingTo("4"));
            } finally {
                jdbc.update("DELETE FROM portfolios WHERE id = ?", id);
            }
        }
    }

    private static PortfolioTransaction trade(Long portfolio, PortfolioTransactionAction action, String quantity,
                                              String date) {
        return new PortfolioTransaction(null, portfolio, USER, "AAPL", PortfolioAssetType.US_STOCK, action,
                new java.math.BigDecimal(quantity), new java.math.BigDecimal("100"), "USD", java.math.BigDecimal.ZERO,
                java.math.BigDecimal.ONE, java.time.LocalDate.parse(date), PortfolioTransactionSource.MANUAL, null,
                null, null);
    }

    @Test
    void deletingThePortfolioCascadesToItsBatches() {
        secondPortfolioId = newPortfolio("CSV cascade");
        CsvImportBatch staged = service.stage(secondPortfolioId, USER,
                csv("2026-10-01,BUY,AAPL,US_STOCK,10,100,USD,0,1,"));
        jdbc.update("DELETE FROM portfolios WHERE id = ?", secondPortfolioId);
        secondPortfolioId = null;

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM portfolio_csv_imports WHERE id = ?", Integer.class,
                staged.id())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM portfolio_csv_import_rows WHERE batch_id = ?",
                Integer.class, staged.id())).isZero();
    }
}
