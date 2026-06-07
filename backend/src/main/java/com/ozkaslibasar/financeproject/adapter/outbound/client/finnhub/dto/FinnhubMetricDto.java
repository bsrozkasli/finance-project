package com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO wrapping the nested metric struct returned by Finnhub's
 * {@code GET /stock/metric?symbol={symbol}&metric=all&token={token}} endpoint.
 *
 * <p>Only the fields needed by the current sentiment analysis are declared;
 * all other fields are silently ignored.</p>
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinnhubMetricDto {

    /** Inner metric map. Mapped from the "metric" JSON object. */
    private Metric metric;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Metric {

        @JsonProperty("52WeekHigh")
        private Double weekHigh52;

        @JsonProperty("52WeekLow")
        private Double weekLow52;

        @JsonProperty("beta")
        private Double beta;

        @JsonProperty("peBasicExclExtraTTM")
        private Double peTtm;

        @JsonProperty("epsBasicExclExtraItemsTTM")
        private Double epsTtm;

        @JsonProperty("revenueGrowth5Y")
        private Double revenueGrowth5y;

        @JsonProperty("epsGrowth5Y")
        private Double epsGrowth5y;

        @JsonProperty("dividendYieldIndicatedAnnual")
        private Double dividendYield;
    }
}
