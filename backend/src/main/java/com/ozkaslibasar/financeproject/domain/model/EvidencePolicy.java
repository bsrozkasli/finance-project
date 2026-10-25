package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Versioned, asset-type-specific declaration of which evidence fields are mandatory, how much each optional
 * field weighs, and how old each may be (PRD-FR-008). The engine carries no policy of its own: the approved
 * stock and ETF values come from OQ-3 and are supplied by whoever owns that record.
 */
public record EvidencePolicy(
        String version,
        AssetType assetType,
        Set<String> mandatoryFields,
        Map<String, BigDecimal> optionalWeights,
        Map<String, Duration> maxAge
) {
    public EvidencePolicy {
        if (version == null || version.isBlank()) {
            throw new IllegalArgumentException("version must not be blank");
        }
        Objects.requireNonNull(assetType, "assetType must not be null");
        if (assetType != AssetType.STOCK && assetType != AssetType.ETF) {
            throw new IllegalArgumentException("a policy applies to STOCK or ETF, not " + assetType);
        }
        mandatoryFields = Set.copyOf(Objects.requireNonNull(mandatoryFields, "mandatoryFields must not be null"));
        optionalWeights = Map.copyOf(Objects.requireNonNull(optionalWeights, "optionalWeights must not be null"));
        maxAge = Map.copyOf(Objects.requireNonNull(maxAge, "maxAge must not be null"));
        if (mandatoryFields.isEmpty()) {
            throw new IllegalArgumentException("a policy needs at least one mandatory field");
        }
        if (optionalWeights.isEmpty()) {
            throw new IllegalArgumentException("a policy needs at least one weighted optional field");
        }
        optionalWeights.forEach((field, weight) -> {
            if (weight.signum() <= 0) {
                throw new IllegalArgumentException("optional weight for " + field + " must be positive");
            }
        });
        for (String field : mandatoryFields) {
            if (optionalWeights.containsKey(field)) {
                throw new IllegalArgumentException("field " + field + " cannot be both mandatory and optional");
            }
        }
        Set<String> declared = new HashSet<>(mandatoryFields);
        declared.addAll(optionalWeights.keySet());
        for (String field : declared) {
            Duration window = maxAge.get(field);
            if (window == null) {
                throw new IllegalArgumentException("no freshness window for field " + field);
            }
            if (window.isZero() || window.isNegative()) {
                throw new IllegalArgumentException("freshness window for " + field + " must be positive");
            }
        }
        if (!declared.containsAll(maxAge.keySet())) {
            throw new IllegalArgumentException("freshness window declared for an undeclared field");
        }
    }
}
