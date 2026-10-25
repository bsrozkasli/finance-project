package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/**
 * Immutable version of the evidence captured for one instrument identity. A revision is a new snapshot that names
 * the one it supersedes; the superseded snapshot is never changed. Retaining a snapshot is not a product
 * evaluation and grants no external-use right.
 */
public record ResearchEvidenceSnapshot(
        UUID id,
        UUID previousId,
        long revision,
        InstrumentIdentity identity,
        Instant capturedAt,
        List<ResearchEvidenceField> fields
) {
    public ResearchEvidenceSnapshot {
        Objects.requireNonNull(id, "id must not be null");
        Objects.requireNonNull(identity, "identity must not be null");
        Objects.requireNonNull(capturedAt, "capturedAt must not be null");
        fields = List.copyOf(Objects.requireNonNull(fields, "fields must not be null"));
        if (revision < 1 || (revision == 1) != (previousId == null)) {
            throw new IllegalArgumentException("revision and previousId are inconsistent");
        }
        if (fields.isEmpty()) {
            throw new IllegalArgumentException("at least one evidence field is required");
        }
        Set<ResearchEvidenceField> uniqueFields = new HashSet<>();
        for (ResearchEvidenceField field : fields) {
            if (!uniqueFields.add(field)) {
                throw new IllegalArgumentException("duplicate evidence field: " + field.name());
            }
            if (field.retrievedAt().isAfter(capturedAt)) {
                throw new IllegalArgumentException("field retrieved after snapshot capture: " + field.name());
            }
        }
        if (identity.retrievedAt().isAfter(capturedAt)) {
            throw new IllegalArgumentException("identity retrieved after snapshot capture");
        }
    }
}
