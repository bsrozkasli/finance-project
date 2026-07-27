package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Map;

public record AssetMarketBatch(
        Map<String, AssetResearchDetail.Section<AssetResearchDetail.Market>> quotes,
        Instant generatedAt) {
}