package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Objects;

/** A raw, source-attributed field for internal research, without a quality or use-rights judgment. */
public record ResearchEvidenceField(
        String name,
        String rawValue,
        String missingReason,
        String source,
        Instant observedAt,
        Instant retrievedAt,
        String period,
        String currency,
        String normalization,
        String conflictNote
) {
    public ResearchEvidenceField {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("field name must not be blank");
        }
        name = name.trim();
        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException("source must not be blank");
        }
        source = source.trim();
        Objects.requireNonNull(retrievedAt, "retrievedAt must not be null");

        boolean hasValue = rawValue != null && !rawValue.isBlank();
        boolean hasMissingReason = missingReason != null && !missingReason.isBlank();
        if (hasValue == hasMissingReason) {
            throw new IllegalArgumentException("exactly one of rawValue and missingReason is required");
        }
        if (hasValue && observedAt == null) {
            throw new IllegalArgumentException("observedAt is required for a present value");
        }
        if (observedAt != null && observedAt.isAfter(retrievedAt)) {
            throw new IllegalArgumentException("observedAt cannot be after retrievedAt");
        }
        if (!hasValue) {
            rawValue = null;
        } else {
            missingReason = null;
        }
    }
}
