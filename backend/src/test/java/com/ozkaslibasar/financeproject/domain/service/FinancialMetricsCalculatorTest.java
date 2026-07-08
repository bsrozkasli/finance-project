package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class FinancialMetricsCalculatorTest {

    @Test
    void should_returnEmptyMap_when_statementsIsNull() {
        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(null, BigDecimal.valueOf(100));

        assertThat(metrics).isEmpty();
    }

    @Test
    void should_returnEmptyMap_when_statementsIsEmpty() {
        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(), BigDecimal.valueOf(100));

        assertThat(metrics).isEmpty();
    }

    @Test
    void should_handleDivisionByZero_for_allRatios() {
        FinancialStatement y2024 = statement(
                2024,
                "annual",
                "0",
                "10",
                "0",
                "0",
                "5",
                "0",
                "0"
        );

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(y2024), BigDecimal.valueOf(42));

        assertThat(metrics).doesNotContainKeys(
                "roe", "roa", "debt_to_equity", "net_margin", "operating_margin", "gross_margin", "roic"
        );
        assertThat(metrics.get("altman_z_score")).isEqualByComparingTo("0");
        assertThat(metrics.get("dcf_fair_value")).isEqualByComparingTo("75");
    }

    @Test
    void should_computePiotroskiScore_from_twoYears() {
        FinancialStatement y2024 = statement(2024, "annual", "1000", "100", "500", "200", "120", "400", "250");
        FinancialStatement y2023 = statement(2023, "annual", "800", "80", "450", "180", "90", "320", "160");

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(y2024, y2023), BigDecimal.valueOf(150));

        assertThat(metrics.get("piotroski_score")).isEqualByComparingTo("5");
        assertThat(metrics.get("piotroski_score")).isBetween(BigDecimal.ZERO, BigDecimal.valueOf(9));
    }

    @Test
    void should_computeAltmanZScore_when_validStatements() {
        FinancialStatement y2024 = statement(2024, "annual", "1000", "100", "500", "200", "120", "400", "250");

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(y2024), BigDecimal.valueOf(150));

        assertThat(metrics.get("altman_z_score")).isEqualByComparingTo("4.66");
    }

    @Test
    void should_computeRevenueGrowth_when_twoYearsAvailable() {
        FinancialStatement y2024 = statement(2024, "annual", "1000", "100", "500", "200", "120", "400", "250");
        FinancialStatement y2023 = statement(2023, "annual", "800", "80", "450", "180", "90", "320", "160");

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(y2024, y2023), BigDecimal.valueOf(150));

        assertThat(metrics.get("revenue_growth")).isEqualByComparingTo("25");
    }

    @Test
    void should_computeGrowthAsZero_when_onlyOneYear() {
        FinancialStatement y2024 = statement(2024, "annual", "1000", "100", "500", "200", "120", "400", "250");

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(y2024), BigDecimal.valueOf(150));

        assertThat(metrics.getOrDefault("revenue_growth", BigDecimal.ZERO)).isEqualByComparingTo("0");
        assertThat(metrics.getOrDefault("eps_growth", BigDecimal.ZERO)).isEqualByComparingTo("0");
        assertThat(metrics.getOrDefault("fcf_growth", BigDecimal.ZERO)).isEqualByComparingTo("0");
    }

    @Test
    void should_computeDcfFairValue_when_ocfIsPositive() {
        FinancialStatement y2024 = statement(2024, "annual", "1000", "100", "500", "200", "120", "400", "250");

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(y2024), BigDecimal.valueOf(150));

        assertThat(metrics.get("dcf_fair_value")).isEqualByComparingTo("1800");
        assertThat(metrics.get("intrinsic_value")).isEqualByComparingTo("1800");
    }

    @Test
    void should_computeDcfFairValueFromPrice_when_ocfIsZero() {
        FinancialStatement y2024 = statement(2024, "annual", "1000", "100", "500", "200", "0", "400", "250");

        Map<String, BigDecimal> metrics = FinancialMetricsCalculator.compute(List.of(y2024), BigDecimal.valueOf(135));

        assertThat(metrics.get("dcf_fair_value")).isEqualByComparingTo("135");
        assertThat(metrics.get("intrinsic_value")).isEqualByComparingTo("135");
    }

    @Test
    void computesRoeAndMarginsFromMergedStatements() {
        FinancialStatement y2024 = statement(2024, "annual", "1000", "100", "500", "200", "120", "400", "250");
        FinancialStatement y2023 = statement(2023, "annual", "800", "80", "450", "180", "90", "320", "160");

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

    private FinancialStatement statement(
            int fiscalYear,
            String period,
            String revenue,
            String netIncome,
            String totalAssets,
            String totalLiabilities,
            String operatingCashFlow,
            String grossProfit,
            String operatingIncome
    ) {
        return new FinancialStatement(
                "AAPL",
                fiscalYear,
                period,
                new BigDecimal(revenue),
                new BigDecimal(netIncome),
                new BigDecimal(totalAssets),
                new BigDecimal(totalLiabilities),
                new BigDecimal(operatingCashFlow),
                new BigDecimal(grossProfit),
                new BigDecimal(operatingIncome)
        );
    }
}
