package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto;

import lombok.Data;

/**
 * DTO for the FMP stable/search-symbol API response.
 * Replaces the old v3 /profile endpoint which is no longer available.
 */
@Data
public class FmpAssetProfileDto {
    private String symbol;
    private String name;
    private String currency;
    private String exchangeFullName;
    private String exchange;
}
