package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.EvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Records evidence as immutable versions. Revising never rewrites a retained snapshot: it appends a new one
 * that supersedes the latest, so an evaluation that cites a snapshot id always replays the same evidence.
 */
public class ResearchEvidenceService {

    private final ResearchEvidencePort port;
    private final Supplier<String> idSupplier;

    public ResearchEvidenceService(ResearchEvidencePort port, Supplier<String> idSupplier) {
        this.port = Objects.requireNonNull(port, "port must not be null");
        this.idSupplier = Objects.requireNonNull(idSupplier, "idSupplier must not be null");
    }

    public ResearchEvidenceSnapshot record(String symbol, List<EvidenceField> fields, Instant createdAt) {
        return port.save(new ResearchEvidenceSnapshot(
                idSupplier.get(), symbol, 1, Optional.empty(), createdAt, fields));
    }

    public ResearchEvidenceSnapshot revise(String snapshotId, List<EvidenceField> fields, Instant createdAt) {
        ResearchEvidenceSnapshot prior = port.findById(snapshotId)
                .orElseThrow(() -> new IllegalArgumentException("No evidence snapshot " + snapshotId));
        ResearchEvidenceSnapshot latest = port.findLatestBySymbol(prior.symbol()).orElse(prior);
        if (!latest.id().equals(prior.id())) {
            throw new IllegalStateException("Snapshot " + snapshotId + " is superseded by " + latest.id());
        }
        return port.save(new ResearchEvidenceSnapshot(
                idSupplier.get(), prior.symbol(), prior.revision() + 1, Optional.of(prior.id()), createdAt, fields));
    }

    public Optional<ResearchEvidenceSnapshot> findById(String id) {
        return port.findById(id);
    }

    public Optional<ResearchEvidenceSnapshot> findLatest(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new IllegalArgumentException("symbol must not be blank");
        }
        return port.findLatestBySymbol(symbol.trim().toUpperCase(Locale.ROOT));
    }
}
