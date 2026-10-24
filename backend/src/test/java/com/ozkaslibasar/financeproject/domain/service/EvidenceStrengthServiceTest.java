package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.EvidenceField;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGap;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGapReason;
import com.ozkaslibasar.financeproject.domain.model.EvidenceMissingness;
import com.ozkaslibasar.financeproject.domain.model.EvidencePolicy;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrength;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrengthResult;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

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

    private static EvidenceField fresh(String name) {
        return observed(name, FRESH_OBSERVED);
    }

    private static EvidenceField observed(String name, Instant observedAt) {
        return new EvidenceField(name, "1", EvidenceMissingness.NONE, "fixture", observedAt, EVAL, "TTM", "USD",
                "v1", EvidenceFreshness.FRESH, false);
    }

    private static EvidenceField conflicted(String name) {
        return new EvidenceField(name, "1", EvidenceMissingness.NONE, "fixture", FRESH_OBSERVED, EVAL, "TTM", "USD",
                "v1", EvidenceFreshness.FRESH, true);
    }

    private static EvidenceField flaggedStale(String name) {
        return new EvidenceField(name, "1", EvidenceMissingness.NONE, "fixture", FRESH_OBSERVED, EVAL, "TTM", "USD",
                "v1", EvidenceFreshness.STALE, false);
    }

    private static EvidenceField failed(String name) {
        return new EvidenceField(name, null, EvidenceMissingness.PROVIDER_FAILED, "fixture", null, EVAL, null, null,
                null, EvidenceFreshness.UNKNOWN, false);
    }

    private static ResearchEvidenceSnapshot snapshot(EvidenceField... fields) {
        return new ResearchEvidenceSnapshot("snap-1", "AAPL", 1, Optional.empty(), EVAL, List.of(fields));
    }

    private static EvidenceField[] mandatoryPlus(EvidenceField... others) {
        List<EvidenceField> all = new ArrayList<>(List.of(fresh("price"), fresh("eps")));
        all.addAll(List.of(others));
        return all.toArray(new EvidenceField[0]);
    }

    private EvidenceStrengthResult evaluate(EvidencePolicy policy, ResearchEvidenceSnapshot snapshot) {
        return service.evaluate(snapshot, AssetType.STOCK, policy, EVAL);
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
        List<EvidenceField> present = new ArrayList<>(List.of(fresh("price"), fresh("eps")));
        for (int i = 1; i <= 10; i++) {
            optional.put("tiny" + i, BigDecimal.ONE);
            present.add(fresh("tiny" + i));
        }

        EvidenceStrengthResult result = evaluate(policyOf("t1", optional), snapshot(present.toArray(new EvidenceField[0])));

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
    void aMandatoryFieldWithoutAnObservationTimeIsInsufficientBecauseItsAgeIsUnknown() {
        EvidenceField undated = new EvidenceField("price", "1", EvidenceMissingness.NONE, "fixture", null, EVAL,
                "TTM", "USD", "v1", EvidenceFreshness.UNKNOWN, false);

        EvidenceStrengthResult result = evaluate(policy("t1", "60", "40"),
                snapshot(undated, fresh("eps"), fresh("a"), fresh("b")));

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("price", EvidenceGapReason.UNDATED));
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
                snapshot(mandatoryPlus(fresh("a"), fresh("b"))), AssetType.UNRESOLVED, policy("t1", "60", "40"), EVAL);

        assertThat(result.level()).isEqualTo(EvidenceStrength.INSUFFICIENT);
        assertThat(result.gaps()).containsExactly(new EvidenceGap("instrument.type", EvidenceGapReason.UNRESOLVED_TYPE));
    }

    @Test
    void aPolicyForAnotherAssetTypeIsRejectedRatherThanApplied() {
        assertThatThrownBy(() -> service.evaluate(
                snapshot(mandatoryPlus(fresh("a"), fresh("b"))), AssetType.ETF, policy("t1", "60", "40"), EVAL))
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
