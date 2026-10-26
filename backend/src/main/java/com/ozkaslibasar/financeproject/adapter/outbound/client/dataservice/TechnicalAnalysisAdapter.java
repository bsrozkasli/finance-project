package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class TechnicalAnalysisAdapter implements TechnicalAnalysisPort {

    private static final String INSUFFICIENT_CANDLES_MESSAGE = "At least 30 candles are required for technical analysis";

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public TechnicalAnalysisAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public Optional<TechnicalAnalysisResult> fetchTechnicalAnalysis(String symbol, String interval, String range) {
        try {
            String url = technicalUrl(symbol, interval, range);
            TechnicalAnalysisResponseDto response = restTemplate.getForObject(url, TechnicalAnalysisResponseDto.class);
            if (response == null || response.getIndicators() == null) {
                return Optional.empty();
            }
            return Optional.of(toResult(response));
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == HttpStatus.UNPROCESSABLE_ENTITY.value()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, INSUFFICIENT_CANDLES_MESSAGE, e);
            }
            log.warn("Failed to fetch technical analysis for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to fetch technical analysis for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<TechnicalAnalysisResult> fetchTechnicalSignals(String symbol, String interval, String range) {
        try {
            String url = technicalSignalsUrl(symbol, interval, range);
            AnalysisSummaryResponseDto response = restTemplate.getForObject(url, AnalysisSummaryResponseDto.class);
            if (response == null || response.getSignal() == null) {
                return Optional.empty();
            }
            return Optional.of(toSignalResult(response));
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == HttpStatus.UNPROCESSABLE_ENTITY.value()) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, INSUFFICIENT_CANDLES_MESSAGE, e);
            }
            log.warn("Failed to fetch technical signals for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Failed to fetch technical signals for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public ProviderFetch<TechnicalAnalysisResult> fetchTechnicalAnalysisResult(String symbol, String interval, String range) {
        try {
            TechnicalAnalysisResponseDto response =
                    restTemplate.getForObject(technicalUrl(symbol, interval, range), TechnicalAnalysisResponseDto.class);
            if (response == null || response.getIndicators() == null) {
                return ProviderFetch.empty(ProviderFetch.NO_DATA_MESSAGE);
            }
            return ProviderFetch.ok(toResult(response));
        } catch (RuntimeException e) {
            return DataServiceOutcomes.fromException(e, "technical analysis", symbol);
        }
    }

    @Override
    public ProviderFetch<TechnicalAnalysisResult> fetchTechnicalSignalsResult(String symbol, String interval, String range) {
        try {
            AnalysisSummaryResponseDto response =
                    restTemplate.getForObject(technicalSignalsUrl(symbol, interval, range), AnalysisSummaryResponseDto.class);
            if (response == null || response.getSignal() == null) {
                return ProviderFetch.empty(ProviderFetch.NO_DATA_MESSAGE);
            }
            return ProviderFetch.ok(toSignalResult(response));
        } catch (RuntimeException e) {
            return DataServiceOutcomes.fromException(e, "technical signals", symbol);
        }
    }

    private TechnicalAnalysisResult toSignalResult(AnalysisSummaryResponseDto response) {
        return new TechnicalAnalysisResult(
                response.getSymbol(),
                response.getTimestamp(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                response.getSignal().getAction(),
                response.getSignal().getConfidence());
    }

    @Override
    public Optional<TechnicalWorkspaceResult> fetchTechnicalWorkspace(String symbol, String interval, String range) {
        try {
            WorkspaceDto response = restTemplate.getForObject(workspaceUrl(symbol, interval, range), WorkspaceDto.class);
            return response == null ? Optional.empty() : Optional.of(response.toResult());
        } catch (Exception e) {
            log.warn("Failed to fetch technical workspace for symbol={}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<TechnicalCopilotResult> fetchTechnicalCopilot(String symbol, String prompt, String interval, String range) {
        try {
            WorkspaceDto workspace = restTemplate.getForObject(workspaceUrl(symbol, interval, range), WorkspaceDto.class);
            if (workspace == null) return Optional.empty();
            CopilotRequestDto request = new CopilotRequestDto();
            request.setSymbol(symbol);
            request.setPrompt(prompt);
            request.setWorkspace(workspace);
            CopilotDto response = restTemplate.postForObject(baseUrl + "/api/v1/technical/" + URLEncoder.encode(symbol, StandardCharsets.UTF_8) + "/copilot", request, CopilotDto.class);
            if (response == null) return Optional.empty();
            return Optional.of(new TechnicalCopilotResult(response.symbol, response.answer,
                    response.overlays == null ? List.of() : response.overlays.stream().map(value -> new TechnicalOverlay(value.kind, value.label, value.price, value.startTimestamp, value.endTimestamp, value.color)).toList(),
                    response.caveats == null ? List.of() : response.caveats, response.generatedAt));
        } catch (Exception e) {
            log.warn("Failed to generate technical copilot response for {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    private String workspaceUrl(String symbol, String interval, String range) {
        return baseUrl + "/api/v1/technical/" + URLEncoder.encode(symbol, StandardCharsets.UTF_8) + "/workspace?interval=" + interval + "&range=" + range;
    }
    private String technicalUrl(String symbol, String interval, String range) {
        String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
        return baseUrl + "/api/v1/technical/" + encodedSymbol
                + "?interval=" + interval + "&range=" + range;
    }

    private String technicalSignalsUrl(String symbol, String interval, String range) {
        String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
        return baseUrl + "/api/v1/technical/" + encodedSymbol + "/signals"
                + "?interval=" + interval + "&range=" + range;
    }

    private TechnicalAnalysisResult toResult(TechnicalAnalysisResponseDto response) {
        TechnicalIndicatorsDto indicators = response.getIndicators();
        return new TechnicalAnalysisResult(
                response.getSymbol(),
                response.getTimestamp(),
                indicators.getRsi(),
                indicators.getMacd(),
                indicators.getMacdSignal(),
                indicators.getMacdHistogram(),
                indicators.getBbUpper(),
                indicators.getBbMiddle(),
                indicators.getBbLower(),
                indicators.getAtr(),
                indicators.getSma(),
                indicators.getSma20(),
                indicators.getSma50(),
                indicators.getSma200(),
                indicators.getEma(),
                null,
                null
        );
    }

    @Data
    static class WorkspaceDto {
        private String symbol;
        private String interval;
        private String range;
        private String timestamp;
        private List<CandleDto> candles = List.of();
        private Map<String, List<SeriesDto>> overlays = Map.of();
        private Map<String, List<SeriesDto>> oscillators = Map.of();
        private List<LevelDto> levels = List.of();
        @JsonProperty("data_quality") private Map<String, Object> dataQuality = Map.of();

        TechnicalWorkspaceResult toResult() {
            return new TechnicalWorkspaceResult(symbol, interval, range, timestamp,
                    candles.stream().map(value -> new TechnicalCandle(value.timestamp, value.open, value.high, value.low, value.close, value.volume)).toList(),
                    mapSeries(overlays), mapSeries(oscillators), levels.stream().map(value -> new TechnicalLevel(value.kind, value.price, value.strength, value.touches)).toList(), dataQuality);
        }

        private Map<String, List<TechnicalSeriesPoint>> mapSeries(Map<String, List<SeriesDto>> values) {
            return values.entrySet().stream().collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().stream().map(value -> new TechnicalSeriesPoint(value.timestamp, value.value)).toList()));
        }
    }

    @Data
    static class CopilotRequestDto { private String symbol; private String prompt; private WorkspaceDto workspace; }
    @Data
    static class CopilotDto { private String symbol; private String answer; private List<OverlayDto> overlays; private List<String> caveats; @JsonProperty("generated_at") private String generatedAt; }
    @Data
    static class OverlayDto { private String kind; private String label; private Double price; @JsonProperty("start_timestamp") private String startTimestamp; @JsonProperty("end_timestamp") private String endTimestamp; private String color; }
    @Data
    static class CandleDto { private String timestamp; private Double open; private Double high; private Double low; private Double close; private Double volume; }
    @Data
    static class SeriesDto { private String timestamp; private Double value; }
    @Data
    static class LevelDto { private String kind; private Double price; private Double strength; private Integer touches; }
    @Data
    static class TechnicalAnalysisResponseDto {
        private String symbol;
        private String timestamp;
        private TechnicalIndicatorsDto indicators;
    }

    @Data
    static class TechnicalIndicatorsDto {
        private Double rsi;
        private Double macd;
        @JsonProperty("macd_signal")
        private Double macdSignal;
        @JsonProperty("macd_histogram")
        private Double macdHistogram;
        @JsonProperty("bb_upper")
        private Double bbUpper;
        @JsonProperty("bb_middle")
        private Double bbMiddle;
        @JsonProperty("bb_lower")
        private Double bbLower;
        private Double atr;
        private Double sma;
        @JsonProperty("sma20")
        private Double sma20;
        @JsonProperty("sma50")
        private Double sma50;
        @JsonProperty("sma200")
        private Double sma200;
        private Double ema;
    }

    @Data
    static class AnalysisSummaryResponseDto {
        private String symbol;
        private String timestamp;
        private SignalDto signal;
    }

    @Data
    static class SignalDto {
        private String action;
        private Double confidence;
    }
}
