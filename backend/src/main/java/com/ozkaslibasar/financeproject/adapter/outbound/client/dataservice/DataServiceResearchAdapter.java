package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Component
@Slf4j
public class DataServiceResearchAdapter implements SmartReportScorePort {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceResearchAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Optional<CompositeInvestmentScoreDto> getCompositeScore(String symbol) {
        try {
            String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = baseUrl + "/api/v1/research/composite/" + encodedSymbol;
            CompositeInvestmentScoreDto response = restTemplate.getForObject(url, CompositeInvestmentScoreDto.class);
            return Optional.ofNullable(response);
        } catch (Exception e) {
            log.warn("Failed to fetch composite score for symbol={}. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<CompositeScore> fetchCompositeScore(String symbol) {
        return getCompositeScore(symbol).map(this::toDomain);
    }

    private CompositeScore toDomain(CompositeInvestmentScoreDto dto) {
        CompositeScoreBreakdownDto dtoBreakdown = dto.getBreakdown();
        ScoreBreakdown breakdown = dtoBreakdown == null ? null : new ScoreBreakdown(
                dtoBreakdown.getFundamentalScore(),
                dtoBreakdown.getValuationScore(),
                dtoBreakdown.getQualityScore(),
                dtoBreakdown.getGrowthScore(),
                dtoBreakdown.getMomentumScore(),
                dtoBreakdown.getRiskScore(),
                dtoBreakdown.getEarningsScore(),
                dtoBreakdown.getSentimentScore());
        return new CompositeScore(
                dto.getOverallScore(),
                dto.getGrade(),
                dto.getRecommendation(),
                breakdown);
    }

    @Data
    public static class CompositeInvestmentScoreDto {
        private String symbol;
        @JsonProperty("overall_score")
        private Integer overallScore;
        private String grade;
        private String recommendation;
        private CompositeScoreBreakdownDto breakdown;
        private Double confidence;
        @JsonProperty("calculated_at")
        private String calculatedAt;
    }

    @Data
    public static class CompositeScoreBreakdownDto {
        @JsonProperty("fundamental_score")
        private Integer fundamentalScore;
        @JsonProperty("valuation_score")
        private Integer valuationScore;
        @JsonProperty("quality_score")
        private Integer qualityScore;
        @JsonProperty("growth_score")
        private Integer growthScore;
        @JsonProperty("momentum_score")
        private Integer momentumScore;
        @JsonProperty("risk_score")
        private Integer riskScore;
        @JsonProperty("earnings_score")
        private Integer earningsScore;
        @JsonProperty("sentiment_score")
        private Integer sentimentScore;
    }
}
