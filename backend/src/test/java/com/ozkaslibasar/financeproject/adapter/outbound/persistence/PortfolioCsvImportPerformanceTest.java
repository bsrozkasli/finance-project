package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import java.math.BigDecimal;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioCsvImportService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * R-21 guard: staging and accepting a valid file at the 5,000-row limit on real PostgreSQL. The elapsed times are
 * printed so the measured value can be recorded; the assertion is a generous regression guard, not the target.
 * The 300-row back-dated case (R-30) runs by default (the harder path; appended rows are covered by the opt-in run); the 5,000-row cases need {@code -Dcsv.perf=true} (R-25).
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioCsvImportPerformanceTest {

    private static final String USER = "default";
    private static final int SYMBOLS = 50;
    private static final Duration ACCEPT_GUARD = Duration.ofSeconds(60);
    private static final Duration BACK_DATED_GUARD = Duration.ofSeconds(90);
    private static final Duration SMALL_GUARD = Duration.ofSeconds(60);

    @Autowired
    private PortfolioCsvImportService service;
    @Autowired
    private PortfolioPort portfolioPort;
    @Autowired
    private PortfolioLedgerService ledger;
    @Autowired
    private JdbcTemplate jdbc;

    private Long portfolioId;

    @AfterEach
    void cleanUp() {
        if (portfolioId != null) {
            jdbc.update("DELETE FROM portfolios WHERE id = ?", portfolioId);
        }
    }

    @Test
    void stagesAndAcceptsThreeHundredBackDatedRowsWithinTheBound() {
        measure(300, true, SMALL_GUARD);
    }

    /** Opt-in (R-25): {@code -Dcsv.perf=true}; the row count can be lowered with {@code -Dcsv.perf.rows=N}. */
    @Test
    @EnabledIfSystemProperty(named = "csv.perf", matches = "true")
    void stagesAndAcceptsAFullFileOfAppendedRows() {
        measure(Integer.getInteger("csv.perf.rows", 5000), false, ACCEPT_GUARD);
    }

    /** Opt-in (R-24/R-25): a historical file into a portfolio that already holds newer events. */
    @Test
    @EnabledIfSystemProperty(named = "csv.perf", matches = "true")
    void stagesAndAcceptsAFullFileOfBackDatedRows() {
        measure(Integer.getInteger("csv.perf.rows", 5000), true, BACK_DATED_GUARD);
    }

    private void measure(int rows, boolean backDated, Duration guard) {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "CSV performance", "USD", null, false, null, null))
                .id();
        if (backDated) {
            for (int s = 0; s < SYMBOLS; s++) {
                ledger.addTransaction(new PortfolioTransaction(null, portfolioId, USER, "SYM" + s,
                        PortfolioAssetType.US_STOCK, PortfolioTransactionAction.BUY, new BigDecimal("1000"),
                        new BigDecimal("100"), "USD", BigDecimal.ZERO, BigDecimal.ONE,
                        LocalDate.parse("2026-06-01"), PortfolioTransactionSource.MANUAL, null, null, null));
            }
        }
        byte[] file = buildFile(rows);

        long stageStart = System.nanoTime();
        CsvImportBatch staged = service.stage(portfolioId, USER, file);
        Duration stageTime = Duration.ofNanos(System.nanoTime() - stageStart);
        assertThat(staged.rows()).hasSize(rows).extracting(CsvImportRow::status)
                .containsOnly(CsvImportRowStatus.VALID);

        long acceptStart = System.nanoTime();
        CsvImportBatch accepted = service.accept(portfolioId, USER, staged.id()).orElseThrow();
        Duration acceptTime = Duration.ofNanos(System.nanoTime() - acceptStart);

        System.out.printf("R-21 MEASURE rows=%d backDated=%b stage=%d ms accept=%d ms%n", rows, backDated,
                stageTime.toMillis(), acceptTime.toMillis());
        assertThat(accepted.rows()).extracting(CsvImportRow::status).containsOnly(CsvImportRowStatus.ACCEPTED);
        assertThat(acceptTime).isLessThan(guard);
    }

    /** Alternating BUY 10 / SELL 5 over {@value #SYMBOLS} symbols, one pair per day, so every SELL is covered. */
    private static byte[] buildFile(int rows) {
        StringBuilder csv = new StringBuilder(
                "trade_date,action,symbol,asset_type,quantity,price,currency,fee,fx_rate_to_base,notes\n");
        LocalDate start = LocalDate.parse("2010-01-01");
        for (int i = 0; i < rows; i++) {
            int pair = i / 2;
            boolean buy = i % 2 == 0;
            csv.append(start.plusDays(pair)).append(',').append(buy ? "BUY" : "SELL").append(",SYM")
                    .append(pair % SYMBOLS).append(",US_STOCK,").append(buy ? 10 : 5).append(',')
                    .append(100 + pair % 50).append(",USD,0,1,\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
}
