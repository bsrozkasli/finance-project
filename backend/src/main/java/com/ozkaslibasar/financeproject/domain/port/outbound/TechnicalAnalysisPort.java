package com.ozkaslibasar.financeproject.domain.port.outbound;

import java.util.Optional;

public interface TechnicalAnalysisPort {

    Optional<TechnicalAnalysisResult> fetchTechnicalAnalysis(String symbol, String interval, String range);

    Optional<TechnicalAnalysisResult> fetchTechnicalSignals(String symbol, String interval, String range);

    record TechnicalAnalysisResult(
            String symbol,
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
            Double ema,
            String action,
            Double confidence
    ) {
    }
}
