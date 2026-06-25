package com.ozkaslibasar.financeproject.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class SmartReport {
    private final String symbol;
    
    // Score board
    private final Integer overallScore;
    private final String grade;
    private final String recommendation;
    private final ScoreBreakdown breakdown;
    
    // Peer comparison
    private final List<PeerComparison> peers;

    @Getter
    @Builder
    public static class ScoreBreakdown {
        private final Integer fundamentalScore;
        private final Integer valuationScore;
        private final Integer qualityScore;
        private final Integer growthScore;
        private final Integer momentumScore;
        private final Integer riskScore;
        private final Integer earningsScore;
        private final Integer sentimentScore;
    }

    @Getter
    @Builder
    public static class PeerComparison {
        private final String symbol;
        private final Double peRatio; // F/K
        private final Double pbRatio; // PD/DD
        private final Double debtToEquity;
        private final Double netProfitMargin;
        private final Double roe; // Return on Equity
        // Add more fields if Finnhub provides them
    }
}
