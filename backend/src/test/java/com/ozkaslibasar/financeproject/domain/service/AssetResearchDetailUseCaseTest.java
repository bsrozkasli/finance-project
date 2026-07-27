package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetResearchDetail;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetDetailDataPort;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AssetResearchDetailUseCaseTest {

    @Test
    void returnsProfileWhenQuoteProviderIsUnavailable() {
        AssetDetailDataPort port = mock(AssetDetailDataPort.class);
        when(port.fetchProfile("AAPL")).thenReturn(Optional.of(new AssetDetailDataPort.CompanyProfile(
                "AAPL", "Apple Inc.", "NASDAQ", "USD", "Technology", "Consumer Electronics",
                3_000L, "Designs consumer electronics.", "https://www.apple.com", null,
                "United States", "EQUITY", 164000, "yahoo")));
        when(port.fetchMarketQuote("AAPL")).thenReturn(Optional.empty());

        AssetResearchDetail detail = new AssetResearchDetailUseCase(port).getDetail(" aapl ");

        assertThat(detail.symbol()).isEqualTo("AAPL");
        assertThat(detail.profile().status()).isEqualTo("OK");
        assertThat(detail.profile().data().name()).isEqualTo("Apple Inc.");
        assertThat(detail.market().status()).isEqualTo("EMPTY");
        assertThat(detail.market().data()).isNull();
    }

    @Test
    void batchNormalizesSymbolsAndKeepsPartialFailures() {
        AssetDetailDataPort port = mock(AssetDetailDataPort.class);
        when(port.fetchMarketQuote("AAPL")).thenReturn(Optional.of(new AssetDetailDataPort.MarketQuote(
                "AAPL", "REGULAR", "America/New_York", 209.0,
                210.0, 1.0, 0.0048, Instant.parse("2026-07-16T19:59:00Z"),
                null, null, null, null, null, null, null, null,
                false, "yahoo")));
        when(port.fetchMarketQuote("MSFT")).thenReturn(Optional.empty());

        var batch = new AssetResearchDetailUseCase(port)
                .getMarketBatch(java.util.List.of(" aapl ", "AAPL", "msft", " "));

        assertThat(batch.quotes()).containsOnlyKeys("AAPL", "MSFT");
        assertThat(batch.quotes().get("AAPL").status()).isEqualTo("OK");
        assertThat(batch.quotes().get("MSFT").status()).isEqualTo("EMPTY");
    }
    @Test
    void mapsExtendedHoursQuoteWithoutInventingMissingFields() {
        AssetDetailDataPort port = mock(AssetDetailDataPort.class);
        when(port.fetchProfile("AAPL")).thenReturn(Optional.empty());
        when(port.fetchMarketQuote("AAPL")).thenReturn(Optional.of(new AssetDetailDataPort.MarketQuote(
                "AAPL", "POST_MARKET", "America/New_York", 210.0,
                211.0, 1.0, 0.0047, Instant.parse("2026-07-16T20:00:00Z"),
                null, null, null, null,
                212.0, 1.0, 0.0047, Instant.parse("2026-07-16T21:00:00Z"),
                true, "yahoo")));

        AssetResearchDetail detail = new AssetResearchDetailUseCase(port).getDetail("AAPL");

        assertThat(detail.profile().status()).isEqualTo("EMPTY");
        assertThat(detail.market().status()).isEqualTo("OK");
        assertThat(detail.market().data().marketState()).isEqualTo("POST_MARKET");
        assertThat(detail.market().data().preMarketPrice()).isNull();
        assertThat(detail.market().data().postMarketPrice()).isEqualTo(212.0);
    }
}