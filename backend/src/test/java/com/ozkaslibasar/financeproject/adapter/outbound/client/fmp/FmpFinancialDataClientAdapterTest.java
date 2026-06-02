package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp;

import com.github.tomakehurst.wiremock.junit5.WireMockTest;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@WireMockTest(httpPort = 8089)
class FmpFinancialDataClientAdapterTest {

    @Autowired
    private FmpFinancialDataClientAdapter clientAdapter;

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        // Point the Feign client at the WireMock server — no extra path prefix so that
        // the @GetMapping paths on FmpClient resolve correctly.
        registry.add("fmp.api.url", () -> "http://localhost:8089");
        registry.add("FMP_API_KEY", () -> "test-api-key");
    }

    @Test
    void shouldFetchAssetInfoSuccessfully() {
        String symbol = "AAPL";
        // FMP stable /search-symbol returns a flat JSON array of profile objects.
        String jsonResponse = "[{" +
                "\"symbol\": \"AAPL\"," +
                "\"name\": \"Apple Inc.\"," +
                "\"currency\": \"USD\"," +
                "\"exchangeFullName\": \"NASDAQ Global Select\"," +
                "\"exchange\": \"NASDAQ\"" +
                "}]";

        stubFor(get(urlPathEqualTo("/search-symbol"))
                .withQueryParam("query", equalTo(symbol))
                .withQueryParam("limit", equalTo("1"))
                .withQueryParam("apikey", equalTo("test-api-key"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(jsonResponse)));

        Optional<Asset> assetOpt = clientAdapter.fetchAssetInfo(symbol);

        assertThat(assetOpt).isPresent();
        assertThat(assetOpt.get().symbol()).isEqualTo("AAPL");
        assertThat(assetOpt.get().name()).isEqualTo("Apple Inc.");
        assertThat(assetOpt.get().type()).isEqualTo(AssetType.STOCK);
    }

    @Test
    void shouldFetchPriceHistorySuccessfully() {
        String symbol = "MSFT";
        // FMP stable /historical-price-eod/full returns a flat JSON array of OHLCV objects.
        String jsonResponse = "[{" +
                "\"date\": \"2023-10-01\"," +
                "\"open\": 315.5," +
                "\"high\": 320.0," +
                "\"low\": 310.0," +
                "\"close\": 318.0," +
                "\"volume\": 1000000" +
                "}]";

        stubFor(get(urlPathEqualTo("/historical-price-eod/full"))
                .withQueryParam("symbol", equalTo(symbol))
                .withQueryParam("apikey", equalTo("test-api-key"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(jsonResponse)));

        List<PriceHistory> prices = clientAdapter.fetchPriceHistory(symbol);

        assertThat(prices).hasSize(1);
        PriceHistory price = prices.get(0);
        assertThat(price.assetId()).isEqualTo("MSFT");
        assertThat(price.open()).isEqualByComparingTo(BigDecimal.valueOf(315.5));
        assertThat(price.close()).isEqualByComparingTo(BigDecimal.valueOf(318.0));
    }
}
