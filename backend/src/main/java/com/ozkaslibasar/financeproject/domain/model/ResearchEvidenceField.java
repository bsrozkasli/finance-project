package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Objects;

/**
 * A raw, source-attributed field for internal research, without a quality or use-rights judgment (PRD-FR-006).
 * It carries either a value or the reason it has none, never both, so absence cannot be mistaken for data. A
 * non-null {@code conflictNote} records that sources disagree on this value.
 */
public record ResearchEvidenceField(
        String name,
        String rawValue,
        EvidenceMissingness missingReason,
        String source,
        Instant observedAt,
        Instant retrievedAt,
        String period,
        String currency,
        String normalization,
        EvidenceFreshness freshness,
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
        Objects.requireNonNull(freshness, "freshness must not be null");

        boolean hasValue = rawValue != null && !rawValue.isBlank();
        if (hasValue == (missingReason != null)) {
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
        }
        if (conflictNote != null && conflictNote.isBlank()) {
            conflictNote = null;
        }
    }
}
