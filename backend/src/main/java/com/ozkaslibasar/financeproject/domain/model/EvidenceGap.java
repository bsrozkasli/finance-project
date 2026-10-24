package com.ozkaslibasar.financeproject.domain.model;

import java.util.Objects;

/** One policy field (or the instrument type) that does not count as current evidence, and why. */
public record EvidenceGap(String field, EvidenceGapReason reason) {
    public EvidenceGap {
        if (field == null || field.isBlank()) {
            throw new IllegalArgumentException("field must not be blank");
        }
        Objects.requireNonNull(reason, "reason must not be null");
    }
}
