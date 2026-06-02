package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link PriceIngestionUseCase}.
 *
 * <p>No Spring context is loaded — all dependencies are mocked with Mockito.
 * Tests follow the naming convention: {@code should_[expected]_when_[condition]}.</p>
 */
@ExtendWith(MockitoExtension.class)
class PriceIngestionUseCaseTest {

    @Mock
    private AssetRepositoryPort     assetRepository;

    @Mock
    private PriceRepositoryPort     priceRepository;

    @Mock
    private FinancialDataClientPort dataClient;

    @InjectMocks
    private PriceIngestionUseCase   priceIngestionUseCase;

    private Asset sampleAsset;

    @BeforeEach
    void setUp() {
        sampleAsset = new Asset("AAPL", "Apple Inc.", AssetType.STOCK);
    }

    // ─── ingestAll() ─────────────────────────────────────────────────────────

    @Test
    void should_fetchAndSavePrices_when_singleAssetExistsAndClientReturnsPrices() {
        // Arrange
        var price = buildSamplePrice("AAPL");
        when(assetRepository.findAll()).thenReturn(List.of(sampleAsset));
        when(dataClient.fetchPriceHistory("AAPL")).thenReturn(List.of(price));

        // Act
        priceIngestionUseCase.ingestAll();

        // Assert
        verify(dataClient).fetchPriceHistory("AAPL");
        verify(priceRepository).saveAll(List.of(price));
    }

    @Test
    void should_ingestPricesForEachAsset_when_multipleAssetsExist() {
        // Arrange
        var assetB  = new Asset("TSLA", "Tesla Inc.", AssetType.STOCK);
        var priceA  = buildSamplePrice("AAPL");
        var priceB  = buildSamplePrice("TSLA");

        when(assetRepository.findAll()).thenReturn(List.of(sampleAsset, assetB));
        when(dataClient.fetchPriceHistory("AAPL")).thenReturn(List.of(priceA));
        when(dataClient.fetchPriceHistory("TSLA")).thenReturn(List.of(priceB));

        // Act
        priceIngestionUseCase.ingestAll();

        // Assert — each asset triggers its own save
        verify(priceRepository).saveAll(List.of(priceA));
        verify(priceRepository).saveAll(List.of(priceB));
        verifyNoMoreInteractions(priceRepository);
    }

    @Test
    void should_notCallClientOrRepository_when_noAssetsRegistered() {
        // Arrange
        when(assetRepository.findAll()).thenReturn(Collections.emptyList());

        // Act
        priceIngestionUseCase.ingestAll();

        // Assert
        verifyNoInteractions(dataClient);
        verifyNoInteractions(priceRepository);
    }

    // ─── ingestForSymbol() ───────────────────────────────────────────────────

    @Test
    void should_savePrices_when_clientReturnsPriceData() {
        // Arrange
        var price = buildSamplePrice("MSFT");
        when(dataClient.fetchPriceHistory("MSFT")).thenReturn(List.of(price));

        // Act
        priceIngestionUseCase.ingestForSymbol("MSFT");

        // Assert
        verify(priceRepository).saveAll(List.of(price));
    }

    @Test
    void should_notSavePrices_when_clientReturnsEmptyList() {
        // Arrange — external API returns nothing (e.g. market closed)
        when(dataClient.fetchPriceHistory("GOOG")).thenReturn(Collections.emptyList());

        // Act
        priceIngestionUseCase.ingestForSymbol("GOOG");

        // Assert — empty response must not trigger a write
        verifyNoInteractions(priceRepository);
    }

    @Test
    void should_throwNullPointerException_when_symbolIsNull() {
        // Act & Assert
        assertThatThrownBy(() -> priceIngestionUseCase.ingestForSymbol(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("symbol must not be null");

        verifyNoInteractions(dataClient);
        verifyNoInteractions(priceRepository);
    }

    // ─── Constructor guard tests ──────────────────────────────────────────────

    @Test
    void should_throwNullPointerException_when_assetRepositoryIsNull() {
        assertThatThrownBy(() -> new PriceIngestionUseCase(null, priceRepository, dataClient))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("assetRepository must not be null");
    }

    @Test
    void should_throwNullPointerException_when_priceRepositoryIsNull() {
        assertThatThrownBy(() -> new PriceIngestionUseCase(assetRepository, null, dataClient))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("priceRepository must not be null");
    }

    @Test
    void should_throwNullPointerException_when_dataClientIsNull() {
        assertThatThrownBy(() -> new PriceIngestionUseCase(assetRepository, priceRepository, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("dataClient must not be null");
    }

    // ─── Domain model guard tests ─────────────────────────────────────────────

    @Test
    void should_throwIllegalArgumentException_when_priceHistoryHighIsLessThanLow() {
        // Arrange — high < low violates OHLCV invariant
        assertThatThrownBy(() -> new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(150),
                BigDecimal.valueOf(155),
                BigDecimal.valueOf(140),   // high < low — illegal
                BigDecimal.valueOf(145),
                BigDecimal.valueOf(1_000_000),
                Instant.now()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("high");
    }

    @Test
    void should_throwIllegalArgumentException_when_assetSymbolIsBlank() {
        assertThatThrownBy(() -> new Asset("   ", "Apple Inc.", AssetType.STOCK))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("blank");
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    /**
     * Builds a valid {@link PriceHistory} instance for the given symbol.
     * Uses representative values that satisfy all domain invariants.
     */
    private PriceHistory buildSamplePrice(String symbol) {
        return new PriceHistory(
                symbol,
                BigDecimal.valueOf(150.00),
                BigDecimal.valueOf(155.00),
                BigDecimal.valueOf(157.50),
                BigDecimal.valueOf(149.00),
                BigDecimal.valueOf(1_000_000L),
                Instant.parse("2026-01-15T16:00:00Z")
        );
    }
}
