package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-001 Task 2: evidence snapshots are immutable versions bound to the instrument identity they were captured
 * for. Revising appends a new id and revision that names its predecessor and leaves the prior snapshot, and every
 * field it retained, untouched; replay by id returns the same version. The in-memory port is the persistence
 * boundary; the append-only adapter is covered by ResearchEvidenceRepositoryAdapterTest.
 */
class ResearchEvidenceServiceTest {

    private static final Instant OBSERVED = Instant.parse("2026-01-15T14:00:00Z");
    private static final Instant RETRIEVED = Instant.parse("2026-01-15T14:01:00Z");
    private static final Instant REVISED = Instant.parse("2026-01-16T14:01:00Z");

    private final InMemoryEvidencePort port = new InMemoryEvidencePort();
    private final ResearchEvidenceService service = new ResearchEvidenceService(port, UUID::randomUUID);

    private static InstrumentIdentity identity(String symbol) {
        return new InstrumentIdentity(symbol, AssetType.STOCK, ListingStatus.UNKNOWN,
                ClassificationBasis.CURRENT_OBSERVATION, "synthetic-test-source", RETRIEVED);
    }

    private static ResearchEvidenceField observed(String value) {
        return new ResearchEvidenceField("close", value, null, "synthetic-test-source", OBSERVED,
                RETRIEVED, "2026-01-15", "USD", "none", EvidenceFreshness.FRESH, null);
    }

    private static ResearchEvidenceField missing(EvidenceMissingness why) {
        return new ResearchEvidenceField("close", null, why, "synthetic-test-source", null, RETRIEVED,
                "2026-01-15", "USD", "none", EvidenceFreshness.UNKNOWN, null);
    }

    @Test
    void firstSnapshotIsRevisionOneBoundToItsIdentityAndIsRetained() {
        ResearchEvidenceSnapshot snapshot = service.record(identity("aapl"), RETRIEVED, List.of(observed("100.00")));

        assertThat(snapshot.revision()).isEqualTo(1);
        assertThat(snapshot.previousId()).isNull();
        assertThat(snapshot.identity().symbol()).isEqualTo("AAPL");
        assertThat(snapshot.identity().basis()).isEqualTo(ClassificationBasis.CURRENT_OBSERVATION);
        assertThat(snapshot.capturedAt()).isEqualTo(RETRIEVED);
        assertThat(port.saved).containsExactly(snapshot);
    }

    @Test
    void revisionCreatesNewIdentityAndPreservesOriginalEvidence() {
        var first = service.record(identity("aapl"), RETRIEVED, List.of(observed("100.00")));
        var second = service.revise(first.id(), identity("AAPL"), REVISED, List.of(observed("101.00")));

        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(second.revision()).isEqualTo(2);
        assertThat(second.previousId()).isEqualTo(first.id());
        assertThat(service.findById(first.id())).contains(first);
        assertThat(service.findById(first.id()).orElseThrow().fields().get(0).rawValue()).isEqualTo("100.00");
        assertThat(second.fields().get(0).rawValue()).isEqualTo("101.00");
    }

    @Test
    void latestReturnsTheNewestRevisionForTheSymbol() {
        var first = service.record(identity("AAPL"), RETRIEVED, List.of(observed("100.00")));
        var second = service.revise(first.id(), identity("AAPL"), REVISED, List.of(observed("101.00")));

        assertThat(service.findLatest("aapl")).contains(second);
        assertThat(service.findLatest("MSFT")).isEmpty();
    }

    @Test
    void revisingAnUnknownSnapshotIsRejectedAndStoresNothing() {
        UUID unknown = UUID.randomUUID();

        assertThatThrownBy(() -> service.revise(unknown, identity("AAPL"), REVISED, List.of(observed("1"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining(unknown.toString());
        assertThat(port.saved).isEmpty();
    }

    @Test
    void revisingASupersededSnapshotIsRejectedSoRevisionsStayLinear() {
        var first = service.record(identity("AAPL"), RETRIEVED, List.of(observed("100.00")));
        service.revise(first.id(), identity("AAPL"), REVISED, List.of(observed("101.00")));

        assertThatThrownBy(() -> service.revise(first.id(), identity("AAPL"), REVISED, List.of(observed("102.00"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("superseded");
        assertThat(port.saved).hasSize(2);
    }

    @Test
    void rejectsCrossSymbolAndBackdatedRevisions() {
        var first = service.record(identity("AAPL"), REVISED, List.of(observed("100.00")));

        assertThatThrownBy(() -> service.revise(first.id(), identity("MSFT"), REVISED, List.of(observed("101.00"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.revise(first.id(), identity("AAPL"), RETRIEVED, List.of(observed("101.00"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(port.saved).containsExactly(first);
    }

    @Test
    void missingEvidenceKeepsItsReasonWithoutInventingAValue() {
        var snapshot = service.record(identity("AAPL"), RETRIEVED, List.of(missing(EvidenceMissingness.PROVIDER_FAILED)));

        assertThat(snapshot.fields().get(0).rawValue()).isNull();
        assertThat(snapshot.fields().get(0).missingReason()).isEqualTo(EvidenceMissingness.PROVIDER_FAILED);
        assertThat(snapshot.fields().get(0).observedAt()).isNull();
    }

    @Test
    void aFieldHasExactlyOneOfAValueAndAMissingReason() {
        assertThatThrownBy(() -> new ResearchEvidenceField("close", null, null, "synthetic-test-source", null,
                RETRIEVED, null, null, null, EvidenceFreshness.UNKNOWN, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", EvidenceMissingness.NOT_PROVIDED,
                "synthetic-test-source", OBSERVED, RETRIEVED, null, null, null, EvidenceFreshness.FRESH, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsIncompleteProvenance() {
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null, " ", OBSERVED, RETRIEVED,
                null, null, null, EvidenceFreshness.FRESH, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null, "synthetic-test-source", null,
                RETRIEVED, null, null, null, EvidenceFreshness.FRESH, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null, "synthetic-test-source",
                OBSERVED, null, null, null, null, EvidenceFreshness.FRESH, null))
                .isInstanceOf(NullPointerException.class);
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null, "synthetic-test-source",
                OBSERVED, RETRIEVED, null, null, null, null, null))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void rejectsAnObservationThatOccursAfterItsRetrieval() {
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null, "synthetic-test-source",
                REVISED, RETRIEVED, "2026-01-15", "USD", "none", EvidenceFreshness.FRESH, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsAnIdenticalFieldTwiceInOneSnapshot() {
        assertThatThrownBy(() -> service.record(identity("AAPL"), RETRIEVED,
                List.of(observed("100.00"), observed("100.00"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(port.saved).isEmpty();
    }

    @Test
    void keepsMultiplePeriodsAndConflictingSourcesForTheSameField() {
        var priorPeriod = new ResearchEvidenceField("close", "90.00", null, "synthetic-test-source", OBSERVED,
                RETRIEVED, "2025-12-31", "USD", "none", EvidenceFreshness.STALE, null);
        var otherSource = new ResearchEvidenceField("close", "99.00", null, "other-synthetic-source", OBSERVED,
                RETRIEVED, "2026-01-15", "USD", "none", EvidenceFreshness.FRESH, "sources_disagree");

        var snapshot = service.record(identity("AAPL"), RETRIEVED, List.of(observed("100.00"), priorPeriod, otherSource));

        assertThat(snapshot.fields()).containsExactly(observed("100.00"), priorPeriod, otherSource);
    }

    @Test
    void snapshotCopiesCallerOwnedFieldList() {
        var fields = new ArrayList<>(List.of(observed("100.00")));
        var snapshot = service.record(identity("AAPL"), RETRIEVED, fields);

        fields.clear();

        assertThat(snapshot.fields()).hasSize(1);
        assertThatThrownBy(() -> snapshot.fields().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void rejectsEvidenceRetrievedAfterTheSnapshotWasCaptured() {
        assertThatThrownBy(() -> service.record(identity("AAPL"), OBSERVED, List.of(observed("100.00"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(port.saved).isEmpty();
    }

    private static final class InMemoryEvidencePort implements ResearchEvidencePort {
        final List<ResearchEvidenceSnapshot> saved = new ArrayList<>();

        @Override
        public ResearchEvidenceSnapshot save(ResearchEvidenceSnapshot snapshot) {
            saved.add(snapshot);
            return snapshot;
        }

        @Override
        public Optional<ResearchEvidenceSnapshot> findById(UUID id) {
            return saved.stream().filter(s -> s.id().equals(id)).findFirst();
        }

        @Override
        public Optional<ResearchEvidenceSnapshot> findLatestBySymbol(String symbol) {
            return saved.stream().filter(s -> s.identity().symbol().equals(symbol))
                    .max(Comparator.comparingLong(ResearchEvidenceSnapshot::revision));
        }
    }
}
