package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AgentSentimentDto(
        @JsonProperty("news_score") double newsScore,
        @JsonProperty("news_label") String newsLabel,
        @JsonProperty("analyst_score") double analystScore,
        @JsonProperty("analyst_consensus") String analystConsensus,
        @JsonProperty("sentiment_score") int sentimentScore
) {
}
