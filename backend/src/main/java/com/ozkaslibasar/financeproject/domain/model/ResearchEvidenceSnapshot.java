package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Immutable version of the evidence retained for one symbol. A revision is a new snapshot that names the one it
 * supersedes; the superseded snapshot is never changed.
 */
public record ResearchEvidenceSnapshot(
        String id,
        String symbol,
        int revision,
        Optional<String> supersedesId,
        Instant createdAt,
        List<EvidenceField> fields
) {
    public ResearchEvidenceSnapshot {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("id must not be blank");
        }
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        symbol = symbol.trim().toUpperCase(Locale.ROOT);
        if (revision < 1) {
            throw new IllegalArgumentException("revision must be at least 1");
        }
        Objects.requireNonNull(supersedesId, "supersedesId must not be null");
        Objects.requireNonNull(createdAt, "createdAt must not be null");
        Objects.requireNonNull(fields, "fields must not be null");
        fields = List.copyOf(fields);
        Set<String> names = new HashSet<>();
        for (EvidenceField field : fields) {
            if (!names.add(field.name())) {
                throw new IllegalArgumentException("duplicate field " + field.name());
            }
        }
    }
}
