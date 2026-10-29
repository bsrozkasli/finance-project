package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGap;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGapReason;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.EvidencePolicy;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrength;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrengthResult;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-001 Task 3 / PRD-FR-008: Evidence Strength is a deterministic function of a snapshot and a versioned
 * policy. The policies below are TEST FIXTURES that exercise the rule; the approved stock and ETF policies
 * (mandatory fields, weights, freshness windows) wait on OQ-3 and are deliberately not defined in production code.
 */
class EvidenceStrengthServiceTest {

    private static final Instant EVAL = Instant.parse("2026-10-24T00:00:00Z");
    private static final Duration WINDOW = Duration.ofDays(7);
    private static final Instant FRESH_OBSERVED = EVAL.minus(Duration.ofDays(1));
    /** Captured after EVAL so a fixture can hold an observation that postdates the evaluation instant. */
    private static final Instant CAPTURED = EVAL.plus(Duration.ofHours(1));

    private final EvidenceStrengthService service = new EvidenceStrengthService();

    /** Mandatory {price, eps}; optional weights a/b given; every field shares one freshness window. */
    private static EvidencePolicy policy(String version, String optionalA, String optionalB) {
        Map<String, BigDecimal> optional = new LinkedHashMap<>();
        optional.put("a", new BigDecimal(optionalA));
        optional.put("b", new BigDecimal(optionalB));
        return policyOf(version, optional);
    }

    private static EvidencePolicy policyOf(String version, Map<String, BigDecimal> optional) {
        Map<String, Duration> windows = new LinkedHashMap<>();
        windows.put("price", WINDOW);
        windows.put("eps", WINDOW);
        optional.keySet().forEach(name -> windows.put(name, WINDOW));
        return new EvidencePolicy(version, AssetType.STOCK, Set.of("price", "eps"), optional, windows);
    }

    private static ResearchEvidenceField fresh(String name) {
        return observed(name, FRESH_OBSERVED);
    }

    private static ResearchEvidenceField observed(String name, Instant observedAt) {
        return field(name, "1", "fixture", "TTM", observedAt, EvidenceFreshness.FRESH, null);
    }

    private static ResearchEvidenceField field(String name, String value, String source, String period,
                                               Instant observedAt, EvidenceFreshness freshness, String conflictNote) {
        return new ResearchEvidenceField(name, value, null, source, observedAt, CAPTURED, period, "USD", "v1",
                freshness, conflictNote);
    }

    private static ResearchEvidenceField conflicted(String name) {
        return field(name, "1", "fixture", "TTM", FRESH_OBSERVED, EvidenceFreshness.FRESH, "sources_disagree");
    }

    private static ResearchEvidenceField flaggedStale(String name) {
        return field(name, "1", "fixture", "TTM", FRESH_OBSERVED, EvidenceFreshness.STALE, null);
    }

    private static ResearchEvidenceField failed(String name) {
        return new ResearchEvidenceField(name, null, EvidenceMissingness.PROVIDER_FAILED, "fixture", null, CAPTURED,
                null, null, null, EvidenceFreshness.UNKNOWN, null);
    }

    private static ResearchEvidenceSnapshot snapshot(ResearchEvidenceField... fields) {
        return snapshotOf(AssetType.STOCK, fields);
    }

    private static ResearchEvidenceSnapshot snapshotOf(AssetType type, ResearchEvidenceField... fields) {
        InstrumentIdentity identity = new InstrumentIdentity("AAPL", type, ListingStatus.UNKNOWN,
                ClassificationBasis.CURRENT_OBSERVATION, "fixture", EVAL);
        return new ResearchEvidenceSnapshot(UUID.randomUUID(), null, 1, identity, CAPTURED, List.of(fields));
    }

    private static ResearchEvidenceField[] mandatoryPlus(ResearchEvidenceField... others) {
        List<ResearchEvidenceField> all = new ArrayList<>(List.of(fresh("price"), fresh("eps")));
        all.addAll(List.of(others));
        return all.toArray(new ResearchEvidenceField[0]);
    }

    private EvidenceStrengthResult evaluate(EvidencePolicy policy, ResearchEvidenceSnapshot snapshot) {
        return service.evaluate(snapshot, policy, EVAL);
    }

    // ---- weighted thresholds ------------------------------------------------------------------------------

    @Test
    void fullCoverageWithCurrentMandatoryFieldsIsHigh() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"), snapshot(mandatoryPlus(fresh("a"), fresh("b"))));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
        assertThat(result.weightedCoverage()).isEqualByComparingTo("1");
        assertThat(result.policyVersion()).isEqualTo("t1");
        assertThat(result.gaps()).isEmpty();
    }

    @Test
    void exactlyNinetyPercentWeightedCoverageIsHighAndJustBelowIsMedium() {
        assertThat(evaluate(policy("t1", "90", "10"), snapshot(mandatoryPlus(fresh("a")))).level())
                .isEqualTo(EvidenceStrength.HIGH);
        assertThat(evaluate(policy("t1", "89", "11"), snapshot(mandatoryPlus(fresh("a")))).level())
                .isEqualTo(EvidenceStrength.MEDIUM);
    }

    @Test
    void exactlySeventyFivePercentWeightedCoverageIsMediumAndJustBelowIsLow() {
        assertThat(evaluate(policy("t1", "75", "25"), snapshot(mandatoryPlus(fresh("a")))).level())
                .isEqualTo(EvidenceStrength.MEDIUM);
        assertThat(evaluate(policy("t1", "74", "26"), snapshot(mandatoryPlus(fresh("a")))).level())
                .isEqualTo(EvidenceStrength.LOW);
    }

    @Test
    void addingManyLowWeightFieldsCannotMaskAMissingMaterialField() {
        Map<String, BigDecimal> optional = new LinkedHashMap<>();
        optional.put("heavy", new BigDecimal("90"));
        List<ResearchEvidenceField> present = new ArrayList<>(List.of(fresh("price"), fresh("eps")));
        for (int i = 1; i <= 10; i++) {
            optional.put("tiny" + i, BigDecimal.ONE);
            present.add(fresh("tiny" + i));
        }

        EvidenceStrengthResult result = evaluate(policyOf("t1", optional), snapshot(present.toArray(new ResearchEvidenceField[0])));

        assertThat(result.level()).isEqualTo(EvidenceStrength.LOW);
        assertThat(result.weightedCoverage()).isEqualByComparingTo("0.1");
    }

    @Test
    void policyWeightsDecideTheLevelSoMutatingThemMovesTheOutcome() {
        ResearchEvidenceSnapshot onlyA = snapshot(mandatoryPlus(fresh("a")));

        assertThat(evaluate(policy("t1", "90", "10"), onlyA).level()).isEqualTo(EvidenceStrength.HIGH);
        assertThat(evaluate(policy("t1", "10", "90"), onlyA).level()).isEqualTo(EvidenceStrength.LOW);
    }

    // ---- hard gates -> Insufficient -----------------------------------------------------------------------

    @Test
    void aMissingMandatoryFieldIsInsufficientEvenWithFullOptionalCoverage() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(fresh("price"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("eps", EvidenceGapReason.MISSING));
    }

    @Test
    void aMandatoryFieldTheProviderFailedToReturnIsInsufficient() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(fresh("price"), failed("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).contains(new EvidenceGap("eps", EvidenceGapReason.MISSING));
    }

    @Test
    void aMandatoryFieldObservedOutsideItsFreshnessWindowIsInsufficient() {
        Instant old = EVAL.minus(WINDOW).minusSeconds(1);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(observed("price", old), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.STALE));
    }

    @Test
    void aMandatoryFieldObservedExactlyAtTheWindowEdgeIsStillCurrent() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(observed("price", EVAL.minus(WINDOW)), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
    }

    @Test
    void aMandatoryFieldFlaggedStaleAtIngestionIsInsufficientEvenInsideTheWindow() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(flaggedStale("price"), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.STALE));
    }

    @Test
    void anUnresolvedConflictOnAMandatoryFieldIsInsufficient() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(conflicted("price"), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.CONFLICTED));
    }

    @Test
    void aMandatoryFieldObservedAfterTheEvaluationInstantIsInsufficient() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(observed("price", EVAL.plusSeconds(1)), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.FUTURE_DATED));
    }

    @Test
    void anUnresolvedInstrumentTypeIsInsufficientWhateverTheEvidence() {
        EvidenceStrengthResult result = service.evaluate(
                snapshotOf(AssetType.UNRESOLVED, mandatoryPlus(fresh("a"), fresh("b"))), policy("t1", "60", "40"), EVAL);

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("instrument.type", EvidenceGapReason.UNRESOLVED_TYPE));
    }

    @Test
    void aPolicyForAnotherAssetTypeIsRejectedRatherThanApplied() {
        assertThatThrownBy(() -> service.evaluate(
                snapshotOf(AssetType.ETF, mandatoryPlus(fresh("a"), fresh("b"))), policy("t1", "60", "40"), EVAL))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("ETF");
    }

    // ---- optional gaps lower the level but never make it Insufficient --------------------------------------

    @Test
    void staleOrConflictedOptionalFieldsCountAsUncoveredAndYieldLowNotInsufficient() {
        EvidenceStrengthResult result = evaluate(policy("t1", "50", "50"),
                snapshot(mandatoryPlus(flaggedStale("a"), conflicted("b"))));

        assertThat(result.level()).isEqualTo(EvidenceStrength.LOW);
        assertThat(result.weightedCoverage()).isEqualByComparingTo("0");
        assertThat(result.gaps()).containsExactly(
                new EvidenceGap("a", EvidenceGapReason.STALE),
                new EvidenceGap("b", EvidenceGapReason.CONFLICTED));
    }

    @Test
    void fieldsTheSnapshotHoldsButThePolicyDoesNotNameAreIgnored() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(mandatoryPlus(fresh("a"), fresh("b"), fresh("unrelated"), failed("other"))));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
        assertThat(result.gaps()).isEmpty();
    }

    @Test
    void gapsAreReportedInFieldNameOrderSoTheResultIsDeterministic() {
        EvidenceStrengthResult result = evaluate(policy("t1", "50", "50"), snapshot(fresh("price")));

        assertThat(result.gaps()).extracting(EvidenceGap::field).containsExactly("a", "b", "eps");
    }

    // ---- several entries for one field: the latest period decides; disagreement there is a conflict --------
    // Choosing between disagreeing sources is an OQ-3 conflict priority; until one is approved it is CONFLICTED.

    @Test
    void anOlderPeriodOfAFieldIsHistoryAndDoesNotMakeTheCurrentOneStale() {
        ResearchEvidenceField lastYear = field("price", "0.9", "fixture", "FY2025", EVAL.minus(Duration.ofDays(300)),
                EvidenceFreshness.STALE, null);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(fresh("price"), lastYear, fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
    }

    @Test
    void anotherSourcesOlderPeriodIsNotComparedWithTheCurrentPeriod() {
        ResearchEvidenceField otherSourceLastYear = field("price", "0.9", "other-fixture", "FY2025",
                EVAL.minus(Duration.ofDays(300)), EvidenceFreshness.FRESH, null);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(fresh("price"), otherSourceLastYear, fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
    }

    @Test
    void theMostRecentlyObservedPeriodIsJudgedSoAnEarlierCurrentValueCannotHideIt() {
        ResearchEvidenceField latest = field("price", "1", "fixture", "Q4", EVAL.plusSeconds(1),
                EvidenceFreshness.FRESH, null);
        ResearchEvidenceField earlier = field("price", "1", "fixture", "Q3", FRESH_OBSERVED,
                EvidenceFreshness.FRESH, null);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(latest, earlier, fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.FUTURE_DATED));
    }

    @Test
    void twoSourcesDisagreeingOnTheCurrentPeriodIsAConflictEvenWithoutANote() {
        ResearchEvidenceField other = field("price", "1.05", "other-fixture", "TTM", FRESH_OBSERVED,
                EvidenceFreshness.FRESH, null);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(fresh("price"), other, fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.CONFLICTED));
    }

    @Test
    void aConflictNoteOnAnyCurrentEntryMakesTheFieldConflicted() {
        ResearchEvidenceField flagged = field("price", "1", "other-fixture", "TTM", FRESH_OBSERVED.minusSeconds(60),
                EvidenceFreshness.FRESH, "sources_disagree");

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(flagged, fresh("price"), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.CONFLICTED));
    }

    @Test
    void sourcesThatAgreeOnTheCurrentPeriodAreNotAConflict() {
        ResearchEvidenceField other = field("price", "1", "other-fixture", "TTM", FRESH_OBSERVED.minusSeconds(60),
                EvidenceFreshness.FRESH, null);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(fresh("price"), other, fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
    }

    @Test
    void aSourceUpdatingItsOwnValueWithinAPeriodIsNotAConflict() {
        ResearchEvidenceField earlier = field("price", "0.98", "fixture", "TTM", FRESH_OBSERVED.minusSeconds(3600),
                EvidenceFreshness.FRESH, null);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(earlier, fresh("price"), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
    }

    @Test
    void aFailedSourceDoesNotHideAnotherSourcesCurrentValue() {
        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(fresh("price"), failed("price"), fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.HIGH);
    }

    // ---- policy validation ----------------------------------------------------------------------------------

    @Test
    void aPolicyMustBeForStockOrEtfAndNameItsVersion() {
        assertThatThrownBy(() -> new EvidencePolicy("t1", AssetType.UNRESOLVED, Set.of("price"),
                Map.of("a", BigDecimal.ONE), Map.of("price", WINDOW, "a", WINDOW)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EvidencePolicy(" ", AssetType.STOCK, Set.of("price"),
                Map.of("a", BigDecimal.ONE), Map.of("price", WINDOW, "a", WINDOW)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aPolicyNeedsMandatoryFieldsAndPositiveOptionalWeights() {
        assertThatThrownBy(() -> new EvidencePolicy("t1", AssetType.STOCK, Set.of(),
                Map.of("a", BigDecimal.ONE), Map.of("a", WINDOW)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EvidencePolicy("t1", AssetType.STOCK, Set.of("price"),
                Map.of(), Map.of("price", WINDOW)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new EvidencePolicy("t1", AssetType.STOCK, Set.of("price"),
                Map.of("a", BigDecimal.ZERO), Map.of("price", WINDOW, "a", WINDOW)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void aFieldCannotBeBothMandatoryAndOptionalAndEveryFieldNeedsAFreshnessWindow() {
        assertThatThrownBy(() -> new EvidencePolicy("t1", AssetType.STOCK, Set.of("price"),
                Map.of("price", BigDecimal.ONE), Map.of("price", WINDOW)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("price");
        assertThatThrownBy(() -> new EvidencePolicy("t1", AssetType.STOCK, Set.of("price"),
                Map.of("a", BigDecimal.ONE), Map.of("price", WINDOW)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("a");
        assertThatThrownBy(() -> new EvidencePolicy("t1", AssetType.STOCK, Set.of("price"),
                Map.of("a", BigDecimal.ONE), Map.of("price", WINDOW, "a", Duration.ZERO)))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
