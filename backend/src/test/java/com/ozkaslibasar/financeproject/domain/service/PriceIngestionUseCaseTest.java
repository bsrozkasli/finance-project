package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
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
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class PriceIngestionUseCaseTest {

    @Mock
    // Mock rationale: outbound persistence-read port, avoids DB dependency.
    private AssetRepositoryPort assetRepository;

    @Mock
    // Mock rationale: outbound persistence-write port, avoids DB dependency.
    private PriceRepositoryPort priceRepository;

    @Mock
    // Mock rationale: outbound market-data client, isolates external provider I/O.
    private FinancialDataClientPort dataClient;

    @InjectMocks
    private PriceIngestionUseCase priceIngestionUseCase;

    @Test
    void should_throwNullPointerException_when_constructedWithNullPorts() {
        assertThatThrownBy(() -> new PriceIngestionUseCase(null, priceRepository, dataClient))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("assetRepository");

        assertThatThrownBy(() -> new PriceIngestionUseCase(assetRepository, null, dataClient))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("priceRepository");

        assertThatThrownBy(() -> new PriceIngestionUseCase(assetRepository, priceRepository, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("dataClient");
    }

    @Test
    void should_throwNullPointerException_when_ingestForSymbolCalledWithNull() {
        assertThatThrownBy(() -> priceIngestionUseCase.ingestForSymbol(null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("symbol must not be null");

        verifyNoInteractions(dataClient);
        verifyNoInteractions(priceRepository);
    }

    @Test
    void should_skipSavingPrices_when_dataClientReturnsEmpty() {
        when(dataClient.fetchPriceHistory("AAPL")).thenReturn(Collections.emptyList());

        priceIngestionUseCase.ingestForSymbol("AAPL");

        verify(dataClient).fetchPriceHistory("AAPL");
        verify(priceRepository, never()).saveAll(anyList());
    }

    @Test
    void should_invokeAllAssetsIteratively_when_ingestAll() {
        Asset aapl = new Asset("AAPL", "Apple Inc.", AssetType.STOCK);
        Asset msft = new Asset("MSFT", "Microsoft", AssetType.STOCK);

        PriceHistory aaplPrice = buildSamplePrice("AAPL");
        PriceHistory msftPrice = buildSamplePrice("MSFT");

        when(assetRepository.findAll()).thenReturn(List.of(aapl, msft));
        when(dataClient.fetchPriceHistory("AAPL")).thenReturn(List.of(aaplPrice));
        when(dataClient.fetchPriceHistory("MSFT")).thenReturn(List.of(msftPrice));

        priceIngestionUseCase.ingestAll();

        var inOrder = inOrder(assetRepository, dataClient, priceRepository);
        inOrder.verify(assetRepository).findAll();
        inOrder.verify(dataClient).fetchPriceHistory("AAPL");
        inOrder.verify(priceRepository).saveAll(List.of(aaplPrice));
        inOrder.verify(dataClient).fetchPriceHistory("MSFT");
        inOrder.verify(priceRepository).saveAll(List.of(msftPrice));
    }

    @Test
    void should_fetchAndSavePrices_when_singleAssetExistsAndClientReturnsPrices() {
        Asset sampleAsset = new Asset("AAPL", "Apple Inc.", AssetType.STOCK);
        PriceHistory price = buildSamplePrice("AAPL");

        when(assetRepository.findAll()).thenReturn(List.of(sampleAsset));
        when(dataClient.fetchPriceHistory("AAPL")).thenReturn(List.of(price));

        priceIngestionUseCase.ingestAll();

        verify(dataClient).fetchPriceHistory("AAPL");
        verify(priceRepository).saveAll(List.of(price));
    }

    @Test
    void should_notCallClientOrRepository_when_noAssetsRegistered() {
        when(assetRepository.findAll()).thenReturn(Collections.emptyList());

        priceIngestionUseCase.ingestAll();

        verifyNoInteractions(dataClient);
        verifyNoInteractions(priceRepository);
    }

    @Test
    void should_savePrices_when_clientReturnsPriceData() {
        PriceHistory price = buildSamplePrice("MSFT");
        when(dataClient.fetchPriceHistory("MSFT")).thenReturn(List.of(price));

        priceIngestionUseCase.ingestForSymbol("MSFT");

        verify(priceRepository).saveAll(List.of(price));
    }

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
