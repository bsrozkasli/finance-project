package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchEvidencePort;
import com.ozkaslibasar.financeproject.domain.service.ResearchEvidenceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-001 Task 2: the append-only adapter keeps every snapshot version exactly as saved, including the instrument
 * identity it was captured for. Real PostgreSQL, because the guarantees under test (linear revisions,
 * value/missing-reason consistency, observation time order) are database constraints.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class ResearchEvidenceRepositoryAdapterTest {

    private static final String SYMBOL = "EVTEST";
    private static final Instant T0 = Instant.parse("2026-10-01T10:00:00Z");
    private static final Instant T1 = Instant.parse("2026-10-02T10:00:00Z");

    @Autowired
    private ResearchEvidencePort port;
    @Autowired
    private ResearchEvidenceService service;
    @Autowired
    private JdbcTemplate jdbc;

    @AfterEach
    void cleanUp() {
        jdbc.update("DELETE FROM research_evidence_fields WHERE snapshot_id IN "
                + "(SELECT id FROM research_evidence_snapshots WHERE symbol = ?)", SYMBOL);
        jdbc.update("DELETE FROM research_evidence_snapshots WHERE symbol = ?", SYMBOL);
    }

    private static InstrumentIdentity identity(Instant retrievedAt) {
        return new InstrumentIdentity(SYMBOL, AssetType.ETF, ListingStatus.ACTIVE,
                ClassificationBasis.CURRENT_OBSERVATION, "synthetic-test-source", retrievedAt);
    }

    private static ResearchEvidenceField present(String name, String value, String period, Instant retrievedAt) {
        return new ResearchEvidenceField(name, value, null, "synthetic-test-source", retrievedAt.minusSeconds(60),
                retrievedAt, period, "USD", "as-reported", EvidenceFreshness.FRESH, null);
    }

    private static ResearchEvidenceField missing(String name, Instant retrievedAt) {
        return new ResearchEvidenceField(name, null, EvidenceMissingness.PROVIDER_FAILED, "synthetic-test-source",
                null, retrievedAt, null, null, null, EvidenceFreshness.UNKNOWN, null);
    }

    @Test
    void aSavedSnapshotIsReadBackExactlyWithIdentityFieldOrderAndMissingnessIntact() {
        ResearchEvidenceSnapshot saved = service.record(identity(T0), T0, List.of(
                present("pe", "28.4", "TTM", T0), missing("eps", T0), present("beta", "1.2", "5Y", T0)));

        ResearchEvidenceSnapshot reread = port.findById(saved.id()).orElseThrow();

        assertThat(reread).isEqualTo(saved);
        assertThat(reread.identity()).isEqualTo(identity(T0));
        assertThat(reread.fields()).extracting(ResearchEvidenceField::name).containsExactly("pe", "eps", "beta");
        assertThat(reread.fields().get(1).rawValue()).isNull();
        assertThat(reread.fields().get(1).missingReason()).isEqualTo(EvidenceMissingness.PROVIDER_FAILED);
    }

    @Test
    void severalPeriodsAndConflictingSourcesForOneFieldAreAllRetained() {
        ResearchEvidenceField otherSource = new ResearchEvidenceField("pe", "29.0", null, "other-synthetic-source",
                T0.minusSeconds(60), T0, "TTM", "USD", "as-reported", EvidenceFreshness.FRESH, "sources_disagree");
        ResearchEvidenceSnapshot saved = service.record(identity(T0), T0, List.of(
                present("pe", "28.4", "TTM", T0), present("pe", "25.0", "FY2025", T0), otherSource));

        assertThat(port.findById(saved.id()).orElseThrow().fields())
                .containsExactly(present("pe", "28.4", "TTM", T0), present("pe", "25.0", "FY2025", T0), otherSource);
    }

    @Test
    void revisingKeepsThePriorVersionUnchangedAndLatestReturnsTheRevision() {
        ResearchEvidenceSnapshot first = service.record(identity(T0), T0, List.of(present("pe", "28.4", "TTM", T0)));

        ResearchEvidenceSnapshot second = service.revise(first.id(), identity(T1), T1,
                List.of(present("pe", "30.1", "TTM", T1)));

        assertThat(port.findById(first.id())).contains(first);
        assertThat(port.findLatestBySymbol(SYMBOL)).contains(second);
        assertThat(second.previousId()).isEqualTo(first.id());
    }

    @Test
    void savingAnExistingIdIsRejectedSoNoVersionIsRewritten() {
        ResearchEvidenceSnapshot first = service.record(identity(T0), T0, List.of(present("pe", "28.4", "TTM", T0)));
        ResearchEvidenceSnapshot rewrite = new ResearchEvidenceSnapshot(first.id(), null, 1, identity(T1), T1,
                List.of(present("pe", "99", "TTM", T1)));

        assertThatThrownBy(() -> port.save(rewrite)).isInstanceOf(IllegalStateException.class);
        assertThat(port.findById(first.id())).contains(first);
    }

    @Test
    void theDatabaseRejectsTwoRevisionsSupersedingTheSameSnapshot() {
        ResearchEvidenceSnapshot first = service.record(identity(T0), T0, List.of(present("pe", "28.4", "TTM", T0)));
        service.revise(first.id(), identity(T1), T1, List.of(present("pe", "30.1", "TTM", T1)));
        ResearchEvidenceSnapshot fork = new ResearchEvidenceSnapshot(UUID.randomUUID(), first.id(), 3, identity(T1),
                T1, List.of(present("pe", "31", "TTM", T1)));

        assertThatThrownBy(() -> port.save(fork)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theDatabaseRejectsAMissingFieldThatCarriesAValue() {
        ResearchEvidenceSnapshot snapshot = service.record(identity(T0), T0, List.of(present("pe", "28.4", "TTM", T0)));

        assertThatThrownBy(() -> insertField(snapshot.id(), "'1'", "'NOT_PROVIDED'", "now()"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theDatabaseRejectsAPresentValueWithoutObservationTime() {
        ResearchEvidenceSnapshot snapshot = service.record(identity(T0), T0, List.of(present("pe", "28.4", "TTM", T0)));

        assertThatThrownBy(() -> insertField(snapshot.id(), "'1'", "NULL", "NULL"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theDatabaseRejectsAnObservationAfterItsRetrieval() {
        ResearchEvidenceSnapshot snapshot = service.record(identity(T0), T0, List.of(present("pe", "28.4", "TTM", T0)));

        assertThatThrownBy(() -> insertField(snapshot.id(), "'1'", "NULL", "now() + interval '1 day'"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void insertField(UUID snapshotId, String rawValue, String missingReason, String observedAt) {
        jdbc.update("INSERT INTO research_evidence_fields (snapshot_id, position, name, raw_value, missing_reason, "
                + "source, observed_at, retrieved_at, freshness) VALUES (?, 9, 'x', " + rawValue + ", "
                + missingReason + ", 'synthetic-test-source', " + observedAt + ", now(), 'UNKNOWN')", snapshotId);
    }
}
