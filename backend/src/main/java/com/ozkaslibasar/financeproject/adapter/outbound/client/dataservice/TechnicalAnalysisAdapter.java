package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
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
            return Optional.of(new TechnicalAnalysisResult(
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
                    response.getSignal().getAction(),
                    response.getSignal().getConfidence()
            ));
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
                indicators.getEma(),
                null,
                null
        );
    }

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
