package com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for a single EOD price record from Tiingo's
 * {@code GET /tiingo/daily/{ticker}/prices} endpoint.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class TiingoEodDto {

    private String date;

    private Double open;
    private Double high;
    private Double low;
    private Double close;

    @JsonProperty("adjOpen")
    private Double adjOpen;

    @JsonProperty("adjHigh")
    private Double adjHigh;

    @JsonProperty("adjLow")
    private Double adjLow;

    @JsonProperty("adjClose")
    private Double adjClose;

    private Long volume;

    @JsonProperty("adjVolume")
    private Long adjVolume;
}
