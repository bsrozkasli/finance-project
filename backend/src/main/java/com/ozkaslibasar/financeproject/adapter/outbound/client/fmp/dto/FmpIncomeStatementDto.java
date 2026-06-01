package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO for a single record from the FMP stable income-statement API.
 *
 * <p>Endpoint: {@code GET /stable/income-statement?symbol={symbol}&apikey={key}}</p>
 *
 * <p>Example FMP response fields used here (all others ignored):
 * <pre>
 * {
 *   "symbol": "AAPL",
 *   "calendarYear": "2024",
 *   "period": "annual",       // or "Q1", "Q2", "Q3", "Q4"
 *   "revenue": 391035000000,
 *   "netIncome": 93736000000,
 *   "operatingCashFlow": null // may be null for older records
 * }
 * </pre>
 * </p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FmpIncomeStatementDto {

    private String symbol;

    /** Four-digit fiscal year as a string (e.g. {@code "2024"}). */
    @JsonProperty("calendarYear")
    private String calendarYear;

    /** {@code "annual"}, {@code "Q1"}, {@code "Q2"}, {@code "Q3"}, or {@code "Q4"}. */
    private String period;

    private BigDecimal revenue;

    private BigDecimal netIncome;

    /** May be {@code null} for some records; treated as ZERO downstream. */
    private BigDecimal operatingCashFlow;
}
