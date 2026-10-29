package com.ozkaslibasar.financeproject.domain.model;

/** Per-position valuation outcome of Portfolio State exposures (decision D-2). */
public enum PositionValuationStatus {
    PRICED,
    STALE_PRICE,
    NO_PRICE,
    CURRENCY_UNKNOWN,
    CURRENCY_MISMATCH,
    CLOSED
}
