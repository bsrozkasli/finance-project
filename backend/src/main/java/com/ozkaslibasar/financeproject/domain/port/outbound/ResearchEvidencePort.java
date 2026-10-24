package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;

import java.util.Optional;

/** Append-only store of evidence snapshots; saved snapshots are never updated or deleted. */
public interface ResearchEvidencePort {

    ResearchEvidenceSnapshot save(ResearchEvidenceSnapshot snapshot);

    Optional<ResearchEvidenceSnapshot> findById(String id);

    Optional<ResearchEvidenceSnapshot> findLatestBySymbol(String symbol);
}
