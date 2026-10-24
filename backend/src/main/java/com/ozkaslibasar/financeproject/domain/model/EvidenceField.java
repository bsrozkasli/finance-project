package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Objects;

/**
 * One evidence value with its provenance. A field either carries a value ({@code missingness == NONE}) or
 * records why it has none; a missing field never holds a value, so absence cannot be mistaken for data.
 */
public record EvidenceField(
        String name,
        String value,
        EvidenceMissingness missingness,
        String source,
        Instant observedAt,
        Instant retrievedAt,
        String period,
        String currency,
        String normalization,
        EvidenceFreshness freshness,
        boolean conflicted
) {
    public EvidenceField {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        Objects.requireNonNull(missingness, "missingness must not be null");
        if (source == null || source.isBlank()) {
            throw new IllegalArgumentException("source must not be blank");
        }
        Objects.requireNonNull(retrievedAt, "retrievedAt must not be null");
        Objects.requireNonNull(freshness, "freshness must not be null");
        boolean hasValue = value != null && !value.isBlank();
        if (missingness == EvidenceMissingness.NONE && !hasValue) {
            throw new IllegalArgumentException("field " + name + " is present but has no value");
        }
        if (missingness != EvidenceMissingness.NONE && value != null) {
            throw new IllegalArgumentException("field " + name + " is missing but carries a value");
        }
    }
}
