package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Nullable macro context from FRED. Missing provider data stays null.
 */
public record MacroSnapshot(
        BigDecimal fedFundsRate,
        BigDecimal cpi,
        BigDecimal cpiYoy,
        BigDecimal gdpGrowth,
        BigDecimal unemploymentRate,
        BigDecimal treasury10y,
        BigDecimal treasury2y,
        BigDecimal yieldCurveSpread,
        String observedAt,
        Instant cachedAt
) {
}