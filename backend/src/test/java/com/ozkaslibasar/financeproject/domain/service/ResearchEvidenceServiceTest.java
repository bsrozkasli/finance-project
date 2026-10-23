package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResearchEvidenceServiceTest {

    private static final Instant OBSERVED = Instant.parse("2026-01-15T14:00:00Z");
    private static final Instant RETRIEVED = Instant.parse("2026-01-15T14:01:00Z");
    private static final Instant REVISED = Instant.parse("2026-01-16T14:01:00Z");

    private final ResearchEvidenceService service = new ResearchEvidenceService();

    private static InstrumentIdentity identity(String symbol) {
        return new InstrumentIdentity(symbol, AssetType.STOCK, ListingStatus.UNKNOWN,
                ClassificationBasis.CURRENT_OBSERVATION, "synthetic-test-source", RETRIEVED);
    }

    private static ResearchEvidenceField observed(String value) {
        return new ResearchEvidenceField("close", value, null, "synthetic-test-source", OBSERVED,
                RETRIEVED, "2026-01-15", "USD", "none", null);
    }

    @Test
    void revisionCreatesNewIdentityAndPreservesOriginalEvidence() {
        var first = service.create(identity("aapl"), RETRIEVED, List.of(observed("100.00")));
        var second = service.revise(first, identity("AAPL"), REVISED, List.of(observed("101.00")));

        assertThat(first.id()).isNotEqualTo(second.id());
        assertThat(first.revision()).isEqualTo(1);
        assertThat(first.previousId()).isNull();
        assertThat(second.revision()).isEqualTo(2);
        assertThat(second.previousId()).isEqualTo(first.id());
        assertThat(first.fields().get(0).rawValue()).isEqualTo("100.00");
        assertThat(second.fields().get(0).rawValue()).isEqualTo("101.00");
        assertThat(first.identity().basis()).isEqualTo(ClassificationBasis.CURRENT_OBSERVATION);
    }

    @Test
    void missingEvidenceKeepsItsReasonWithoutInventingAValue() {
        var missing = new ResearchEvidenceField("close", null, "provider_unavailable",
                "synthetic-test-source", null, RETRIEVED, "2026-01-15", "USD", "none", null);

        var snapshot = service.create(identity("AAPL"), RETRIEVED, List.of(missing));

        assertThat(snapshot.fields().get(0).rawValue()).isNull();
        assertThat(snapshot.fields().get(0).missingReason()).isEqualTo("provider_unavailable");
        assertThatThrownBy(() -> new ResearchEvidenceField("close", null, null,
                "synthetic-test-source", null, RETRIEVED, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsIncompleteProvenanceDuplicateFieldsAndCrossSymbolRevision() {
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null,
                " ", OBSERVED, RETRIEVED, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null,
                "synthetic-test-source", null, RETRIEVED, null, null, null, null))
                .isInstanceOf(IllegalArgumentException.class);

        var first = service.create(identity("AAPL"), RETRIEVED, List.of(observed("100.00")));
        assertThatThrownBy(() -> service.create(identity("AAPL"), RETRIEVED,
                List.of(observed("100.00"), observed("100.00"))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.revise(first, identity("MSFT"), REVISED,
                List.of(observed("101.00"))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void snapshotCopiesCallerOwnedFieldList() {
        var fields = new ArrayList<>(List.of(observed("100.00")));
        var snapshot = service.create(identity("AAPL"), RETRIEVED, fields);

        fields.clear();

        assertThat(snapshot.fields()).hasSize(1);
        assertThatThrownBy(() -> snapshot.fields().clear())
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void keepsMultiplePeriodsAndConflictingSourcesForTheSameField() {
        var priorPeriod = new ResearchEvidenceField("close", "90.00", null,
                "synthetic-test-source", OBSERVED, RETRIEVED, "2025-12-31", "USD", "none", null);
        var otherSource = new ResearchEvidenceField("close", "99.00", null,
                "other-synthetic-source", OBSERVED, RETRIEVED, "2026-01-15", "USD", "none", "sources_disagree");

        var snapshot = service.create(identity("AAPL"), RETRIEVED,
                List.of(observed("100.00"), priorPeriod, otherSource));

        assertThat(snapshot.fields()).containsExactly(observed("100.00"), priorPeriod, otherSource);
    }

    @Test
    void rejectsAnObservationThatOccursAfterItsRetrieval() {
        assertThatThrownBy(() -> new ResearchEvidenceField("close", "100.00", null,
                "synthetic-test-source", REVISED, RETRIEVED, "2026-01-15", "USD", "none", null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
