package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.EvidenceFreshness;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGap;
import com.ozkaslibasar.financeproject.domain.model.EvidenceGapReason;
import com.ozkaslibasar.financeproject.domain.model.EvidencePolicy;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrength;
import com.ozkaslibasar.financeproject.domain.model.EvidenceStrengthResult;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceField;
import com.ozkaslibasar.financeproject.domain.model.ResearchEvidenceSnapshot;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Deterministic Evidence Strength (PRD-FR-008). Hard gates first: an unresolved type, or any mandatory field
 * that is missing, stale, future-dated or conflicted, is Insufficient whatever else is covered. Past
 * the gates the level follows the weighted share of optional fields that are current: at least 90% is High,
 * at least 75% Medium, otherwise Low. Optional gaps lower the level but never make it Insufficient.
 *
 * <p>A field may hold several entries (periods, sources). The most recently observed entry decides; within its
 * period, each source's latest entry must carry the same value and no conflict note, or the field is CONFLICTED.
 * Choosing between disagreeing sources is an OQ-3 conflict priority, so none is chosen here. Older periods are
 * history and are not judged.
 */
public class EvidenceStrengthService {

    private static final BigDecimal HIGH_PERCENT = new BigDecimal("90");
    private static final BigDecimal MEDIUM_PERCENT = new BigDecimal("75");
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    public EvidenceStrengthResult evaluate(ResearchEvidenceSnapshot snapshot, EvidencePolicy policy,
                                           Instant evaluationInstant) {
        Objects.requireNonNull(snapshot, "snapshot must not be null");
        Objects.requireNonNull(policy, "policy must not be null");
        Objects.requireNonNull(evaluationInstant, "evaluationInstant must not be null");
        AssetType assetType = snapshot.identity().assetType();

        if (assetType == AssetType.UNRESOLVED) {
            return new EvidenceStrengthResult(EvidenceStrength.INSUFFICIENT, BigDecimal.ZERO, policy.version(),
                    List.of(new EvidenceGap("instrument.type", EvidenceGapReason.UNRESOLVED_TYPE)));
        }
        if (assetType != policy.assetType()) {
            throw new IllegalArgumentException(
                    "policy " + policy.version() + " is for " + policy.assetType() + ", not " + assetType);
        }

        Map<String, List<ResearchEvidenceField>> byName = new HashMap<>();
        snapshot.fields().forEach(field -> byName.computeIfAbsent(field.name(), name -> new ArrayList<>()).add(field));

        List<EvidenceGap> gaps = new ArrayList<>();
        boolean mandatoryGap = false;
        for (String name : policy.mandatoryFields()) {
            Optional<EvidenceGapReason> reason = gapOf(byName.getOrDefault(name, List.of()), policy.maxAge().get(name), evaluationInstant);
            if (reason.isPresent()) {
                mandatoryGap = true;
                gaps.add(new EvidenceGap(name, reason.get()));
            }
        }

        BigDecimal totalWeight = BigDecimal.ZERO;
        BigDecimal coveredWeight = BigDecimal.ZERO;
        for (Map.Entry<String, BigDecimal> optional : policy.optionalWeights().entrySet()) {
            totalWeight = totalWeight.add(optional.getValue());
            Optional<EvidenceGapReason> reason =
                    gapOf(byName.getOrDefault(optional.getKey(), List.of()), policy.maxAge().get(optional.getKey()),
                            evaluationInstant);
            if (reason.isPresent()) {
                gaps.add(new EvidenceGap(optional.getKey(), reason.get()));
            } else {
                coveredWeight = coveredWeight.add(optional.getValue());
            }
        }
        gaps.sort(Comparator.comparing(EvidenceGap::field));

        BigDecimal coverage = coveredWeight.divide(totalWeight, MathContext.DECIMAL64);
        EvidenceStrength level = mandatoryGap
                ? EvidenceStrength.INSUFFICIENT
                : levelFor(coveredWeight, totalWeight);
        return new EvidenceStrengthResult(level, coverage, policy.version(), gaps);
    }

    /** Exact comparison on weights, so a boundary such as 90 of 100 is High and 89 of 100 is not. */
    private static EvidenceStrength levelFor(BigDecimal covered, BigDecimal total) {
        BigDecimal scaled = covered.multiply(HUNDRED);
        if (scaled.compareTo(total.multiply(HIGH_PERCENT)) >= 0) {
            return EvidenceStrength.HIGH;
        }
        if (scaled.compareTo(total.multiply(MEDIUM_PERCENT)) >= 0) {
            return EvidenceStrength.MEDIUM;
        }
        return EvidenceStrength.LOW;
    }

    private static Optional<EvidenceGapReason> gapOf(List<ResearchEvidenceField> entries, Duration maxAge, Instant at) {
        List<ResearchEvidenceField> present = entries.stream().filter(entry -> entry.rawValue() != null).toList();
        if (present.isEmpty()) {
            return Optional.of(EvidenceGapReason.MISSING);
        }
        ResearchEvidenceField field = present.stream()
                .max(Comparator.comparing(ResearchEvidenceField::observedAt))
                .orElseThrow();
        if (conflictedWithinPeriod(present, field)) {
            return Optional.of(EvidenceGapReason.CONFLICTED);
        }
        if (field.freshness() == EvidenceFreshness.STALE) {
            return Optional.of(EvidenceGapReason.STALE);
        }
        if (field.observedAt().isAfter(at)) {
            return Optional.of(EvidenceGapReason.FUTURE_DATED);
        }
        if (Duration.between(field.observedAt(), at).compareTo(maxAge) > 0) {
            return Optional.of(EvidenceGapReason.STALE);
        }
        return Optional.empty();
    }

    /** Compares every source's latest entry for the deciding entry's period; ties within a source count too. */
    private static boolean conflictedWithinPeriod(List<ResearchEvidenceField> present, ResearchEvidenceField deciding) {
        List<ResearchEvidenceField> samePeriod = present.stream()
                .filter(entry -> Objects.equals(entry.period(), deciding.period()))
                .toList();
        Map<String, Instant> latestBySource = new HashMap<>();
        samePeriod.forEach(entry -> latestBySource.merge(entry.source(), entry.observedAt(),
                (a, b) -> a.isAfter(b) ? a : b));
        return samePeriod.stream()
                .filter(entry -> entry.observedAt().equals(latestBySource.get(entry.source())))
                .anyMatch(entry -> entry.conflictNote() != null || !entry.rawValue().equals(deciding.rawValue()));
    }
}
