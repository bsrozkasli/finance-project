package com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo;

import com.ozkaslibasar.financeproject.domain.model.AssetType;

import java.util.Locale;

public final class YahooAssetTypeMapper {

    private YahooAssetTypeMapper() {
    }

    public static AssetType fromQuoteType(String quoteType) {
        if (quoteType == null || quoteType.isBlank()) {
            return AssetType.UNKNOWN;
        }
        return switch (quoteType.trim().toUpperCase(Locale.ROOT)) {
            case "EQUITY" -> AssetType.STOCK;
            case "ETF" -> AssetType.ETF;
            case "INDEX" -> AssetType.INDEX;
            case "CRYPTOCURRENCY" -> AssetType.CRYPTO;
            case "CURRENCY" -> AssetType.FOREX;
            default -> AssetType.UNKNOWN;
        };
    }
}
