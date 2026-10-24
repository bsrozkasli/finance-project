package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.EvidenceField;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-001 Task 2: the append-only adapter keeps every snapshot version exactly as saved. Real PostgreSQL,
 * because the guarantees under test (linear revisions, value/missingness consistency) are database constraints.
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

    private static EvidenceField present(String name, String value, Instant retrievedAt) {
        return new EvidenceField(name, value, EvidenceMissingness.NONE, "yfinance", retrievedAt.minusSeconds(60),
                retrievedAt, "TTM", "USD", "as-reported", EvidenceFreshness.FRESH, false);
    }

    private static EvidenceField missing(String name, Instant retrievedAt) {
        return new EvidenceField(name, null, EvidenceMissingness.PROVIDER_FAILED, "yfinance", null, retrievedAt,
                null, null, null, EvidenceFreshness.UNKNOWN, false);
    }

    @Test
    void aSavedSnapshotIsReadBackExactlyWithFieldOrderAndMissingnessIntact() {
        ResearchEvidenceSnapshot saved = service.record(SYMBOL,
                List.of(present("pe", "28.4", T0), missing("eps", T0), present("beta", "1.2", T0)), T0);

        ResearchEvidenceSnapshot reread = port.findById(saved.id()).orElseThrow();

        assertThat(reread).isEqualTo(saved);
        assertThat(reread.fields()).extracting(EvidenceField::name).containsExactly("pe", "eps", "beta");
        assertThat(reread.fields().get(1).value()).isNull();
        assertThat(reread.fields().get(1).missingness()).isEqualTo(EvidenceMissingness.PROVIDER_FAILED);
    }

    @Test
    void revisingKeepsThePriorVersionUnchangedAndLatestReturnsTheRevision() {
        ResearchEvidenceSnapshot first = service.record(SYMBOL, List.of(present("pe", "28.4", T0)), T0);

        ResearchEvidenceSnapshot second = service.revise(first.id(), List.of(present("pe", "30.1", T1)), T1);

        assertThat(port.findById(first.id())).contains(first);
        assertThat(port.findLatestBySymbol(SYMBOL)).contains(second);
        assertThat(second.supersedesId()).contains(first.id());
    }

    @Test
    void savingAnExistingIdIsRejectedSoNoVersionIsRewritten() {
        ResearchEvidenceSnapshot first = service.record(SYMBOL, List.of(present("pe", "28.4", T0)), T0);
        ResearchEvidenceSnapshot rewrite = new ResearchEvidenceSnapshot(first.id(), SYMBOL, 1,
                java.util.Optional.empty(), T1, List.of(present("pe", "99", T1)));

        assertThatThrownBy(() -> port.save(rewrite)).isInstanceOf(IllegalStateException.class);
        assertThat(port.findById(first.id())).contains(first);
    }

    @Test
    void theDatabaseRejectsTwoRevisionsSupersedingTheSameSnapshot() {
        ResearchEvidenceSnapshot first = service.record(SYMBOL, List.of(present("pe", "28.4", T0)), T0);
        service.revise(first.id(), List.of(present("pe", "30.1", T1)), T1);
        ResearchEvidenceSnapshot fork = new ResearchEvidenceSnapshot("fork", SYMBOL, 3,
                java.util.Optional.of(first.id()), T1, List.of(present("pe", "31", T1)));

        assertThatThrownBy(() -> port.save(fork)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theDatabaseRejectsAMissingFieldThatCarriesAValue() {
        ResearchEvidenceSnapshot snapshot = service.record(SYMBOL, List.of(present("pe", "28.4", T0)), T0);

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO research_evidence_fields (snapshot_id, position, name, value, missingness, source, "
                        + "retrieved_at, freshness, conflicted) VALUES (?, 9, 'x', '1', 'NOT_PROVIDED', 'yfinance', "
                        + "now(), 'UNKNOWN', false)", snapshot.id()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void theDatabaseRejectsADuplicateFieldNameInOneSnapshot() {
        ResearchEvidenceSnapshot snapshot = service.record(SYMBOL, List.of(present("pe", "28.4", T0)), T0);

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO research_evidence_fields (snapshot_id, position, name, value, missingness, source, "
                        + "retrieved_at, freshness, conflicted) VALUES (?, 9, 'pe', '1', 'NONE', 'yfinance', "
                        + "now(), 'FRESH', false)", snapshot.id()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
