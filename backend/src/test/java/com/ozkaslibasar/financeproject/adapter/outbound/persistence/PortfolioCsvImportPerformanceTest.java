package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.CsvImportBatch;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRow;
import com.ozkaslibasar.financeproject.domain.model.CsvImportRowStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
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
 * The row count can be lowered with {@code -Dcsv.perf.rows=N} for quick local runs.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioCsvImportPerformanceTest {

    private static final String USER = "default";
    private static final int SYMBOLS = 50;
    private static final Duration ACCEPT_GUARD = Duration.ofSeconds(60);

    @Autowired
    private PortfolioCsvImportService service;
    @Autowired
    private PortfolioPort portfolioPort;
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
    void stagesAndAcceptsAFullFileWithinTheGuard() {
        int rows = Integer.getInteger("csv.perf.rows", 5000);
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "CSV performance", "USD", null, false, null, null))
                .id();
        byte[] file = buildFile(rows);

        long stageStart = System.nanoTime();
        CsvImportBatch staged = service.stage(portfolioId, USER, file);
        Duration stageTime = Duration.ofNanos(System.nanoTime() - stageStart);
        assertThat(staged.rows()).hasSize(rows).extracting(CsvImportRow::status)
                .containsOnly(CsvImportRowStatus.VALID);

        long acceptStart = System.nanoTime();
        CsvImportBatch accepted = service.accept(portfolioId, USER, staged.id()).orElseThrow();
        Duration acceptTime = Duration.ofNanos(System.nanoTime() - acceptStart);

        System.out.printf("R-21 MEASURE rows=%d stage=%d ms accept=%d ms%n", rows, stageTime.toMillis(),
                acceptTime.toMillis());
        assertThat(accepted.rows()).extracting(CsvImportRow::status).containsOnly(CsvImportRowStatus.ACCEPTED);
        assertThat(acceptTime).isLessThan(ACCEPT_GUARD);
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
