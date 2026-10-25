package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Objects;

/**
 * One retained price observation used to value an open position: the latest stored close on or before the state's
 * as-of date and the stored currency of the asset. Every value but the symbol is nullable, so a missing price or
 * unknown currency can be stored and replayed as such.
 */
public record ValuationInput(String symbol, BigDecimal close, LocalDate priceDate, String priceCurrency) {
    public ValuationInput {
        Objects.requireNonNull(symbol, "symbol must not be null");
    }
}
