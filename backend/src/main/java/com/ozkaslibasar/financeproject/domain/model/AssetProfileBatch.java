package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Map;

public record AssetProfileBatch(
        Map<String, AssetResearchDetail.Section<AssetResearchDetail.Profile>> profiles,
        Instant generatedAt) {
}