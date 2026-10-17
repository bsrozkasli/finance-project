package com.ozkaslibasar.financeproject.domain.model;

/** Whether an instrument was actively listed at the evaluation instant. Absent evidence is UNKNOWN, never ACTIVE. */
public enum ListingStatus {
    ACTIVE,
    DELISTED,
    UNKNOWN
}
