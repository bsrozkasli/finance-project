package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetMetadataPort;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class DataServiceAssetMetadataAdapterTest {

    @Test
    void explicitEtfQuoteTypeWinsOverExchangeHeuristic() throws Exception {
        RestTemplate restTemplate = mock(RestTemplate.class);
        DataServiceAssetMetadataAdapter.AssetInfoDto response = metadata("ETF");
        // Mock rationale: RestTemplate crosses the data-service HTTP boundary.
        when(restTemplate.getForObject(anyString(), eq(DataServiceAssetMetadataAdapter.AssetInfoDto.class)))
                .thenReturn(response);

        AssetMetadataPort.AssetMetadata metadata = new DataServiceAssetMetadataAdapter(restTemplate)
                .fetchMetadata("SPY").orElseThrow();

        assertThat(metadata.type().name()).isEqualTo("ETF");
    }

    @Test
    void missingQuoteTypeRemainsUnknownDespiteStockExchange() throws Exception {
        RestTemplate restTemplate = mock(RestTemplate.class);
        DataServiceAssetMetadataAdapter.AssetInfoDto response = metadata(null);
        // Mock rationale: RestTemplate crosses the data-service HTTP boundary.
        when(restTemplate.getForObject(anyString(), eq(DataServiceAssetMetadataAdapter.AssetInfoDto.class)))
                .thenReturn(response);

        AssetMetadataPort.AssetMetadata metadata = new DataServiceAssetMetadataAdapter(restTemplate)
                .fetchMetadata("SPY").orElseThrow();

        assertThat(metadata.type().name()).isEqualTo("UNKNOWN");
    }

    private DataServiceAssetMetadataAdapter.AssetInfoDto metadata(String quoteType) throws Exception {
        String typeJson = quoteType == null ? "" : ",\"quote_type\":\"" + quoteType + "\"";
        String json = "{\"symbol\":\"SPY\",\"name\":\"SPDR S&P 500 ETF Trust\",\"exchange\":\"NASDAQ\""
                + typeJson + "}";
        return new ObjectMapper()
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                .readValue(json, DataServiceAssetMetadataAdapter.AssetInfoDto.class);
    }
}
