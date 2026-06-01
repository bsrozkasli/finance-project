package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO for a single record from the FMP stable balance-sheet API.
 *
 * <p>Endpoint: {@code GET /stable/balance-sheet-statement?symbol={symbol}&apikey={key}}</p>
 *
 * <p>Relevant fields:
 * <pre>
 * {
 *   "symbol": "AAPL",
 *   "calendarYear": "2024",
 *   "period": "annual",
 *   "totalAssets": 364980000000,
 *   "totalLiabilities": 308030000000
 * }
 * </pre>
 * </p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FmpBalanceSheetDto {

    private String symbol;

    /** Four-digit fiscal year as a string (e.g. {@code "2024"}). */
    @JsonProperty("calendarYear")
    private String calendarYear;

    /** {@code "annual"}, {@code "Q1"}, {@code "Q2"}, {@code "Q3"}, or {@code "Q4"}. */
    private String period;

    private BigDecimal totalAssets;

    private BigDecimal totalLiabilities;
}
