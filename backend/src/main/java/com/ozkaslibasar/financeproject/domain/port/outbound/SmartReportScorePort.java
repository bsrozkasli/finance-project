package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.Optional;

/**
 * Outbound port for composite investment scores used by smart reports.
 */
public interface SmartReportScorePort {

    Optional<CompositeScore> fetchCompositeScore(String symbol);

    record CompositeScore(
            Integer overallScore,
            String grade,
            String recommendation,
            ScoreBreakdown breakdown) {
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
