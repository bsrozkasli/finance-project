package com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for a single news article from Finnhub's company news endpoint.
 *
 * <p>Endpoint: {@code GET /company-news?symbol={symbol}&from={from}&to={to}&token={token}}</p>
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinnhubNewsDto {

    /** Unix timestamp (epoch seconds) of the news publication. */
    private long datetime;

    private String headline;
    private String summary;
    private String source;
    private String url;

    /** News article category (e.g. "company", "forex", "crypto"). */
    private String category;

    /** Finnhub-assigned image URL for the article (may be null). */
    private String image;
}
