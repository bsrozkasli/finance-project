package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp;

import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpBalanceSheetDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpIncomeStatementDto;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialStatementClientPort;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Adapter implementing {@link FinancialStatementClientPort} using the FMP stable API.
 *
 * <p>Strict rate-limit discipline: every public method is annotated with
 * {@code @RateLimiter(name = "fmpApi")} to stay within the 250 req/day quota.
 * Both income-statement and balance-sheet calls count against this limit.</p>
 *
 * <p>Missing or null BigDecimal values in FMP responses are defaulted to
 * {@link BigDecimal#ZERO} rather than propagating nulls into the domain record,
 * which would violate the compact constructor's non-null invariant.</p>
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FmpStatementClientAdapter implements FinancialStatementClientPort {

    /** Number of historical periods to request (covers ~5 years quarterly). */
    private static final int DEFAULT_LIMIT = 20;

    private final FmpClient fmpClient;
    private final MeterRegistry meterRegistry;

    @Value("${FMP_API_KEY:}")
    private String apiKey;

    /**
     * {@inheritDoc}
     *
     * <p>Calls {@code GET /stable/income-statement?symbol={symbol}&period=annual}
     * and maps each record to a {@link FinancialStatement} domain model.
     * {@code totalAssets} and {@code totalLiabilities} are set to ZERO here;
     * they are populated by {@link #fetchBalanceSheets}.</p>
     */
    @Override
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    public List<FinancialStatement> fetchIncomeStatements(String symbol) {
        try {
            log.info("Fetching FMP income statements for symbol={}", symbol);
            List<FmpIncomeStatementDto> response =
                    fmpClient.getIncomeStatements(symbol, "annual", DEFAULT_LIMIT, apiKey);

            if (response == null || response.isEmpty()) {
                log.warn("FMP returned no income statements for symbol={}", symbol);
                meterRegistry.counter("data.ingestion.success", "provider", "FMP").increment();
                return Collections.emptyList();
            }

            List<FinancialStatement> result = response.stream()
                    .map(this::toFinancialStatement)
                    .collect(Collectors.toList());
            meterRegistry.counter("data.ingestion.success", "provider", "FMP").increment();
            return result;

        } catch (Exception e) {
            log.error("Failed to fetch FMP income statements for symbol={}: {}", symbol, e.getMessage());
            meterRegistry.counter("data.ingestion.error", "provider", "FMP").increment();
            return Collections.emptyList();
        }
    }

    /**
     * {@inheritDoc}
     *
     * <p>Calls {@code GET /stable/balance-sheet-statement?symbol={symbol}&period=annual}
     * and maps each record. {@code revenue}, {@code netIncome}, and
     * {@code operatingCashFlow} are set to ZERO; they are populated by
     * {@link #fetchIncomeStatements} and merged at the service layer.</p>
     */
    @Override
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    public List<FinancialStatement> fetchBalanceSheets(String symbol) {
        try {
            log.info("Fetching FMP balance sheets for symbol={}", symbol);
            List<FmpBalanceSheetDto> response =
                    fmpClient.getBalanceSheets(symbol, "annual", DEFAULT_LIMIT, apiKey);

            if (response == null || response.isEmpty()) {
                log.warn("FMP returned no balance sheets for symbol={}", symbol);
                meterRegistry.counter("data.ingestion.success", "provider", "FMP").increment();
                return Collections.emptyList();
            }

            List<FinancialStatement> result = response.stream()
                    .map(this::toFinancialStatement)
                    .collect(Collectors.toList());
            meterRegistry.counter("data.ingestion.success", "provider", "FMP").increment();
            return result;

        } catch (Exception e) {
            log.error("Failed to fetch FMP balance sheets for symbol={}: {}", symbol, e.getMessage());
            meterRegistry.counter("data.ingestion.error", "provider", "FMP").increment();
            return Collections.emptyList();
        }
    }


    // ─── private helpers ────────────────────────────────────────────────────────

    private FinancialStatement toFinancialStatement(FmpIncomeStatementDto dto) {
        return new FinancialStatement(
                dto.getSymbol(),
                parseYear(dto.getCalendarYear()),
                dto.getPeriod() != null ? dto.getPeriod() : "annual",
                orZero(dto.getRevenue()),
                orZero(dto.getNetIncome()),
                BigDecimal.ZERO,   // totalAssets: filled by balance-sheet call
                BigDecimal.ZERO,   // totalLiabilities: filled by balance-sheet call
                orZero(dto.getOperatingCashFlow()),
                orZero(dto.getGrossProfit()),
                orZero(dto.getOperatingIncome())
        );
    }

    private FinancialStatement toFinancialStatement(FmpBalanceSheetDto dto) {
        return new FinancialStatement(
                dto.getSymbol(),
                parseYear(dto.getCalendarYear()),
                dto.getPeriod() != null ? dto.getPeriod() : "annual",
                BigDecimal.ZERO,   // revenue: filled by income-statement call
                BigDecimal.ZERO,   // netIncome: filled by income-statement call
                orZero(dto.getTotalAssets()),
                orZero(dto.getTotalLiabilities()),
                BigDecimal.ZERO,   // operatingCashFlow: filled by income-statement call
                BigDecimal.ZERO,   // grossProfit: filled by income-statement call
                BigDecimal.ZERO    // operatingIncome: filled by income-statement call
        );
    }

    /** Safely parse "2024" → 2024; defaults to current year on parse failure. */
    private int parseYear(String calendarYear) {
        try {
            return Integer.parseInt(calendarYear);
        } catch (NumberFormatException | NullPointerException e) {
            log.warn("Could not parse calendarYear='{}'; defaulting to 2000", calendarYear);
            return 2000;
        }
    }

    /** Replaces null with BigDecimal.ZERO to satisfy domain-record non-null invariants. */
    private BigDecimal orZero(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
