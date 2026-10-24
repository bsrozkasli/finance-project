package com.ozkaslibasar.financeproject.domain.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/**
 * Evidence Strength with the facts behind it. {@code weightedCoverage} is the covered share of optional-field
 * weight (0..1); it is informational, the level is decided on exact weights.
 */
public record EvidenceStrengthResult(
        EvidenceStrength level,
        BigDecimal weightedCoverage,
        String policyVersion,
        List<EvidenceGap> gaps
) {
    public EvidenceStrengthResult {
        Objects.requireNonNull(level, "level must not be null");
        Objects.requireNonNull(weightedCoverage, "weightedCoverage must not be null");
        if (policyVersion == null || policyVersion.isBlank()) {
            throw new IllegalArgumentException("policyVersion must not be blank");
        }
        gaps = List.copyOf(Objects.requireNonNull(gaps, "gaps must not be null"));
    }
}
