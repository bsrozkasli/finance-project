package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp;

import com.github.tomakehurst.wiremock.client.WireMock;
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
        registry.add("fmp.api.url", () -> "http://localhost:8089/api/v3");
        registry.add("FMP_API_KEY", () -> "test-api-key");
    }

    @Test
    void shouldFetchAssetInfoSuccessfully() {
        // Arrange
        String symbol = "AAPL";
        String jsonResponse = "[{" +
                "\"symbol\": \"AAPL\"," +
                "\"companyName\": \"Apple Inc.\"," +
                "\"exchangeShortName\": \"NASDAQ\"," +
                "\"industry\": \"Consumer Electronics\"," +
                "\"isEtf\": false," +
                "\"isActivelyTrading\": true" +
                "}]";

        stubFor(get(urlPathEqualTo("/api/v3/profile/" + symbol))
                .withQueryParam("apikey", equalTo("test-api-key"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(jsonResponse)));

        // Act
        Optional<Asset> assetOpt = clientAdapter.fetchAssetInfo(symbol);

        // Assert
        assertThat(assetOpt).isPresent();
        assertThat(assetOpt.get().symbol()).isEqualTo("AAPL");
        assertThat(assetOpt.get().name()).isEqualTo("Apple Inc.");
        assertThat(assetOpt.get().type()).isEqualTo(AssetType.STOCK);
    }

    @Test
    void shouldFetchPriceHistorySuccessfully() {
        // Arrange
        String symbol = "MSFT";
        String jsonResponse = "{" +
                "\"symbol\": \"MSFT\"," +
                "\"historical\": [" +
                "  {" +
                "    \"date\": \"2023-10-01\"," +
                "    \"open\": 315.5," +
                "    \"high\": 320.0," +
                "    \"low\": 310.0," +
                "    \"close\": 318.0," +
                "    \"volume\": 1000000" +
                "  }" +
                "]" +
                "}";

        stubFor(get(urlPathEqualTo("/api/v3/historical-price-full/" + symbol))
                .withQueryParam("apikey", equalTo("test-api-key"))
                .willReturn(aResponse()
                        .withHeader("Content-Type", "application/json")
                        .withBody(jsonResponse)));

        // Act
        List<PriceHistory> prices = clientAdapter.fetchPriceHistory(symbol);

        // Assert
        assertThat(prices).hasSize(1);
        PriceHistory price = prices.get(0);
        assertThat(price.assetId()).isEqualTo("MSFT");
        assertThat(price.open()).isEqualByComparingTo(BigDecimal.valueOf(315.5));
        assertThat(price.close()).isEqualByComparingTo(BigDecimal.valueOf(318.0));
    }
}
