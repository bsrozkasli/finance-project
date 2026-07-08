package com.ozkaslibasar.financeproject.domain.model;

import lombok.Builder;

import java.util.List;

@Builder
public class SmartReport {
    private final String symbol;

    private final Integer overallScore;
    private final String grade;
    private final String recommendation;
    private final ScoreBreakdown breakdown;

    private final List<PeerComparison> peers;

    public String getSymbol() {
        return symbol;
    }

    public Integer getOverallScore() {
        return overallScore;
    }

    public String getGrade() {
        return grade;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public ScoreBreakdown getBreakdown() {
        return breakdown;
    }

    public List<PeerComparison> getPeers() {
        return peers;
    }

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

        public Integer getFundamentalScore() {
            return fundamentalScore;
        }

        public Integer getValuationScore() {
            return valuationScore;
        }

        public Integer getQualityScore() {
            return qualityScore;
        }

        public Integer getGrowthScore() {
            return growthScore;
        }

        public Integer getMomentumScore() {
            return momentumScore;
        }

        public Integer getRiskScore() {
            return riskScore;
        }

        public Integer getEarningsScore() {
            return earningsScore;
        }

        public Integer getSentimentScore() {
            return sentimentScore;
        }
    }

    @Builder
    public static class PeerComparison {
        private final String symbol;
        private final Double peRatio;
        private final Double pbRatio;
        private final Double debtToEquity;
        private final Double netProfitMargin;
        private final Double roe;

        public String getSymbol() {
            return symbol;
        }

        public Double getPeRatio() {
            return peRatio;
        }

        public Double getPbRatio() {
            return pbRatio;
        }

        public Double getDebtToEquity() {
            return debtToEquity;
        }

        public Double getNetProfitMargin() {
            return netProfitMargin;
        }

        public Double getRoe() {
            return roe;
        }
    }
}
