package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class FinancialMetricsCalculatorTest {

    @Test
    void computesRoeAndMarginsFromMergedStatements() {
        FinancialStatement y2024 = new FinancialStatement(
                "AAPL",
                2024,
                "annual",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(120),
                BigDecimal.valueOf(400),
                BigDecimal.valueOf(250)
        );
        FinancialStatement y2023 = new FinancialStatement(
                "AAPL",
                2023,
                "annual",
                BigDecimal.valueOf(800),
                BigDecimal.valueOf(80),
                BigDecimal.valueOf(450),
                BigDecimal.valueOf(180),
                BigDecimal.valueOf(90),
                BigDecimal.valueOf(320),
                BigDecimal.valueOf(160)
        );

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(
                List.of(y2024, y2023),
                BigDecimal.valueOf(150)
        );

        assertThat(metrics).containsKeys("roe", "roa", "net_margin", "operating_margin", "gross_margin", "revenue_growth");
        assertThat(metrics.get("roe")).isPositive();
        assertThat(metrics.get("gross_margin")).isEqualByComparingTo(BigDecimal.valueOf(40));
        assertThat(metrics.get("operating_margin")).isEqualByComparingTo(BigDecimal.valueOf(25));
        assertThat(metrics.get("net_margin")).isEqualByComparingTo(BigDecimal.valueOf(10));
    }
}
