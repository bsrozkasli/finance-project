package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EligibilityDecision;
import com.ozkaslibasar.financeproject.domain.model.EligibilityReason;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.SecurityMasterPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.function.BiFunction;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-001 Task 1 / PRD-FR-001..003: eligibility fails closed. Only a known, actively listed stock or ETF is
 * eligible; an unresolved type is never promoted to STOCK. The stub port is the I/O boundary (OQ-2 names the
 * licensed master; none is wired yet).
 */
class InstrumentEligibilityServiceTest {

    private static final Instant T0 = Instant.parse("2026-01-15T00:00:00Z");
    private static final Instant T1 = Instant.parse("2026-06-15T00:00:00Z");

    private final List<String> askedSymbols = new ArrayList<>();
    private final List<Instant> askedInstants = new ArrayList<>();

    private InstrumentEligibilityService serviceReturning(BiFunction<String, Instant, Optional<InstrumentIdentity>> answer) {
        SecurityMasterPort port = (symbol, instant) -> {
            askedSymbols.add(symbol);
            askedInstants.add(instant);
            return answer.apply(symbol, instant);
        };
        return new InstrumentEligibilityService(port);
    }

    private static InstrumentIdentity identity(String symbol, AssetType type, ListingStatus status,
                                               ClassificationBasis basis, Instant retrievedAt) {
        return new InstrumentIdentity(symbol, type, status, basis, "test-master", retrievedAt);
    }

    private static InstrumentIdentity activePointInTime(String symbol, AssetType type) {
        return identity(symbol, type, ListingStatus.ACTIVE, ClassificationBasis.POINT_IN_TIME_MASTER, T0);
    }

    @ParameterizedTest
    @EnumSource(value = AssetType.class, names = {"STOCK", "ETF"})
    void activeStockAndEtfAreEligibleAtTheEvaluationInstant(AssetType type) {
        var service = serviceReturning((s, i) -> Optional.of(activePointInTime(s, type)));

        EligibilityDecision decision = service.evaluate("aapl", T1);

        assertThat(decision.eligible()).isTrue();
        assertThat(decision.reason()).isEqualTo(EligibilityReason.ELIGIBLE);
        assertThat(decision.identity()).isPresent();
        assertThat(askedSymbols).containsExactly("AAPL");
        assertThat(askedInstants).containsExactly(T1);
    }

    @Test
    void unresolvedTypeIsNeverEligibleAndNeverBecomesStock() {
        var service = serviceReturning((s, i) -> Optional.of(activePointInTime(s, AssetType.UNRESOLVED)));

        EligibilityDecision decision = service.evaluate("ZZZZ", T1);

        assertThat(decision.eligible()).isFalse();
        assertThat(decision.reason()).isEqualTo(EligibilityReason.UNRESOLVED_TYPE);
        assertThat(decision.identity().orElseThrow().assetType()).isEqualTo(AssetType.UNRESOLVED);
    }

    @Test
    void missingIdentityFailsClosed() {
        var service = serviceReturning((s, i) -> Optional.empty());

        EligibilityDecision decision = service.evaluate("ZZZZ", T1);

        assertThat(decision.eligible()).isFalse();
        assertThat(decision.reason()).isEqualTo(EligibilityReason.NO_IDENTITY);
        assertThat(decision.identity()).isEmpty();
    }

    @Test
    void identityForADifferentSymbolIsNotTrusted() {
        var service = serviceReturning((s, i) -> Optional.of(activePointInTime("MSFT", AssetType.STOCK)));

        EligibilityDecision decision = service.evaluate("AAPL", T1);

        assertThat(decision.eligible()).isFalse();
        assertThat(decision.reason()).isEqualTo(EligibilityReason.NO_IDENTITY);
    }

    @ParameterizedTest
    @EnumSource(value = AssetType.class, names = {"CRYPTO", "FOREX", "INDEX"})
    void typesOutsideStockAndEtfAreUnsupported(AssetType type) {
        var service = serviceReturning((s, i) -> Optional.of(activePointInTime(s, type)));

        EligibilityDecision decision = service.evaluate("XYZ", T1);

        assertThat(decision.eligible()).isFalse();
        assertThat(decision.reason()).isEqualTo(EligibilityReason.UNSUPPORTED_TYPE);
    }

    @ParameterizedTest
    @EnumSource(value = ListingStatus.class, names = {"DELISTED", "UNKNOWN"})
    void delistedOrUnknownListingIsNotEligible(ListingStatus status) {
        var service = serviceReturning((s, i) ->
                Optional.of(identity(s, AssetType.STOCK, status, ClassificationBasis.POINT_IN_TIME_MASTER, T0)));

        EligibilityDecision decision = service.evaluate("OLDCO", T1);

        assertThat(decision.eligible()).isFalse();
        assertThat(decision.reason()).isEqualTo(EligibilityReason.NOT_ACTIVELY_LISTED);
    }

    @Test
    void reclassifiedSymbolIsJudgedByTheClassificationInForceAtTheEvaluationInstant() {
        var service = serviceReturning((s, instant) -> Optional.of(
                instant.isBefore(T1) ? activePointInTime(s, AssetType.STOCK) : activePointInTime(s, AssetType.INDEX)));

        assertThat(service.evaluate("RECLS", T0).eligible()).isTrue();
        assertThat(service.evaluate("RECLS", T1).reason()).isEqualTo(EligibilityReason.UNSUPPORTED_TYPE);
    }

    @Test
    void currentObservationDoesNotProveClassificationBeforeItWasObserved() {
        var service = serviceReturning((s, i) -> Optional.of(
                identity(s, AssetType.STOCK, ListingStatus.ACTIVE, ClassificationBasis.CURRENT_OBSERVATION, T1)));

        EligibilityDecision historical = service.evaluate("AAPL", T0);
        EligibilityDecision atObservation = service.evaluate("AAPL", T1);

        assertThat(historical.eligible()).isFalse();
        assertThat(historical.reason()).isEqualTo(EligibilityReason.HISTORICAL_CLASSIFICATION_UNPROVEN);
        assertThat(atObservation.eligible()).isTrue();
    }

    @Test
    void blankSymbolIsRejectedBeforeAnyLookup() {
        var service = serviceReturning((s, i) -> Optional.empty());

        assertThatThrownBy(() -> service.evaluate("  ", T1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.evaluate(null, T1)).isInstanceOf(IllegalArgumentException.class);
        assertThat(askedSymbols).isEmpty();
    }

    @Test
    void identityRequiresEveryProvenanceField() {
        assertThatThrownBy(() -> new InstrumentIdentity("AAPL", AssetType.STOCK, ListingStatus.ACTIVE,
                ClassificationBasis.POINT_IN_TIME_MASTER, " ", T0)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new InstrumentIdentity("AAPL", null, ListingStatus.ACTIVE,
                ClassificationBasis.POINT_IN_TIME_MASTER, "src", T0)).isInstanceOf(NullPointerException.class);
    }
}
