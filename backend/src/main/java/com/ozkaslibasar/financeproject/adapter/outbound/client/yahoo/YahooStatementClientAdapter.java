package com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialStatementClientPort;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Adapter implementing {@link FinancialStatementClientPort} by proxying the local
 * FastAPI data-service, which fetches fundamentals from Yahoo Finance (yfinance).
 *
 * <p>Endpoint called: {@code GET /api/v1/research/fundamental/{symbol}}</p>
 *
 * <p>This adapter fetches statement data from Yahoo-compatible sources.
 * Financial statement data is now zero-cost and provider-agnostic.</p>
 *
 * <p>Errors (network, empty response, parse failures) are caught and logged;
 * the adapter always returns empty lists rather than propagating exceptions,
 * so the caller ({@link com.ozkaslibasar.financeproject.domain.service.AgentAnalysisUseCase})
 * can apply its own graceful-degradation logic.</p>
 */
@Component
@Slf4j
public class YahooStatementClientAdapter implements FinancialStatementClientPort {

    private final RestTemplate restTemplate;
    private final MeterRegistry meterRegistry;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String dataServiceBaseUrl;

    public YahooStatementClientAdapter(RestTemplate restTemplate, MeterRegistry meterRegistry) {
        this.restTemplate = restTemplate;
        this.meterRegistry = meterRegistry;
    }

    /**
     * {@inheritDoc}
     *
     * <p>Calls {@code GET /api/v1/research/fundamental/{symbol}} on the local
     * data-service and maps the income-statement fields to domain records.</p>
     */
    @Override
    public List<FinancialStatement> fetchIncomeStatements(String symbol) {
        FundamentalResponse response = fetchFundamental(symbol);
        if (response == null || response.getMetrics() == null) {
            return Collections.emptyList();
        }

        try {
            if (isIncomeStatementMissing(response.getMetrics())) {
                log.warn("Income statement fields unavailable for {}; skipping statement mapping", symbol);
                return Collections.emptyList();
            }
            FinancialStatement stmt = new FinancialStatement(
                    symbol,
                    parseYear(response.getFiscalYear()).orElseThrow(() ->
                            new IllegalArgumentException("missing fiscal year")),
                    "annual",
                    orZero(response.getMetrics().getRevenue()),
                    orZero(response.getMetrics().getNetIncome()),
                    BigDecimal.ZERO,  // filled by balance sheet
                    BigDecimal.ZERO,  // filled by balance sheet
                    orZero(response.getMetrics().getOperatingCashFlow()),
                    BigDecimal.ZERO,  // filled by income statement
                    BigDecimal.ZERO   // filled by income statement
            );
            meterRegistry.counter("data.ingestion.success", "provider", "YahooStatement").increment();
            return List.of(stmt);
        } catch (Exception e) {
            log.error("Failed to map income statement for {}: {}", symbol, e.getMessage());
            meterRegistry.counter("data.ingestion.error", "provider", "YahooStatement").increment();
            return Collections.emptyList();
        }
    }

    /**
     * {@inheritDoc}
     *
     * <p>Calls the same {@code /api/v1/research/fundamental/{symbol}} endpoint
     * and maps the balance-sheet fields to domain records.</p>
     */
    @Override
    public List<FinancialStatement> fetchBalanceSheets(String symbol) {
        FundamentalResponse response = fetchFundamental(symbol);
        if (response == null || response.getMetrics() == null) {
            return Collections.emptyList();
        }

        try {
            if (isBalanceSheetMissing(response.getMetrics())) {
                log.warn("Balance sheet fields unavailable for {}; skipping statement mapping", symbol);
                return Collections.emptyList();
            }
            FinancialStatement stmt = new FinancialStatement(
                    symbol,
                    parseYear(response.getFiscalYear()).orElseThrow(() ->
                            new IllegalArgumentException("missing fiscal year")),
                    "annual",
                    BigDecimal.ZERO,  // filled by income statement
                    BigDecimal.ZERO,  // filled by income statement
                    orZero(response.getMetrics().getTotalAssets()),
                    orZero(response.getMetrics().getTotalLiabilities()),
                    BigDecimal.ZERO,   // filled by income statement
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
            );
            meterRegistry.counter("data.ingestion.success", "provider", "YahooStatement").increment();
            return List.of(stmt);
        } catch (Exception e) {
            log.error("Failed to map balance sheet for {}: {}", symbol, e.getMessage());
            meterRegistry.counter("data.ingestion.error", "provider", "YahooStatement").increment();
            return Collections.emptyList();
        }
    }

    // ─── private helpers ────────────────────────────────────────────────────────

    private FundamentalResponse fetchFundamental(String symbol) {
        String url = dataServiceBaseUrl + "/api/v1/research/fundamental/" + symbol;
        try {
            log.info("Fetching fundamental data for {} from data-service: {}", symbol, url);
            FundamentalResponse response = restTemplate.getForObject(url, FundamentalResponse.class);
            if (response == null) {
                log.warn("Data-service returned null fundamental response for symbol={}", symbol);
            }
            return response;
        } catch (Exception e) {
            log.error("Failed to fetch fundamental data for {} from data-service: {}", symbol, e.getMessage());
            meterRegistry.counter("data.ingestion.error", "provider", "YahooStatement").increment();
            return null;
        }
    }

    private BigDecimal orZero(Double value) {
        if (value == null) return BigDecimal.ZERO;
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }

    private Optional<Integer> parseYear(String fiscalYear) {
        if (fiscalYear == null || fiscalYear.isBlank()) return Optional.empty();
        try {
            // FiscalYear may be "2024-09-28" or just "2024" from the data-service
            String yearPart = fiscalYear.length() >= 4 ? fiscalYear.substring(0, 4) : fiscalYear;
            int year = Integer.parseInt(yearPart);
            return year > 0 ? Optional.of(year) : Optional.empty();
        } catch (NumberFormatException e) {
            log.warn("Could not parse fiscal year '{}'; skipping statement mapping", fiscalYear);
            return Optional.empty();
        }
    }

    private boolean isIncomeStatementMissing(FundamentalMetrics metrics) {
        return metrics.getRevenue() == null
                && metrics.getNetIncome() == null
                && metrics.getOperatingCashFlow() == null;
    }

    private boolean isBalanceSheetMissing(FundamentalMetrics metrics) {
        return metrics.getTotalAssets() == null
                && metrics.getTotalLiabilities() == null;
    }

    // ─── DTO classes for JSON deserialization ───────────────────────────────────

    /**
     * Mirrors the {@code FundamentalAnalysisResponse} model from the data-service.
     */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FundamentalResponse {
        private String symbol;

        @JsonProperty("fiscal_year")
        private String fiscalYear;

        private String currency;
        private FundamentalMetrics metrics;
    }

    /**
     * Mirrors the {@code FundamentalMetrics} Pydantic model from the data-service.
     *
     * <p>Only the fields required for {@link FinancialStatement} mapping are declared;
     * all other fields are silently ignored via {@code @JsonIgnoreProperties}.</p>
     */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class FundamentalMetrics {
        // Income statement fields (surfaced via yfinance .financials)
        @JsonProperty("free_cash_flow")
        private Double freeCashFlow;

        @JsonProperty("fcf_margin")
        private Double fcfMargin;

        // Revenue and income must be sourced from the raw statements — not present in
        // FundamentalMetrics by default. We add them as optional extensions here,
        // populated by the extended /api/v1/research/fundamental/{symbol} response.
        private Double revenue;

        @JsonProperty("net_income")
        private Double netIncome;

        @JsonProperty("operating_cash_flow")
        private Double operatingCashFlow;

        @JsonProperty("total_assets")
        private Double totalAssets;

        @JsonProperty("total_liabilities")
        private Double totalLiabilities;
    }
}
