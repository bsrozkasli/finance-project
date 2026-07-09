package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.domain.port.outbound.LlmInsightPort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class LlmInsightAdapter implements LlmInsightPort {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public LlmInsightAdapter(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<InsightResult> generateInsight(String symbol, boolean includeTechnical, boolean includeSentiment, String scenario) {
        try {
            String url = baseUrl + "/api/v1/insight";
            
            LlmInsightRequestDto requestDto = new LlmInsightRequestDto();
            requestDto.setSymbol(symbol);
            requestDto.setIncludeTechnical(includeTechnical);
            requestDto.setIncludeSentiment(includeSentiment);
            requestDto.setScenario(scenario);
            
            LlmInsightResponseDto response = restTemplate.postForObject(url, requestDto, LlmInsightResponseDto.class);
            if (response == null) {
                return Optional.empty();
            }
            
            return Optional.of(new InsightResult(
                    response.getSymbol(),
                    response.getInsight(),
                    response.getDataSourcesUsed(),
                    response.getModelUsed(),
                    System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.warn("Failed to generate insight for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }


    @Override
    public Optional<DecisionSupportResult> generateDecisionSupport(DecisionSupportRequest request) {
        try {
            String url = baseUrl + "/api/v1/decision-support";
            DecisionSupportRequestDto requestDto = new DecisionSupportRequestDto();
            requestDto.setSymbol(request.symbol());
            requestDto.setUserScenario(request.userScenario());
            if (request.portfolioContext() != null) {
                PortfolioContextDto contextDto = new PortfolioContextDto();
                contextDto.setCurrentWeight(request.portfolioContext().currentWeight());
                contextDto.setTargetWeight(request.portfolioContext().targetWeight());
                contextDto.setDeviation(request.portfolioContext().deviation());
                contextDto.setRebalanceNeeded(request.portfolioContext().rebalanceNeeded());
                requestDto.setPortfolioContext(contextDto);
            }

            DecisionSupportResponseDto response = restTemplate.postForObject(url, requestDto, DecisionSupportResponseDto.class);
            if (response == null) {
                return Optional.empty();
            }

            return Optional.of(new DecisionSupportResult(
                    response.getSymbol(),
                    response.getExecutiveSummary(),
                    response.getPrimarySignal(),
                    response.getConvictionLevel(),
                    response.getBullCase(),
                    response.getBearCase(),
                    response.getCriticalLevels(),
                    response.getRiskReward(),
                    response.getTimeHorizon(),
                    response.getWatchlistItems(),
                    response.getFullAnalysis(),
                    System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.warn("Failed to generate decision support for symbol={}. Returning empty result. Reason: {}", request.symbol(), e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<SentimentResult> getSentiment(String symbol) {
        try {
            String url = sentimentUrl(symbol);
            SentimentAnalysisResponseDto response = restTemplate.getForObject(url, SentimentAnalysisResponseDto.class);
            if (response == null) {
                return Optional.empty();
            }
            
            return Optional.of(new SentimentResult(
                    response.getSymbol(),
                    response.getScore(),
                    response.getLabel(),
                    response.getArticleCount()
            ));
        } catch (Exception e) {
            log.warn("Failed to fetch sentiment for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<FullAnalysisResult> getFullAnalysis(String symbol) {
        try {
            String url = fullAnalysisUrl(symbol);
            FullAnalysisResponseDto response = restTemplate.getForObject(url, FullAnalysisResponseDto.class);
            if (response == null) {
                return Optional.empty();
            }
            
            TechnicalData technicalData = null;
            if (response.getTechnical() != null && response.getTechnical() instanceof java.util.Map) {
                java.util.Map<?, ?> techMap = (java.util.Map<?, ?>) response.getTechnical();
                technicalData = new TechnicalData(
                        (String) techMap.get("timestamp"),
                        getRsiFromDict(response.getTechnical()),
                        getMacdFromDict(response.getTechnical()),
                        getMacdSignalFromDict(response.getTechnical()),
                        getMacdHistogramFromDict(response.getTechnical()),
                        getBbUpperFromDict(response.getTechnical()),
                        getBbMiddleFromDict(response.getTechnical()),
                        getBbLowerFromDict(response.getTechnical()),
                        getAtrFromDict(response.getTechnical()),
                        getSmaFromDict(response.getTechnical()),
                        getEmaFromDict(response.getTechnical())
                );
            }
            
            SentimentData sentimentData = null;
            if (response.getSentiment() != null) {
                sentimentData = new SentimentData(
                        response.getSentiment().getScore(),
                        response.getSentiment().getLabel(),
                        response.getSentiment().getArticleCount()
                );
            }
            
            InsightData insightData = null;
            if (response.getLlmInsight() != null) {
                insightData = new InsightData(
                        response.getLlmInsight().getInsight(),
                        response.getLlmInsight().getDataSourcesUsed(),
                        response.getLlmInsight().getModelUsed()
                );
            }
            
            return Optional.of(new FullAnalysisResult(
                    response.getSymbol(),
                    technicalData,
                    sentimentData,
                    insightData,
                    System.currentTimeMillis()
            ));
        } catch (Exception e) {
            log.warn("Failed to fetch full analysis for symbol={}. Returning empty result. Reason: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    private String sentimentUrl(String symbol) {
        String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
        return baseUrl + "/api/v1/sentiment/" + encodedSymbol;
    }

    private String fullAnalysisUrl(String symbol) {
        String encodedSymbol = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
        return baseUrl + "/api/v1/full/" + encodedSymbol;
    }

    private Double getRsiFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object rsi = ((java.util.Map<?, ?>) indicators).get("rsi");
                    return rsi instanceof Number ? ((Number) rsi).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract RSI from technical data", e);
        }
        return null;
    }

    private Double getMacdFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object macd = ((java.util.Map<?, ?>) indicators).get("macd");
                    return macd instanceof Number ? ((Number) macd).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract MACD from technical data", e);
        }
        return null;
    }

    private Double getMacdSignalFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object macdSignal = ((java.util.Map<?, ?>) indicators).get("macd_signal");
                    return macdSignal instanceof Number ? ((Number) macdSignal).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract MACD signal from technical data", e);
        }
        return null;
    }

    private Double getMacdHistogramFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object macdHistogram = ((java.util.Map<?, ?>) indicators).get("macd_histogram");
                    return macdHistogram instanceof Number ? ((Number) macdHistogram).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract MACD histogram from technical data", e);
        }
        return null;
    }

    private Double getBbUpperFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object bbUpper = ((java.util.Map<?, ?>) indicators).get("bb_upper");
                    return bbUpper instanceof Number ? ((Number) bbUpper).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract BB upper from technical data", e);
        }
        return null;
    }

    private Double getBbMiddleFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object bbMiddle = ((java.util.Map<?, ?>) indicators).get("bb_middle");
                    return bbMiddle instanceof Number ? ((Number) bbMiddle).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract BB middle from technical data", e);
        }
        return null;
    }

    private Double getBbLowerFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object bbLower = ((java.util.Map<?, ?>) indicators).get("bb_lower");
                    return bbLower instanceof Number ? ((Number) bbLower).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract BB lower from technical data", e);
        }
        return null;
    }

    private Double getAtrFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object atr = ((java.util.Map<?, ?>) indicators).get("atr");
                    return atr instanceof Number ? ((Number) atr).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract ATR from technical data", e);
        }
        return null;
    }

    private Double getSmaFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object sma = ((java.util.Map<?, ?>) indicators).get("sma");
                    return sma instanceof Number ? ((Number) sma).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract SMA from technical data", e);
        }
        return null;
    }

    private Double getEmaFromDict(Object dict) {
        try {
            if (dict instanceof java.util.Map) {
                Object indicators = ((java.util.Map<?, ?>) dict).get("indicators");
                if (indicators instanceof java.util.Map) {
                    Object ema = ((java.util.Map<?, ?>) indicators).get("ema");
                    return ema instanceof Number ? ((Number) ema).doubleValue() : null;
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract EMA from technical data", e);
        }
        return null;
    }


    @Data
    static class DecisionSupportRequestDto {
        private String symbol;
        @JsonProperty("portfolio_context")
        private PortfolioContextDto portfolioContext;
        @JsonProperty("user_scenario")
        private String userScenario;
    }

    @Data
    static class PortfolioContextDto {
        @JsonProperty("current_weight")
        private Double currentWeight;
        @JsonProperty("target_weight")
        private Double targetWeight;
        private Double deviation;
        @JsonProperty("rebalance_needed")
        private Boolean rebalanceNeeded;
    }

    @Data
    static class DecisionSupportResponseDto {
        private String symbol;
        @JsonProperty("executive_summary")
        private String executiveSummary;
        @JsonProperty("primary_signal")
        private String primarySignal;
        @JsonProperty("conviction_level")
        private Integer convictionLevel;
        @JsonProperty("bull_case")
        private List<String> bullCase;
        @JsonProperty("bear_case")
        private List<String> bearCase;
        @JsonProperty("critical_levels")
        private java.util.Map<String, Double> criticalLevels;
        @JsonProperty("risk_reward")
        private String riskReward;
        @JsonProperty("time_horizon")
        private String timeHorizon;
        @JsonProperty("watchlist_items")
        private List<String> watchlistItems;
        @JsonProperty("full_analysis")
        private String fullAnalysis;
        @JsonProperty("generated_at")
        private String generatedAt;
    }
    @Data
    static class LlmInsightRequestDto {
        private String symbol;
        private Boolean includeTechnical;
        private Boolean includeSentiment;
        private String scenario;
    }

    @Data
    static class LlmInsightResponseDto {
        private String symbol;
        private String insight;
        @JsonProperty("data_sources_used")
        private List<String> dataSourcesUsed;
        @JsonProperty("model_used")
        private String modelUsed;
        @JsonProperty("generated_at")
        private String generatedAt;
    }

    @Data
    static class SentimentAnalysisResponseDto {
        private String symbol;
        private Double score;
        private String label;
        @JsonProperty("article_count")
        private Integer articleCount;
    }

    @Data
    static class FullAnalysisResponseDto {
        private String symbol;
        private Object technical;
        private SentimentDataDto sentiment;
        @JsonProperty("llm_insight")
        private LlmInsightDataDto llmInsight;
        @JsonProperty("generated_at")
        private String generatedAt;
    }

    @Data
    static class SentimentDataDto {
        private Double score;
        private String label;
        @JsonProperty("article_count")
        private Integer articleCount;
    }

    @Data
    static class LlmInsightDataDto {
        private String insight;
        @JsonProperty("data_sources_used")
        private List<String> dataSourcesUsed;
        @JsonProperty("model_used")
        private String modelUsed;
    }
}
