package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Records caller-supplied evidence as immutable versions; it fetches nothing from providers. Revising never
 * rewrites a retained snapshot: it appends a new one that supersedes the latest, so an evaluation that cites a
 * snapshot id always replays the same evidence.
 */
public class ResearchEvidenceService {

    private final ResearchEvidencePort port;
    private final Supplier<UUID> idSupplier;

    public ResearchEvidenceService(ResearchEvidencePort port, Supplier<UUID> idSupplier) {
        this.port = Objects.requireNonNull(port, "port must not be null");
        this.idSupplier = Objects.requireNonNull(idSupplier, "idSupplier must not be null");
    }

    public ResearchEvidenceSnapshot record(InstrumentIdentity identity, Instant capturedAt,
                                           List<ResearchEvidenceField> fields) {
        return port.save(new ResearchEvidenceSnapshot(idSupplier.get(), null, 1, identity, capturedAt, fields));
    }

    public ResearchEvidenceSnapshot revise(UUID previousId, InstrumentIdentity identity, Instant capturedAt,
                                           List<ResearchEvidenceField> fields) {
        Objects.requireNonNull(identity, "identity must not be null");
        Objects.requireNonNull(capturedAt, "capturedAt must not be null");
        ResearchEvidenceSnapshot previous = port.findById(previousId)
                .orElseThrow(() -> new IllegalArgumentException("No evidence snapshot " + previousId));
        if (!previous.identity().symbol().equals(identity.symbol())) {
            throw new IllegalArgumentException("revision symbol must match previous snapshot");
        }
        if (capturedAt.isBefore(previous.capturedAt())) {
            throw new IllegalArgumentException("revision cannot precede previous snapshot");
        }
        ResearchEvidenceSnapshot latest = port.findLatestBySymbol(previous.identity().symbol()).orElse(previous);
        if (!latest.id().equals(previous.id())) {
            throw new IllegalStateException("Snapshot " + previousId + " is superseded by " + latest.id());
        }
        return port.save(new ResearchEvidenceSnapshot(idSupplier.get(), previous.id(), previous.revision() + 1,
                identity, capturedAt, fields));
    }

    public Optional<ResearchEvidenceSnapshot> findById(UUID id) {
        return port.findById(id);
    }

    public Optional<ResearchEvidenceSnapshot> findLatest(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        return port.findLatestBySymbol(symbol.trim().toUpperCase(Locale.ROOT));
    }
}
