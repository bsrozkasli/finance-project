package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.List;
import java.util.Optional;

public interface PatternDetectionPort {

    Optional<PatternDetectionResult> detectPatterns(String symbol, String interval, String range, boolean includeLlmContext);

    record PatternDetectionResult(
            String symbol,
            String interval,
            List<DetectedPattern> patterns,
            DetectedPattern dominantPattern,
            String llmContext,
            Long detectedAt
    ) {
    }

    record DetectedPattern(
            String patternType,
            String direction,
            Double confidence,
            Integer startIndex,
            Integer endIndex,
            String description,
            Double priceTarget
    ) {
    }
}
