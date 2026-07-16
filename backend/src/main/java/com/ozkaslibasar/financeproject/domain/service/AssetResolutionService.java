package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.SymbolMapping;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SymbolMappingPort;

import java.util.Locale;
import java.util.Optional;

public class AssetResolutionService {

    private static final String YAHOO_PROVIDER = "YAHOO";

    private final SymbolMappingPort symbolMappingPort;
    private final PriceChartClientPort priceChartClientPort;

    public AssetResolutionService(SymbolMappingPort symbolMappingPort, PriceChartClientPort priceChartClientPort) {
        this.symbolMappingPort = symbolMappingPort;
        this.priceChartClientPort = priceChartClientPort;
    }

    public Asset resolve(String rawSymbol) {
        if (rawSymbol == null || rawSymbol.isBlank()) {
            throw new IllegalArgumentException("Symbol must not be blank");
        }

        String canonicalSymbol = rawSymbol.trim().toUpperCase(Locale.ROOT);
        Optional<SymbolMapping> mapping = symbolMappingPort.findBestMapping(canonicalSymbol, YAHOO_PROVIDER)
                .filter(SymbolMapping::canUseForResolution);
        String providerSymbol = mapping.map(SymbolMapping::providerSymbol).orElse(canonicalSymbol);

        Optional<Asset> providerAsset = priceChartClientPort.fetchAssetInfo(providerSymbol);
        if (providerAsset.isPresent()) {
            Asset asset = providerAsset.get();
            return withResolutionMetadata(canonicalSymbol, providerSymbol, asset, mapping, AssetMetadataStatus.VERIFIED);
        }

        if (mapping.isPresent()) {
            SymbolMapping m = mapping.get();
            return new Asset(
                    canonicalSymbol,
                    chooseDisplayName(m.displayName(), canonicalSymbol),
                    m.assetType(),
                    m.exchange(),
                    m.currency(),
                    YAHOO_PROVIDER,
                    providerSymbol,
                    AssetMetadataStatus.PARTIAL);
        }

        return new Asset(
                canonicalSymbol,
                canonicalSymbol,
                AssetType.STOCK,
                null,
                null,
                null,
                canonicalSymbol,
                AssetMetadataStatus.UNAVAILABLE);
    }

    private Asset withResolutionMetadata(
            String canonicalSymbol,
            String providerSymbol,
            Asset providerAsset,
            Optional<SymbolMapping> mapping,
            AssetMetadataStatus status) {
        return new Asset(
                canonicalSymbol,
                chooseDisplayName(mapping.map(SymbolMapping::displayName).orElse(providerAsset.name()), providerAsset.name()),
                mapping.map(SymbolMapping::assetType).orElse(providerAsset.type()),
                mapping.map(SymbolMapping::exchange).orElse(providerAsset.exchange()),
                mapping.map(SymbolMapping::currency).orElse(providerAsset.currency()),
                YAHOO_PROVIDER,
                providerSymbol,
                status);
    }

    private String chooseDisplayName(String preferred, String fallback) {
        if (preferred != null && !preferred.isBlank()) {
            return preferred;
        }
        return fallback == null || fallback.isBlank() ? "Unknown Asset" : fallback;
    }
}
