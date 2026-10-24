package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.ResearchEvidenceFieldEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.ResearchEvidenceSnapshotEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.ResearchEvidenceFieldJpaRepository;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.ResearchEvidenceSnapshotJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.EvidenceField;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

/** Insert-only: a saved snapshot is never updated, so a retained evaluation always replays the same evidence. */
@Component
@RequiredArgsConstructor
public class ResearchEvidenceRepositoryAdapter implements ResearchEvidencePort {

    private final ResearchEvidenceSnapshotJpaRepository snapshots;
    private final ResearchEvidenceFieldJpaRepository fields;

    @Override
    @Transactional
    public ResearchEvidenceSnapshot save(ResearchEvidenceSnapshot snapshot) {
        if (snapshots.existsById(snapshot.id())) {
            throw new IllegalStateException("Evidence snapshot " + snapshot.id() + " already exists");
        }
        snapshots.saveAndFlush(new ResearchEvidenceSnapshotEntity(snapshot.id(), snapshot.symbol(),
                snapshot.revision(), snapshot.supersedesId().orElse(null), snapshot.createdAt()));
        List<EvidenceField> source = snapshot.fields();
        fields.saveAll(IntStream.range(0, source.size())
                .mapToObj(position -> toEntity(snapshot.id(), position, source.get(position)))
                .toList());
        fields.flush();
        return snapshot;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ResearchEvidenceSnapshot> findById(String id) {
        return snapshots.findById(id).map(this::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ResearchEvidenceSnapshot> findLatestBySymbol(String symbol) {
        return snapshots.findFirstBySymbolOrderByRevisionDesc(symbol).map(this::toDomain);
    }

    private ResearchEvidenceSnapshot toDomain(ResearchEvidenceSnapshotEntity e) {
        List<EvidenceField> loaded = fields.findBySnapshotIdOrderByPositionAsc(e.getId()).stream()
                .map(this::toDomain)
                .toList();
        return new ResearchEvidenceSnapshot(e.getId(), e.getSymbol(), e.getRevision(),
                Optional.ofNullable(e.getSupersedesId()), e.getCreatedAt(), loaded);
    }

    private EvidenceField toDomain(ResearchEvidenceFieldEntity e) {
        return new EvidenceField(e.getName(), e.getValue(), EvidenceMissingness.valueOf(e.getMissingness()),
                e.getSource(), e.getObservedAt(), e.getRetrievedAt(), e.getPeriod(), e.getCurrency(),
                e.getNormalization(), EvidenceFreshness.valueOf(e.getFreshness()), e.isConflicted());
    }

    private ResearchEvidenceFieldEntity toEntity(String snapshotId, int position, EvidenceField f) {
        return new ResearchEvidenceFieldEntity(null, snapshotId, position, f.name(), f.value(),
                f.missingness().name(), f.source(), f.observedAt(), f.retrievedAt(), f.period(), f.currency(),
                f.normalization(), f.freshness().name(), f.conflicted());
    }
}
