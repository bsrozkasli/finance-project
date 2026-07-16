package com.ozkaslibasar.financeproject.domain.model;

import java.time.Instant;
import java.util.Objects;

public record SymbolMapping(
        String canonicalSymbol,
        String provider,
        String providerSymbol,
        String displayName,
        AssetType assetType,
        String exchange,
        String currency,
        int priority,
        SymbolMappingStatus status,
        String lastFailureReason,
        Instant lastResolvedAt) {

    public SymbolMapping {
        Objects.requireNonNull(canonicalSymbol, "Canonical symbol must not be null");
        Objects.requireNonNull(provider, "Provider must not be null");
        Objects.requireNonNull(providerSymbol, "Provider symbol must not be null");
        Objects.requireNonNull(assetType, "Asset type must not be null");
        Objects.requireNonNull(status, "Mapping status must not be null");
        if (canonicalSymbol.isBlank()) {
            throw new IllegalArgumentException("Canonical symbol must not be blank");
        }
        if (provider.isBlank()) {
            throw new IllegalArgumentException("Provider must not be blank");
        }
        if (providerSymbol.isBlank()) {
            throw new IllegalArgumentException("Provider symbol must not be blank");
        }
        canonicalSymbol = canonicalSymbol.trim().toUpperCase();
        provider = provider.trim().toUpperCase();
        providerSymbol = providerSymbol.trim().toUpperCase();
    }

    public boolean canUseForResolution() {
        return status == SymbolMappingStatus.ACTIVE || status == SymbolMappingStatus.MANUAL_OVERRIDE;
    }
}
