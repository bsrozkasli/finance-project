package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class PortfolioTest {

    @Test
    void should_constructPortfolio_when_allFieldsValid() {
        Portfolio portfolio = new Portfolio(
                1L,
                "user-1",
                "Growth Portfolio",
                "USD",
                "Long-term holdings",
                true,
                LocalDateTime.parse("2026-01-01T10:00:00"),
                LocalDateTime.parse("2026-01-02T10:00:00")
        );

        assertThat(portfolio.id()).isEqualTo(1L);
        assertThat(portfolio.userId()).isEqualTo("user-1");
        assertThat(portfolio.name()).isEqualTo("Growth Portfolio");
        assertThat(portfolio.baseCurrency()).isEqualTo("USD");
    }

    @Test
    void should_defaultUserIdToDefault_when_userIdIsBlank() {
        Portfolio portfolio = new Portfolio(
                1L,
                "   ",
                "Core Portfolio",
                "USD",
                null,
                false,
                null,
                null
        );

        assertThat(portfolio.userId()).isEqualTo("default");
    }

    @Test
    void should_throwIllegalArgumentException_when_nameIsBlank() {
        assertThatThrownBy(() -> new Portfolio(
                1L,
                "user-1",
                "  ",
                "USD",
                null,
                false,
                null,
                null
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("name");
    }

    @Test
    void should_defaultBaseCurrencyToUSD_when_blank() {
        Portfolio portfolio = new Portfolio(
                1L,
                "user-1",
                "Core Portfolio",
                " ",
                null,
                false,
                null,
                null
        );

        assertThat(portfolio.baseCurrency()).isEqualTo("USD");
    }

    @Test
    void should_throwIllegalArgumentException_when_baseCurrencyNotISO3() {
        assertThatThrownBy(() -> new Portfolio(
                1L,
                "user-1",
                "Core Portfolio",
                "USDT",
                null,
                false,
                null,
                null
        )).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ISO");
    }

    @Test
    void should_uppercaseBaseCurrency_when_constructing() {
        Portfolio portfolio = new Portfolio(
                1L,
                "user-1",
                "Core Portfolio",
                "eur",
                null,
                false,
                null,
                null
        );

        assertThat(portfolio.baseCurrency()).isEqualTo("EUR");
    }

    @Test
    void should_trimPortfolioName_when_constructing() {
        Portfolio portfolio = new Portfolio(
                1L,
                "user-1",
                "  Core Portfolio  ",
                "USD",
                null,
                false,
                null,
                null
        );

        assertThat(portfolio.name()).isEqualTo("Core Portfolio");
    }
}

