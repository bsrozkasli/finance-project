package com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ozkaslibasar.financeproject.adapter.outbound.client.guard.ProviderRequestGuard;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class YahooFinanceAssetInfoTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void explicitEtfInstrumentTypeWinsOverExchangeHeuristic() throws Exception {
        Asset asset = fetchAsset("ETF");

        assertThat(asset.type().name()).isEqualTo("ETF");
    }

    @Test
    void absentInstrumentTypeDoesNotBecomeStock() throws Exception {
        Asset asset = fetchAsset(null);

        assertThat(asset.type().name()).isEqualTo("UNKNOWN");
    }

    private Asset fetchAsset(String instrumentType) throws Exception {
        RestTemplate restTemplate = mock(RestTemplate.class);
        String typeJson = instrumentType == null ? "" : ",\"instrumentType\":\"" + instrumentType + "\"";
        String json = "{\"chart\":{\"result\":[{\"meta\":{\"symbol\":\"SPY\",\"exchangeName\":\"NASDAQ\""
                + typeJson + "}}]}}";
        YahooChartResponseDto response = objectMapper.readValue(json, YahooChartResponseDto.class);
        // Mock rationale: RestTemplate crosses the Yahoo Finance HTTP boundary.
        when(restTemplate.getForObject(anyString(), eq(YahooChartResponseDto.class))).thenReturn(response);

        YahooFinancePriceAdapter adapter = new YahooFinancePriceAdapter(
                restTemplate, new SimpleMeterRegistry(), new ProviderRequestGuard(2000, 120, 30));
        return adapter.fetchAssetInfo("SPY").orElseThrow();
    }
}
