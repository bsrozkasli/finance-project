package com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * Root DTO for the Yahoo Finance Chart API v8 response.
 *
 * <p>Yahoo response shape (abbreviated):
 * <pre>
 * {
 *   "chart": {
 *     "result": [{
 *       "meta": { "symbol": "AAPL", "currency": "USD", ... },
 *       "timestamp": [1700000000, 1700086400, ...],
 *       "indicators": {
 *         "quote": [{
 *           "open":   [150.0, null, 151.2, ...],
 *           "high":   [152.0, null, 153.0, ...],
 *           "low":    [149.0, null, 150.5, ...],
 *           "close":  [151.0, null, 152.0, ...],
 *           "volume": [80000000, null, 90000000, ...]
 *         }]
 *       }
 *     }],
 *     "error": null
 *   }
 * }
 * </pre>
 * </p>
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class YahooChartResponseDto {

    private Chart chart;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Chart {
        private List<Result> result;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Result {
        private Meta meta;
        /** Unix epoch seconds for each bar. May contain nulls for non-trading gaps. */
        private List<Long>   timestamp;
        private Indicators   indicators;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Meta {
        private String symbol;
        private String currency;
        private String exchangeName;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Indicators {
        /** Always a single-element list (Yahoo's OHLCV quote block). */
        private List<Quote> quote;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Quote {
        /** Raw Double values — may contain nulls for trading gaps. */
        private List<Double> open;
        private List<Double> high;
        private List<Double> low;
        private List<Double> close;
        private List<Long>   volume;
    }
}
