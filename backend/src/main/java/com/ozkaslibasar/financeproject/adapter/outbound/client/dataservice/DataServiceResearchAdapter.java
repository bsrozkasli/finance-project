package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class DataServiceResearchAdapter implements SmartReportScorePort, ResearchDataPort {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceResearchAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public Optional<CompositeInvestmentScoreDto> getCompositeScore(String symbol) {
        try {
            String url = baseUrl + "/api/v1/research/composite/" + encode(symbol);
            CompositeInvestmentScoreDto response = restTemplate.getForObject(url, CompositeInvestmentScoreDto.class);
            return Optional.ofNullable(response);
        } catch (Exception e) {
            log.warn("Failed to fetch composite score for symbol={}. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    @Cacheable(value = "researchCache", key = "'composite:' + #symbol.toUpperCase()")
    public Optional<CompositeScore> fetchCompositeScore(String symbol) {
        return getCompositeScore(symbol).map(this::toDomain);
    }

    @Override
    @Cacheable(value = "researchCache", key = "'fundamental:' + #symbol.toUpperCase()")
    public Optional<FundamentalResearch> fetchFundamental(String symbol) {
        try {
            String url = baseUrl + "/api/v1/research/fundamental/" + encode(symbol);
            FundamentalResponseDto response = restTemplate.getForObject(url, FundamentalResponseDto.class);
            if (response == null) {
                return Optional.empty();
            }
            FundamentalMetricsDto m = response.getMetrics();
            FundamentalMetrics metrics = m == null
                    ? null
                    : new FundamentalMetrics(
                    m.getRoe(),
                    m.getRoa(),
                    m.getRoic(),
                    m.getGrossMargin(),
                    m.getOperatingMargin(),
                    m.getNetMargin(),
                    m.getCurrentRatio(),
                    m.getQuickRatio(),
                    m.getDebtToEquity(),
                    m.getRevenue(),
                    m.getNetIncome(),
                    m.getOperatingCashFlow());
            return Optional.of(new FundamentalResearch(
                    response.getSymbol(),
                    metrics,
                    response.getFiscalYear(),
                    response.getCurrency(),
                    response.getCalculatedAt()));
        } catch (Exception e) {
            log.warn("Failed to fetch fundamental research for symbol={}. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    @Cacheable(value = "researchCache", key = "'earnings:' + #symbol.toUpperCase()")
    public List<EarningsQuarter> fetchEarnings(String symbol) {
        try {
            String url = baseUrl + "/api/v1/research/earnings/" + encode(symbol);
            EarningsResponseDto response = restTemplate.getForObject(url, EarningsResponseDto.class);
            if (response == null || response.getHistory() == null) {
                return List.of();
            }
            return response.getHistory().stream()
                    .map(q -> new EarningsQuarter(
                            q.getPeriod(),
                            q.getActual(),
                            q.getEstimate(),
                            q.getSurprise(),
                            q.getSurprisePct(),
                            q.getBeat()))
                    .toList();
        } catch (Exception e) {
            log.warn("Failed to fetch earnings research for symbol={}. Reason: {}", symbol, e.getMessage());
            return List.of();
        }
    }

    @Override
    @Cacheable(value = "researchCache", key = "'institutional:' + #symbol.toUpperCase()")
    public Optional<InstitutionalScores> fetchInstitutionalScores(String symbol) {
        try {
            String url = baseUrl + "/api/v1/research/institutional-scores/" + encode(symbol);
            InstitutionalResponseDto response = restTemplate.getForObject(url, InstitutionalResponseDto.class);
            if (response == null || response.getScores() == null) {
                return Optional.empty();
            }
            InstitutionalScoresDto s = response.getScores();
            return Optional.of(new InstitutionalScores(
                    s.getPiotroskiFScore(),
                    s.getAltmanZScore(),
                    s.getBeneishMScore(),
                    s.getQualityComposite(),
                    s.getEconomicMoat(),
                    s.getEarningsQuality()));
        } catch (Exception e) {
            log.warn("Failed to fetch institutional scores for symbol={}. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    private String encode(String symbol) {
        return URLEncoder.encode(symbol.toUpperCase(), StandardCharsets.UTF_8);
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

    @Data
    public static class FundamentalResponseDto {
        private String symbol;
        private FundamentalMetricsDto metrics;
        @JsonProperty("fiscal_year")
        private String fiscalYear;
        private String currency;
        @JsonProperty("calculated_at")
        private String calculatedAt;
    }

    @Data
    public static class FundamentalMetricsDto {
        private Double roe;
        private Double roa;
        private Double roic;
        @JsonProperty("gross_margin")
        private Double grossMargin;
        @JsonProperty("operating_margin")
        private Double operatingMargin;
        @JsonProperty("net_margin")
        private Double netMargin;
        @JsonProperty("current_ratio")
        private Double currentRatio;
        @JsonProperty("quick_ratio")
        private Double quickRatio;
        @JsonProperty("debt_to_equity")
        private Double debtToEquity;
        private Double revenue;
        @JsonProperty("net_income")
        private Double netIncome;
        @JsonProperty("operating_cash_flow")
        private Double operatingCashFlow;
    }

    @Data
    public static class EarningsResponseDto {
        private String symbol;
        private List<EarningsQuarterDto> history;
        @JsonProperty("calculated_at")
        private String calculatedAt;
    }

    @Data
    public static class EarningsQuarterDto {
        private String period;
        private Double actual;
        private Double estimate;
        private Double surprise;
        @JsonProperty("surprise_pct")
        private Double surprisePct;
        private Boolean beat;
    }

    @Data
    public static class InstitutionalResponseDto {
        private String symbol;
        private InstitutionalScoresDto scores;
        @JsonProperty("calculated_at")
        private String calculatedAt;
    }

    @Data
    public static class InstitutionalScoresDto {
        @JsonProperty("piotroski_f_score")
        private Integer piotroskiFScore;
        @JsonProperty("altman_z_score")
        private Double altmanZScore;
        @JsonProperty("beneish_m_score")
        private Double beneishMScore;
        @JsonProperty("quality_composite")
        private Integer qualityComposite;
        @JsonProperty("economic_moat")
        private String economicMoat;
        @JsonProperty("earnings_quality")
        private Integer earningsQuality;
    }
}
