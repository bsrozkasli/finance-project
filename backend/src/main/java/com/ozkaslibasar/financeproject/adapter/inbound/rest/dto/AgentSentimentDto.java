package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Sentiment snapshot used by agent analysis")
public record AgentSentimentDto(
        @Schema(description = "News sentiment score", example = "0.25") @JsonProperty("news_score") double newsScore,
        @Schema(description = "News sentiment label", example = "neutral") @JsonProperty("news_label") String newsLabel,
        @Schema(description = "Analyst sentiment score", example = "0.60") @JsonProperty("analyst_score") double analystScore,
        @Schema(description = "Analyst consensus", example = "hold") @JsonProperty("analyst_consensus") String analystConsensus,
        @Schema(description = "Combined sentiment score", example = "50") @JsonProperty("sentiment_score") int sentimentScore
) {
}