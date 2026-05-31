package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.List;
import java.util.Optional;

public interface LlmInsightPort {

    Optional<InsightResult> generateInsight(String symbol, boolean includeTechnical, boolean includeSentiment, String scenario);

    Optional<SentimentResult> getSentiment(String symbol);

    Optional<FullAnalysisResult> getFullAnalysis(String symbol);

    record InsightResult(
            String symbol,
            String insight,
            List<String> dataSourcesUsed,
            String modelUsed,
            Long generatedAt
    ) {
    }

    record SentimentResult(
            String symbol,
            Double score,
            String label,
            Integer articleCount
    ) {
    }

    record FullAnalysisResult(
            String symbol,
            TechnicalData technical,
            SentimentData sentiment,
            InsightData insight,
            Long generatedAt
    ) {
    }

    record TechnicalData(
            String timestamp,
            Double rsi,
            Double macd,
            Double macdSignal,
            Double macdHistogram,
            Double bbUpper,
            Double bbMiddle,
            Double bbLower,
            Double atr,
            Double sma,
            Double ema
    ) {
    }

    record SentimentData(
            Double score,
            String label,
            Integer articleCount
    ) {
    }

    record InsightData(
            String insight,
            List<String> dataSourcesUsed,
            String modelUsed
    ) {
    }
}
