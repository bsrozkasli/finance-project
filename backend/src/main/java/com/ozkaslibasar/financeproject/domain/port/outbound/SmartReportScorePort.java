package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Outbound port for composite investment scores used by smart reports.
 */
public interface SmartReportScorePort {

    Optional<CompositeScore> fetchCompositeScore(String symbol);

    /**
     * @param breakdownAvailability component name to availability; null when the source sent none
     * @param unavailableComponents component names the source reported as missing; null when absent.
     *        Pass-through data only, not used (R-8): it keeps the data-service short names
     *        ("valuation"), unlike the "*_score" keys of {@code breakdownAvailability}.
     */
    record CompositeScore(
            Integer overallScore,
            String grade,
            String recommendation,
            ScoreBreakdown breakdown,
            Map<String, ComponentAvailability> breakdownAvailability,
            List<String> unavailableComponents) {

        public CompositeScore(Integer overallScore, String grade, String recommendation, ScoreBreakdown breakdown) {
            this(overallScore, grade, recommendation, breakdown, null, null);
        }
    }

    /** Raw data-service status ("available", "unavailable", ...) and snake_case reason code. */
    record ComponentAvailability(String status, String unavailableReason) {
    }

    record ScoreBreakdown(
            Integer fundamentalScore,
            Integer valuationScore,
            Integer qualityScore,
            Integer growthScore,
            Integer momentumScore,
            Integer riskScore,
            Integer earningsScore,
            Integer sentimentScore) {
    }
}
