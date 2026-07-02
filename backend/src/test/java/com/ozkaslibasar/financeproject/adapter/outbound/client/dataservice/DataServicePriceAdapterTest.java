package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class DataServicePriceAdapterTest {

    @Test
    void skipsIncompleteAndInvalidBarsInsteadOfFillingSyntheticValues() {
        RestTemplate restTemplate = new RestTemplate();
        SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        DataServicePriceAdapter adapter = new DataServicePriceAdapter(restTemplate, new PriceNormalizationService(), meterRegistry);
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");

        server.expect(requestTo("http://data-service.test/api/v1/prices/AAPL?interval=1d&range=5d"))
                .andRespond(withSuccess("""
                        [
                          {"timestamp":"2026-01-01T00:00:00Z","open":10.0,"high":12.0,"low":9.0,"close":11.0,"volume":1000},
                          {"timestamp":"2026-01-02T00:00:00Z","open":null,"high":13.0,"low":10.0,"close":12.0,"volume":1100},
                          {"timestamp":"not-a-date","open":12.0,"high":14.0,"low":11.0,"close":13.0,"volume":1200}
                        ]
                        """, APPLICATION_JSON));

        List<PriceHistory> result = adapter.fetchPriceHistory("AAPL", "1d", "5d");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).open()).isEqualByComparingTo("10.0");
        assertThat(result.get(0).close()).isEqualByComparingTo("11.0");
        assertThat(result.get(0).volume()).isEqualByComparingTo("1000");
        assertThat(meterRegistry.counter("provider_request_total", "provider", "data-service", "operation", "price_history", "result", "success").count()).isEqualTo(1.0);
        assertThat(meterRegistry.timer("dataservice_request_latency_seconds", "endpoint", "prices", "result", "success").count()).isEqualTo(1);
        server.verify();
    }
}