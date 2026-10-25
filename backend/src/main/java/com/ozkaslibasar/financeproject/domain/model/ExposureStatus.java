package com.ozkaslibasar.financeproject.domain.model;

/**
 * Whether a Portfolio State has exposure weights: {@code COMPLETE} when every open position is priced and weights
 * exist, {@code PARTIAL} when any open position is not (all weights absent), {@code EMPTY} with no open positions.
 */
public enum ExposureStatus {
    COMPLETE,
    PARTIAL,
    EMPTY
}
