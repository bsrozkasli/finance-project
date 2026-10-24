package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.EvidenceField;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-001 Task 2: evidence snapshots are immutable versions. Revising creates a new id and revision and leaves
 * the prior snapshot, and every field it retained, untouched; replay by id returns the same version. The
 * in-memory port is the persistence boundary (the append-only adapter and migration wait on OQ-5).
 */
class ResearchEvidenceServiceTest {

    private static final Instant T0 = Instant.parse("2026-10-01T10:00:00Z");
    private static final Instant T1 = Instant.parse("2026-10-02T10:00:00Z");

    private final InMemoryEvidencePort port = new InMemoryEvidencePort();
    private final AtomicInteger ids = new AtomicInteger();
    private final ResearchEvidenceService service =
            new ResearchEvidenceService(port, () -> "snap-" + ids.incrementAndGet());

    private static EvidenceField present(String name, String value, Instant retrievedAt) {
        return new EvidenceField(name, value, EvidenceMissingness.NONE, "yfinance", retrievedAt.minusSeconds(60),
                retrievedAt, "TTM", "USD", "as-reported", EvidenceFreshness.FRESH, false);
    }

    private static EvidenceField missing(String name, EvidenceMissingness why, Instant retrievedAt) {
        return new EvidenceField(name, null, why, "yfinance", null, retrievedAt, null, null, null,
                EvidenceFreshness.UNKNOWN, false);
    }

    @Test
    void firstSnapshotIsRevisionOneWithItsFieldsRetained() {
        ResearchEvidenceSnapshot snapshot = service.record("aapl", List.of(present("pe", "28.4", T0)), T0);

        assertThat(snapshot.id()).isEqualTo("snap-1");
        assertThat(snapshot.symbol()).isEqualTo("AAPL");
        assertThat(snapshot.revision()).isEqualTo(1);
        assertThat(snapshot.supersedesId()).isEmpty();
        assertThat(snapshot.createdAt()).isEqualTo(T0);
        assertThat(snapshot.fields()).extracting(EvidenceField::name).containsExactly("pe");
    }

    @Test
    void revisingCreatesNewIdAndRevisionAndPreservesThePriorSnapshot() {
        ResearchEvidenceSnapshot first = service.record("AAPL", List.of(present("pe", "28.4", T0)), T0);

        ResearchEvidenceSnapshot second = service.revise(first.id(), List.of(present("pe", "30.1", T1)), T1);

        assertThat(second.id()).isNotEqualTo(first.id());
        assertThat(second.revision()).isEqualTo(2);
        assertThat(second.supersedesId()).contains(first.id());
        assertThat(second.symbol()).isEqualTo("AAPL");
        assertThat(service.findById(first.id())).contains(first);
        assertThat(service.findById(first.id()).orElseThrow().fields().get(0).value()).isEqualTo("28.4");
    }

    @Test
    void replayByIdResolvesTheSameVersionAfterALaterRevision() {
        ResearchEvidenceSnapshot first = service.record("AAPL", List.of(present("pe", "28.4", T0)), T0);
        service.revise(first.id(), List.of(present("pe", "30.1", T1)), T1);

        assertThat(service.findById(first.id())).contains(first);
    }

    @Test
    void latestReturnsTheNewestRevisionForTheSymbol() {
        ResearchEvidenceSnapshot first = service.record("AAPL", List.of(present("pe", "28.4", T0)), T0);
        ResearchEvidenceSnapshot second = service.revise(first.id(), List.of(present("pe", "30.1", T1)), T1);

        assertThat(service.findLatest("aapl")).contains(second);
        assertThat(service.findLatest("MSFT")).isEmpty();
    }

    @Test
    void revisingAnUnknownSnapshotIsRejectedAndStoresNothing() {
        assertThatThrownBy(() -> service.revise("missing", List.of(present("pe", "1", T1)), T1))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("missing");
        assertThat(port.saved).isEmpty();
    }

    @Test
    void revisingASupersededSnapshotIsRejectedSoRevisionsStayLinear() {
        ResearchEvidenceSnapshot first = service.record("AAPL", List.of(present("pe", "28.4", T0)), T0);
        service.revise(first.id(), List.of(present("pe", "30.1", T1)), T1);

        assertThatThrownBy(() -> service.revise(first.id(), List.of(present("pe", "31", T1)), T1))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("superseded");
    }

    @Test
    void snapshotFieldsCannotBeMutatedAfterRecording() {
        List<EvidenceField> input = new ArrayList<>(List.of(present("pe", "28.4", T0)));
        ResearchEvidenceSnapshot snapshot = service.record("AAPL", input, T0);

        input.clear();

        assertThat(snapshot.fields()).hasSize(1);
        assertThatThrownBy(() -> snapshot.fields().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void aMissingFieldIsKeptAsMissingWithItsReasonNeverAsAValue() {
        ResearchEvidenceSnapshot snapshot = service.record("AAPL",
                List.of(missing("pe", EvidenceMissingness.PROVIDER_FAILED, T0)), T0);

        EvidenceField field = snapshot.fields().get(0);
        assertThat(field.value()).isNull();
        assertThat(field.missingness()).isEqualTo(EvidenceMissingness.PROVIDER_FAILED);
    }

    @Test
    void aPresentFieldWithoutAValueIsRejected() {
        assertThatThrownBy(() -> new EvidenceField("pe", null, EvidenceMissingness.NONE, "yfinance", null, T0,
                null, null, null, EvidenceFreshness.FRESH, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aMissingFieldCarryingAValueIsRejected() {
        assertThatThrownBy(() -> new EvidenceField("pe", "28.4", EvidenceMissingness.NOT_PROVIDED, "yfinance",
                null, T0, null, null, null, EvidenceFreshness.UNKNOWN, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aFieldWithoutSourceOrRetrievalTimeIsRejected() {
        assertThatThrownBy(() -> new EvidenceField("pe", "28.4", EvidenceMissingness.NONE, " ", null, T0,
                null, null, null, EvidenceFreshness.FRESH, false))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EvidenceField("pe", "28.4", EvidenceMissingness.NONE, "yfinance", null, null,
                null, null, null, EvidenceFreshness.FRESH, false))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void duplicateFieldNamesInOneSnapshotAreRejected() {
        assertThatThrownBy(() -> service.record("AAPL",
                List.of(present("pe", "28.4", T0), present("pe", "29", T0)), T0))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("pe");
    }

    private static final class InMemoryEvidencePort implements ResearchEvidencePort {
        final List<ResearchEvidenceSnapshot> saved = new ArrayList<>();

        @Override
        public ResearchEvidenceSnapshot save(ResearchEvidenceSnapshot snapshot) {
            saved.add(snapshot);
            return snapshot;
        }

        @Override
        public Optional<ResearchEvidenceSnapshot> findById(String id) {
            return saved.stream().filter(s -> s.id().equals(id)).findFirst();
        }

        @Override
        public Optional<ResearchEvidenceSnapshot> findLatestBySymbol(String symbol) {
            return saved.stream().filter(s -> s.symbol().equals(symbol))
                    .max(java.util.Comparator.comparingInt(ResearchEvidenceSnapshot::revision));
        }
    }
}
