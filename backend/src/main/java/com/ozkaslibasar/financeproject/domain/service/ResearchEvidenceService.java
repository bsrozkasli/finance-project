package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;

import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Builds internal, in-memory evidence revisions without fetching or retaining provider data. */
public class ResearchEvidenceService {

    public ResearchEvidenceSnapshot create(InstrumentIdentity identity, Instant capturedAt,
                                           List<ResearchEvidenceField> fields) {
        return new ResearchEvidenceSnapshot(UUID.randomUUID(), null, 1, identity, capturedAt, fields);
    }

    public ResearchEvidenceSnapshot revise(ResearchEvidenceSnapshot previous, InstrumentIdentity identity,
                                           Instant capturedAt, List<ResearchEvidenceField> fields) {
        Objects.requireNonNull(previous, "previous must not be null");
        Objects.requireNonNull(identity, "identity must not be null");
        Objects.requireNonNull(capturedAt, "capturedAt must not be null");
        if (!previous.identity().symbol().equals(identity.symbol())) {
            throw new IllegalArgumentException("revision symbol must match previous snapshot");
        }
        if (capturedAt.isBefore(previous.capturedAt())) {
            throw new IllegalArgumentException("revision cannot precede previous snapshot");
        }
        return new ResearchEvidenceSnapshot(UUID.randomUUID(), previous.id(), previous.revision() + 1,
                identity, capturedAt, fields);
    }
}
