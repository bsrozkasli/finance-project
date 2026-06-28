package com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO for a single news article from Tiingo's
 * {@code GET /tiingo/news?tickers={symbol}&limit=10} endpoint.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TiingoNewsDto {

    private Long id;

    private String title;

    private String description;

    private String url;

    private String source;

    @JsonProperty("publishedDate")
    private String publishedDate;

    @JsonProperty("crawlDate")
    private String crawlDate;

    private List<String> tickers;

    private List<String> tags;
}
