package com.ozkaslibasar.financeproject.domain.model;

/** Whether the observed value is current enough for its use; UNKNOWN when it cannot be established. */
public enum EvidenceFreshness {
    FRESH,
    STALE,
    UNKNOWN
}
