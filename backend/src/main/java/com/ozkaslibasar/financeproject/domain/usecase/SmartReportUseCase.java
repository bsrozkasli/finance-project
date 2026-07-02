package com.ozkaslibasar.financeproject.domain.usecase;

import com.ozkaslibasar.financeproject.domain.model.SmartReport;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

@Slf4j
public class SmartReportUseCase {

    private final SmartReportScorePort smartReportScorePort;
    private final SmartReportMarketDataPort smartReportMarketDataPort;

    public SmartReportUseCase(
            SmartReportScorePort smartReportScorePort,
            SmartReportMarketDataPort smartReportMarketDataPort) {
        this.smartReportScorePort = smartReportScorePort;
        this.smartReportMarketDataPort = smartReportMarketDataPort;
    }

    public SmartReport getSmartReport(String symbol) {
        log.info("Generating smart report for {}", symbol);

        SmartReportScorePort.CompositeScore score = smartReportScorePort.fetchCompositeScore(symbol)
                .orElse(null);

        SmartReport.ScoreBreakdown breakdown;
        Integer overallScore;
        String grade;
        String recommendation;

        if (score != null && score.breakdown() != null) {
            SmartReportScorePort.ScoreBreakdown scoreBreakdown = score.breakdown();
            breakdown = SmartReport.ScoreBreakdown.builder()
                    .fundamentalScore(safe(scoreBreakdown.fundamentalScore()))
                    .valuationScore(safe(scoreBreakdown.valuationScore()))
                    .qualityScore(safe(scoreBreakdown.qualityScore()))
                    .growthScore(safe(scoreBreakdown.growthScore()))
                    .momentumScore(safe(scoreBreakdown.momentumScore()))
                    .riskScore(safe(scoreBreakdown.riskScore()))
                    .earningsScore(safe(scoreBreakdown.earningsScore()))
                    .sentimentScore(safe(scoreBreakdown.sentimentScore()))
                    .build();
            overallScore = safe(score.overallScore());
            grade = score.grade() != null ? score.grade() : gradeFromScore(overallScore);
            recommendation = score.recommendation() != null ? score.recommendation() : recFromScore(overallScore);
        } else {
            log.warn("Data-service unavailable for {}; building fallback report from Finnhub metrics", symbol);
            SmartReportMarketDataPort.CompanyMetrics metrics = smartReportMarketDataPort.fetchCompanyMetrics(symbol)
                    .orElse(null);

            Integer fundamentalScore = null;
            if (metrics != null) {
                fundamentalScore = computeSimpleScore(metrics);
                overallScore = fundamentalScore;
                grade = gradeFromScore(overallScore);
                recommendation = recFromScore(overallScore);
            } else {
                overallScore = null;
                grade = null;
                recommendation = null;
            }

            breakdown = SmartReport.ScoreBreakdown.builder()
                    .fundamentalScore(fundamentalScore)
                    .valuationScore(null)
                    .qualityScore(null)
                    .growthScore(null)
                    .momentumScore(null)
                    .riskScore(null)
                    .earningsScore(null)
                    .sentimentScore(null)
                    .build();
        }

        List<String> peers;
        try {
            peers = smartReportMarketDataPort.fetchPeers(symbol);
        } catch (Exception e) {
            peers = List.of();
        }

        List<SmartReport.PeerComparison> peerComparisons = new ArrayList<>();
        peerComparisons.add(fetchPeerMetrics(symbol));

        int peerCount = 0;
        for (String peerSymbol : peers) {
            if (peerSymbol.equals(symbol) || peerSymbol.contains(".")) continue;
            if (peerCount >= 3) break;
            SmartReport.PeerComparison peerMetric = fetchPeerMetrics(peerSymbol);
            if (peerMetric != null) {
                peerComparisons.add(peerMetric);
                peerCount++;
            }
        }

        return SmartReport.builder()
                .symbol(symbol)
                .overallScore(overallScore)
                .grade(grade)
                .recommendation(recommendation)
                .breakdown(breakdown)
                .peers(peerComparisons)
                .build();
    }

    private static int safe(Integer v) { return v != null ? v : 50; }

    private static String gradeFromScore(int s) {
        if (s >= 80) return "A";
        if (s >= 65) return "B";
        if (s >= 50) return "C";
        if (s >= 35) return "D";
        return "F";
    }

    private static String recFromScore(int s) {
        if (s >= 70) return "STRONG_BUY";
        if (s >= 55) return "BUY";
        if (s >= 45) return "HOLD";
        if (s >= 30) return "SELL";
        return "STRONG_SELL";
    }

    private static Integer computeSimpleScore(SmartReportMarketDataPort.CompanyMetrics m) {
        if (m == null) return null;
        int score = 50;
        if (m.roe() != null) {
            double roe = m.roe();
            score += roe > 20 ? 10 : roe > 10 ? 5 : roe < 0 ? -10 : 0;
        }
        if (m.netProfitMargin() != null) {
            double netMargin = m.netProfitMargin();
            score += netMargin > 0.20 ? 10 : netMargin > 0.10 ? 5 : netMargin < 0 ? -10 : 0;
        }
        if (m.peRatio() != null) {
            double pe = m.peRatio();
            score += pe > 0 && pe < 15 ? 5 : pe > 50 ? -5 : 0;
        }
        return Math.max(0, Math.min(100, score));
    }

    private SmartReport.PeerComparison fetchPeerMetrics(String symbol) {
        try {
            return smartReportMarketDataPort.fetchCompanyMetrics(symbol)
                    .map(m -> SmartReport.PeerComparison.builder()
                            .symbol(symbol)
                            .peRatio(m.peRatio())
                            .pbRatio(m.pbRatio())
                            .debtToEquity(m.debtToEquity())
                            .netProfitMargin(m.netProfitMargin())
                            .roe(m.roe())
                            .build())
                    .orElse(SmartReport.PeerComparison.builder().symbol(symbol).build());
        } catch (Exception e) {
            log.warn("Failed to fetch metrics for peer {}", symbol);
        }
        return SmartReport.PeerComparison.builder().symbol(symbol).build();
    }
}
