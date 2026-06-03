package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TechnicalMetricsCalculatorTest {

    @Test
    void shouldReturnEmptyMapIfPricesNullOrLessThan30() {
        // Null list
        assertThat(TechnicalMetricsCalculator.compute(null)).isEmpty();

        // Less than 30 prices
        List<PriceHistory> shortList = new ArrayList<>();
        for (int i = 0; i < 29; i++) {
            shortList.add(new PriceHistory(
                    "AAPL",
                    BigDecimal.valueOf(100),
                    BigDecimal.valueOf(105),
                    BigDecimal.valueOf(95),
                    BigDecimal.valueOf(100),
                    BigDecimal.valueOf(1000),
                    LocalDateTime.now().minusDays(i)
            ));
        }
        assertThat(TechnicalMetricsCalculator.compute(shortList)).isEmpty();
    }

    @Test
    void shouldComputeTechnicalMetricsCorrectly() {
        List<PriceHistory> prices = new ArrayList<>();
        LocalDateTime baseTime = LocalDateTime.of(2026, 1, 1, 12, 0);

        // Generate 35 prices to satisfy the size >= 30 requirement and provide SMA window
        for (int i = 0; i < 35; i++) {
            double basePrice = 100.0 + i; // steady upward trend
            prices.add(new PriceHistory(
                    "AAPL",
                    BigDecimal.valueOf(basePrice - 1.0),
                    BigDecimal.valueOf(basePrice + 2.0),
                    BigDecimal.valueOf(basePrice - 2.0),
                    BigDecimal.valueOf(basePrice),
                    BigDecimal.valueOf(1000),
                    baseTime.plusDays(i)
            ));
        }

        Map<String, BigDecimal> metrics = TechnicalMetricsCalculator.compute(prices);

        assertThat(metrics).isNotEmpty();
        assertThat(metrics).containsKeys("rsi", "macd", "macd_signal", "macd_histogram", "sma_20", "atr", "price_vs_sma_pct");
        
        assertThat(metrics.get("rsi")).isBetween(BigDecimal.ZERO, BigDecimal.valueOf(100));
        assertThat(metrics.get("sma_20")).isGreaterThan(BigDecimal.ZERO);
        assertThat(metrics.get("atr")).isGreaterThan(BigDecimal.ZERO);
        assertThat(metrics.get("price_vs_sma_pct")).isNotNull();
    }
}
