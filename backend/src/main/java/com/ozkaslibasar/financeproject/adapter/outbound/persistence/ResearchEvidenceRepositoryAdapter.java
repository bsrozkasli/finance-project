package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.ResearchEvidenceFieldEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.entity.ResearchEvidenceSnapshotEntity;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.ResearchEvidenceFieldJpaRepository;
import com.ozkaslibasar.financeproject.adapter.outbound.persistence.repository.ResearchEvidenceSnapshotJpaRepository;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
        InstrumentIdentity identity = snapshot.identity();
        snapshots.saveAndFlush(new ResearchEvidenceSnapshotEntity(snapshot.id(), snapshot.previousId(),
                snapshot.revision(), identity.symbol(), identity.assetType().name(), identity.listingStatus().name(),
                identity.basis().name(), identity.source(), identity.retrievedAt(), snapshot.capturedAt()));
        List<ResearchEvidenceField> source = snapshot.fields();
        fields.saveAll(IntStream.range(0, source.size())
                .mapToObj(position -> toEntity(snapshot.id(), position, source.get(position)))
                .toList());
        fields.flush();
        return snapshot;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ResearchEvidenceSnapshot> findById(UUID id) {
        return snapshots.findById(id).map(this::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ResearchEvidenceSnapshot> findLatestBySymbol(String symbol) {
        return snapshots.findFirstBySymbolOrderByRevisionDesc(symbol).map(this::toDomain);
    }

    private ResearchEvidenceSnapshot toDomain(ResearchEvidenceSnapshotEntity e) {
        InstrumentIdentity identity = new InstrumentIdentity(e.getSymbol(), AssetType.valueOf(e.getAssetType()),
                ListingStatus.valueOf(e.getListingStatus()), ClassificationBasis.valueOf(e.getClassificationBasis()),
                e.getIdentitySource(), e.getIdentityRetrievedAt());
        List<ResearchEvidenceField> loaded = fields.findBySnapshotIdOrderByPositionAsc(e.getId()).stream()
                .map(this::toDomain)
                .toList();
        return new ResearchEvidenceSnapshot(e.getId(), e.getPreviousId(), e.getRevision(), identity,
                e.getCapturedAt(), loaded);
    }

    private ResearchEvidenceField toDomain(ResearchEvidenceFieldEntity e) {
        EvidenceMissingness missingReason = e.getMissingReason() == null
                ? null
                : EvidenceMissingness.valueOf(e.getMissingReason());
        return new ResearchEvidenceField(e.getName(), e.getRawValue(), missingReason, e.getSource(),
                e.getObservedAt(), e.getRetrievedAt(), e.getPeriod(), e.getCurrency(), e.getNormalization(),
                EvidenceFreshness.valueOf(e.getFreshness()), e.getConflictNote());
    }

    private ResearchEvidenceFieldEntity toEntity(UUID snapshotId, int position, ResearchEvidenceField f) {
        return new ResearchEvidenceFieldEntity(null, snapshotId, position, f.name(), f.rawValue(),
                f.missingReason() == null ? null : f.missingReason().name(), f.source(), f.observedAt(),
                f.retrievedAt(), f.period(), f.currency(), f.normalization(), f.freshness().name(),
                f.conflictNote());
    }
}
