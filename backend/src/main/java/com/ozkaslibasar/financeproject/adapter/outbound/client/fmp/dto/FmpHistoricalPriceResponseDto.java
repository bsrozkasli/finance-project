package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto;

import lombok.Data;
import java.util.List;

/**
 * @deprecated The stable FMP API now returns a flat List<FmpHistoricalPriceDto> directly.
 * This wrapper was used for the legacy v3 /historical-price-full endpoint.
 * Kept here to avoid breaking any potential future references.
 */
@Data
@Deprecated
public class FmpHistoricalPriceResponseDto {
    private String symbol;
    private List<FmpHistoricalPriceDto> historical;
}
