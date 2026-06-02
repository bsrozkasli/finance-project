package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.domain.port.outbound.PatternDetectionPort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class PatternDetectionAdapter implements PatternDetectionPort {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public PatternDetectionAdapter(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<PatternDetectionResult> detectPatterns(String symbol, String interval, String range, boolean includeLlmContext) {
        try {
            String url = patternsUrl(symbol, interval, range, includeLlmContext);
            PatternDetectionResponseDto response = restTemplate.getForObject(url, PatternDetectionResponseDto.class);
            
            if (response == null) {
                return Optional.empty();
            }
            
            return Optional.of(toResult(response));
        } catch (Exception e) {
            log.warn("Failed to detect patterns for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    private String patternsUrl(String symbol, String interval, String range, boolean includeLlmContext) {
        String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
        return baseUrl + "/api/v1/patterns/" + encodedSymbol
                + "?interval=" + interval
                + "&range=" + range
                + "&include_llm_context=" + includeLlmContext;
    }

    private PatternDetectionResult toResult(PatternDetectionResponseDto response) {
        List<DetectedPattern> patterns = new ArrayList<>();
        
        if (response.getPatterns() != null) {
            for (DetectedPatternDto patternDto : response.getPatterns()) {
                patterns.add(new DetectedPattern(
                        patternDto.getPatternType(),
                        patternDto.getDirection(),
                        patternDto.getConfidence(),
                        patternDto.getStartIndex(),
                        patternDto.getEndIndex(),
                        patternDto.getDescription(),
                        patternDto.getPriceTarget()
                ));
            }
        }
        
        DetectedPattern dominantPattern = null;
        if (response.getDominantPattern() != null) {
            DetectedPatternDto dpDto = response.getDominantPattern();
            dominantPattern = new DetectedPattern(
                    dpDto.getPatternType(),
                    dpDto.getDirection(),
                    dpDto.getConfidence(),
                    dpDto.getStartIndex(),
                    dpDto.getEndIndex(),
                    dpDto.getDescription(),
                    dpDto.getPriceTarget()
            );
        }
        
        return new PatternDetectionResult(
                response.getSymbol(),
                response.getInterval(),
                patterns,
                dominantPattern,
                response.getLlmContext(),
                response.getDetectedAt()
        );
    }

    @Data
    static class PatternDetectionResponseDto {
        private String symbol;
        private String interval;
        private List<DetectedPatternDto> patterns;
        @JsonProperty("dominant_pattern")
        private DetectedPatternDto dominantPattern;
        @JsonProperty("llm_context")
        private String llmContext;
        @JsonProperty("detected_at")
        private Long detectedAt;
    }

    @Data
    static class DetectedPatternDto {
        @JsonProperty("pattern_type")
        private String patternType;
        private String direction;
        private Double confidence;
        @JsonProperty("start_index")
        private Integer startIndex;
        @JsonProperty("end_index")
        private Integer endIndex;
        private String description;
        @JsonProperty("price_target")
        private Double priceTarget;
    }
}
