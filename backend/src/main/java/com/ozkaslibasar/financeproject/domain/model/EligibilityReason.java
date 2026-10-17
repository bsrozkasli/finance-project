package com.ozkaslibasar.financeproject.domain.model;

/** Why an instrument is or is not eligible for stock/ETF evaluation. */
public enum EligibilityReason {
    ELIGIBLE,
    NO_IDENTITY,
    UNRESOLVED_TYPE,
    UNSUPPORTED_TYPE,
    NOT_ACTIVELY_LISTED,
    HISTORICAL_CLASSIFICATION_UNPROVEN
}
