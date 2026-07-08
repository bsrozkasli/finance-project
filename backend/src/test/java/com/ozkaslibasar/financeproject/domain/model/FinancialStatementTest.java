package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class FinancialStatementTest {

    @Test
    void should_constructFinancialStatement_when_allFieldsValid() {
        FinancialStatement statement = validStatement();

        assertThat(statement.symbol()).isEqualTo("AAPL");
        assertThat(statement.fiscalYear()).isEqualTo(2024);
        assertThat(statement.period()).isEqualTo("annual");
        assertThat(statement.totalAssets()).isEqualByComparingTo("500");
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "symbol", "fiscalYear", "period", "revenue", "netIncome",
            "totalAssets", "totalLiabilities", "operatingCashFlow", "grossProfit", "operatingIncome"
    })
    void should_throwNullPointerException_when_requiredFieldIsNull(String field) {
        String expectedField = field;

        assertThatThrownBy(() -> statementWithNullField(field))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining(expectedField);
    }

    @Test
    void should_throwIllegalArgumentException_when_symbolIsBlank() {
        assertThatThrownBy(() -> new FinancialStatement(
                "   ",
                2024,
                "annual",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(300),
                BigDecimal.valueOf(220)
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbol");
    }

    @Test
    void should_throwIllegalArgumentException_when_periodIsBlank() {
        assertThatThrownBy(() -> new FinancialStatement(
                "AAPL",
                2024,
                " ",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(300),
                BigDecimal.valueOf(220)
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("period");
    }

    @Test
    void should_throwIllegalArgumentException_when_fiscalYearIsNonPositive() {
        assertThatThrownBy(() -> new FinancialStatement(
                "AAPL",
                0,
                "annual",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(300),
                BigDecimal.valueOf(220)
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("positive");
    }

    @Test
    void should_throwIllegalArgumentException_when_totalAssetsIsNegative() {
        assertThatThrownBy(() -> new FinancialStatement(
                "AAPL",
                2024,
                "annual",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(100),
                BigDecimal.valueOf(-1),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(300),
                BigDecimal.valueOf(220)
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("totalAssets");
    }

    private FinancialStatement statementWithNullField(String field) {
        String symbol = "AAPL";
        Integer fiscalYear = 2024;
        String period = "annual";
        BigDecimal revenue = BigDecimal.valueOf(1000);
        BigDecimal netIncome = BigDecimal.valueOf(120);
        BigDecimal totalAssets = BigDecimal.valueOf(500);
        BigDecimal totalLiabilities = BigDecimal.valueOf(200);
        BigDecimal operatingCashFlow = BigDecimal.valueOf(150);
        BigDecimal grossProfit = BigDecimal.valueOf(400);
        BigDecimal operatingIncome = BigDecimal.valueOf(250);

        switch (field) {
            case "symbol" -> symbol = null;
            case "fiscalYear" -> fiscalYear = null;
            case "period" -> period = null;
            case "revenue" -> revenue = null;
            case "netIncome" -> netIncome = null;
            case "totalAssets" -> totalAssets = null;
            case "totalLiabilities" -> totalLiabilities = null;
            case "operatingCashFlow" -> operatingCashFlow = null;
            case "grossProfit" -> grossProfit = null;
            case "operatingIncome" -> operatingIncome = null;
            default -> throw new IllegalStateException("Unexpected field: " + field);
        }

        return new FinancialStatement(
                symbol,
                fiscalYear,
                period,
                revenue,
                netIncome,
                totalAssets,
                totalLiabilities,
                operatingCashFlow,
                grossProfit,
                operatingIncome
        );
    }

    private FinancialStatement validStatement() {
        return new FinancialStatement(
                "AAPL",
                2024,
                "annual",
                BigDecimal.valueOf(1000),
                BigDecimal.valueOf(120),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(200),
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(400),
                BigDecimal.valueOf(250)
        );
    }
}

