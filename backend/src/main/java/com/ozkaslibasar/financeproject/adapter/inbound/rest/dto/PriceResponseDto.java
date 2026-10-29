package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import com.ozkaslibasar.financeproject.domain.model.PriceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "OHLCV price candle response")
public class PriceResponseDto {
    @Schema(description = "Asset ticker symbol", example = "AAPL")
    private String assetId;

    @Schema(description = "Open price", example = "190.12")
    private BigDecimal open;

    @Schema(description = "Close price", example = "193.42")
    private BigDecimal close;

    @Schema(description = "High price", example = "194.25")
    private BigDecimal high;

    @Schema(description = "Low price", example = "189.50")
    private BigDecimal low;

    @Schema(description = "Traded volume", example = "53120000")
    private BigDecimal volume;

    @Schema(description = "Candle timestamp", example = "2026-06-26T20:00:00Z")
    private Instant timestamp;

    @Schema(description = "Candle time of the price that was used (same as timestamp); null when there is no price. "
            + "Set by the latest-price endpoint only", example = "2026-06-26T20:00:00Z", nullable = true)
    private Instant priceAsOf;

    @Schema(description = "OK when confirmed by a provider refresh, STALE when a stored price could not be confirmed. "
            + "Set by the latest-price endpoint only", nullable = true)
    private PriceStatus priceStatus;
}
