package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface TechnicalAnalysisPort {
    String NO_DATA_MESSAGE = "Provider returned no data";

    Optional<TechnicalAnalysisResult> fetchTechnicalAnalysis(String symbol, String interval, String range);
    Optional<TechnicalAnalysisResult> fetchTechnicalSignals(String symbol, String interval, String range);

    /**
     * Outcome-returning variants that keep a provider failure apart from "no data". The defaults wrap the
     * Optional methods and so can only report OK or EMPTY; adapters that can see the failure override them.
     */
    default ProviderFetch<TechnicalAnalysisResult> fetchTechnicalAnalysisResult(String symbol, String interval, String range) {
        return ProviderFetch.ofOptional(fetchTechnicalAnalysis(symbol, interval, range), NO_DATA_MESSAGE);
    }

    default ProviderFetch<TechnicalAnalysisResult> fetchTechnicalSignalsResult(String symbol, String interval, String range) {
        return ProviderFetch.ofOptional(fetchTechnicalSignals(symbol, interval, range), NO_DATA_MESSAGE);
    }

    Optional<TechnicalWorkspaceResult> fetchTechnicalWorkspace(String symbol, String interval, String range);
    Optional<TechnicalCopilotResult> fetchTechnicalCopilot(String symbol, String prompt, String interval, String range);

    record TechnicalCopilotResult(String symbol, String answer, List<TechnicalOverlay> overlays, List<String> caveats, String generatedAt) {}
    record TechnicalOverlay(String kind, String label, Double price, String startTimestamp, String endTimestamp, String color) {}
    record TechnicalWorkspaceResult(String symbol, String interval, String range, String timestamp, List<TechnicalCandle> candles, Map<String, List<TechnicalSeriesPoint>> overlays, Map<String, List<TechnicalSeriesPoint>> oscillators, List<TechnicalLevel> levels, Map<String, Object> dataQuality) {}
    record TechnicalCandle(String timestamp, Double open, Double high, Double low, Double close, Double volume) {}
    record TechnicalSeriesPoint(String timestamp, Double value) {}
    record TechnicalLevel(String kind, Double price, Double strength, Integer touches) {}
    record TechnicalAnalysisResult(String symbol, String timestamp, Double rsi, Double macd, Double macdSignal, Double macdHistogram, Double bbUpper, Double bbMiddle, Double bbLower, Double atr, Double sma, Double sma20, Double sma50, Double sma200, Double ema, String action, Double confidence) {}
}