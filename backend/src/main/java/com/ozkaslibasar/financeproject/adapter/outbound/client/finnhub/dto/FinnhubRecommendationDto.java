package com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for a single period in Finnhub's analyst recommendation trend response.
 *
 * <p>Endpoint: {@code GET /stock/recommendation?symbol={symbol}&token={token}}</p>
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinnhubRecommendationDto {

    /** Period in YYYY-MM-DD format (usually first day of the month). */
    private String period;

    @JsonProperty("strongBuy")
    private int strongBuy;

    private int buy;
    private int hold;
    private int sell;

    @JsonProperty("strongSell")
    private int strongSell;
}
