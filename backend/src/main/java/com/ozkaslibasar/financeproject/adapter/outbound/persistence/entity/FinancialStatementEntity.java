package com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * JPA Entity representing one period of a company's financial statement.
 *
 * <p>Keyed on {@code (symbol, fiscalYear, period)} to enforce upsert idempotency
 * during ingestion. All monetary values use BigDecimal with precision=26, scale=4
 * to safely handle large-cap balance sheet figures.</p>
 */
@Entity
@Table(
    name = "financial_statements",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_statement_symbol_year_period",
            columnNames = {"symbol", "fiscal_year", "period"}
        )
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FinancialStatementEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "symbol", nullable = false, length = 20)
    private String symbol;

    @Column(name = "fiscal_year", nullable = false)
    private Integer fiscalYear;

    @Column(name = "period", nullable = false, length = 10)
    private String period;

    @Column(name = "revenue", nullable = false, precision = 26, scale = 4)
    private BigDecimal revenue;

    @Column(name = "net_income", nullable = false, precision = 26, scale = 4)
    private BigDecimal netIncome;

    @Column(name = "total_assets", nullable = false, precision = 26, scale = 4)
    private BigDecimal totalAssets;

    @Column(name = "total_liabilities", nullable = false, precision = 26, scale = 4)
    private BigDecimal totalLiabilities;

    @Column(name = "operating_cash_flow", nullable = false, precision = 26, scale = 4)
    private BigDecimal operatingCashFlow;

    @Column(name = "gross_profit", nullable = false, precision = 26, scale = 4)
    private BigDecimal grossProfit;

    @Column(name = "operating_income", nullable = false, precision = 26, scale = 4)
    private BigDecimal operatingIncome;
}
