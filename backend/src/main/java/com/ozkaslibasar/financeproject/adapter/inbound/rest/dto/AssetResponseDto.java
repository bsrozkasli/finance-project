package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tracked asset response")
public class AssetResponseDto {
    @Schema(description = "Ticker symbol", example = "AAPL")
    private String symbol;

    @Schema(description = "Display name", example = "Apple Inc.")
    private String name;

    @Schema(description = "Asset type", example = "STOCK")
    private String type;

    @Schema(description = "Exchange code when known", example = "NASDAQ")
    private String exchange;

    @Schema(description = "Trading currency when known", example = "USD")
    private String currency;

    @Schema(description = "Provider used for metadata resolution", example = "YAHOO")
    private String provider;

    @Schema(description = "Provider-specific symbol", example = "AAPL")
    private String providerSymbol;

    @Schema(description = "Metadata quality", example = "VERIFIED")
    private String metadataStatus;
}
