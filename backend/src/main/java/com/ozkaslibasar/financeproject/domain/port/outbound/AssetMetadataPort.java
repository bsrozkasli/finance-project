package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.AssetType;

import java.util.Optional;

public interface AssetMetadataPort {

    Optional<AssetMetadata> fetchMetadata(String symbol);

    record AssetMetadata(
            String symbol,
            String name,
            AssetType type,
            String exchange,
            String currency,
            String sector,
            String industry,
            Long marketCap,
            String source) {
    }
}
