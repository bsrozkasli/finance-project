package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.SymbolMapping;
import com.ozkaslibasar.financeproject.domain.model.SymbolMappingStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SymbolMappingPort;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AssetResolutionServiceTest {

    private final SymbolMappingPort symbolMappingPort = mock(SymbolMappingPort.class);
    private final PriceChartClientPort priceChartClientPort = mock(PriceChartClientPort.class);
    private final AssetResolutionService service = new AssetResolutionService(symbolMappingPort, priceChartClientPort);

    @Test
    void manualOverrideMappingSuppliesEtfMetadataWhenProviderMetadataIsMissing() {
        SymbolMapping dramMapping = new SymbolMapping(
                "DRAM",
                "YAHOO",
                "DRAM",
                "Roundhill Memory ETF",
                AssetType.ETF,
                "NYSEARCA",
                "USD",
                1,
                SymbolMappingStatus.MANUAL_OVERRIDE,
                null,
                Instant.parse("2026-07-09T00:00:00Z"));
        // Mock rationale: symbol mapping and provider calls are I/O boundaries.
        when(symbolMappingPort.findBestMapping("DRAM", "YAHOO")).thenReturn(Optional.of(dramMapping));
        when(priceChartClientPort.fetchAssetInfo("DRAM")).thenReturn(Optional.empty());

        Asset resolved = service.resolve("dram");

        assertThat(resolved.symbol()).isEqualTo("DRAM");
        assertThat(resolved.name()).isEqualTo("Roundhill Memory ETF");
        assertThat(resolved.type()).isEqualTo(AssetType.ETF);
        assertThat(resolved.exchange()).isEqualTo("NYSEARCA");
        assertThat(resolved.currency()).isEqualTo("USD");
        assertThat(resolved.providerSymbol()).isEqualTo("DRAM");
        assertThat(resolved.metadataStatus()).isEqualTo(AssetMetadataStatus.PARTIAL);
    }

    @Test
    void providerMetadataWinsButCanonicalSymbolStaysStable() {
        SymbolMapping mapping = new SymbolMapping(
                "MSFT",
                "YAHOO",
                "MSFT",
                "Microsoft Corporation",
                AssetType.STOCK,
                "NASDAQ",
                "USD",
                1,
                SymbolMappingStatus.ACTIVE,
                null,
                Instant.parse("2026-07-09T00:00:00Z"));
        Asset providerAsset = new Asset("MSFT", "MSFT", AssetType.STOCK, "NMS", "USD", "YAHOO", "MSFT", AssetMetadataStatus.PARTIAL);
        // Mock rationale: symbol mapping and provider calls are I/O boundaries.
        when(symbolMappingPort.findBestMapping("MSFT", "YAHOO")).thenReturn(Optional.of(mapping));
        when(priceChartClientPort.fetchAssetInfo("MSFT")).thenReturn(Optional.of(providerAsset));

        Asset resolved = service.resolve("msft");

        assertThat(resolved.symbol()).isEqualTo("MSFT");
        assertThat(resolved.name()).isEqualTo("Microsoft Corporation");
        assertThat(resolved.metadataStatus()).isEqualTo(AssetMetadataStatus.VERIFIED);
    }

    @Test
    void missingProviderAndMissingMappingReturnsExplicitUnavailableMetadata() {
        // Mock rationale: symbol mapping and provider calls are I/O boundaries.
        when(symbolMappingPort.findBestMapping("UNKNOWN", "YAHOO")).thenReturn(Optional.empty());
        when(priceChartClientPort.fetchAssetInfo("UNKNOWN")).thenReturn(Optional.empty());

        Asset resolved = service.resolve("unknown");

        assertThat(resolved.symbol()).isEqualTo("UNKNOWN");
        assertThat(resolved.name()).isEqualTo("UNKNOWN");
        assertThat(resolved.type()).isEqualTo(AssetType.STOCK);
        assertThat(resolved.metadataStatus()).isEqualTo(AssetMetadataStatus.UNAVAILABLE);
    }

    private static final class NoopPriceClient implements PriceChartClientPort {
        @Override
        public List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range) {
            return List.of();
        }

        @Override
        public Optional<Asset> fetchAssetInfo(String symbol) {
            return Optional.empty();
        }
    }
}
