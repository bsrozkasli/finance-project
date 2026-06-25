package com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for the Finnhub price target response.
 *
 * <p>Endpoint: {@code GET /stock/price-target?symbol={symbol}&token={token}}</p>
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinnhubPriceTargetDto {

    private String symbol;

    @JsonProperty("targetHigh")
    private Double targetHigh;

    @JsonProperty("targetLow")
    private Double targetLow;

    @JsonProperty("targetMean")
    private Double targetMean;

    @JsonProperty("targetMedian")
    private Double targetMedian;

    @JsonProperty("lastUpdated")
    private String lastUpdated;

    /** Number of analysts covering this stock. */
    @JsonProperty("numberOfAnalysts")
    private Integer numberOfAnalysts;
}
