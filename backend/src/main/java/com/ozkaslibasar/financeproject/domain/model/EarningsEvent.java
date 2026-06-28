package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;

/** Market calendar earnings announcement from FMP. */
public record EarningsEvent(
        String symbol,
        String date,
        BigDecimal epsEstimate,
        BigDecimal epsActual,
        BigDecimal revenueEstimate,
        BigDecimal revenueActual,
        String time
) {
}