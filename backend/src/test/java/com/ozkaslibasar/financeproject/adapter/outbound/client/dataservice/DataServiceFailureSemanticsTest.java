package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.AgentMetricSnapshot;
import com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.http.MediaType.TEXT_HTML;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * PRD-FR-010: a failed, malformed, or empty data-service answer yields absent or empty output
 * from every consumer adapter, never a synthetic value. Boundary stub only; no live provider.
 */
class DataServiceFailureSemanticsTest {

    private static final String BASE = "http://data-service.test";

    private final RestTemplate restTemplate = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();

    private <T> T withBaseUrl(T adapter) {
        ReflectionTestUtils.setField(adapter, "baseUrl", BASE);
        return adapter;
    }

    @Test
    void priceHistoryIsEmptyOnServerErrorMalformedBodyAndEmptyArray() {
        DataServicePriceAdapter adapter = withBaseUrl(
                new DataServicePriceAdapter(restTemplate, new PriceNormalizationService(), new SimpleMeterRegistry()));

        server.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(anything()).andRespond(withSuccess("<html>gateway</html>", TEXT_HTML));
        server.expect(anything()).andRespond(withSuccess("[]", APPLICATION_JSON));

        assertThat(adapter.fetchPriceHistory("AAPL", "1d", "5d")).isEmpty();
        assertThat(adapter.fetchPriceHistory("AAPL", "1d", "5d")).isEmpty();
        assertThat(adapter.fetchPriceHistory("AAPL", "1d", "5d")).isEmpty();
        server.verify();
    }

    @Test
    void assetMetadataIsAbsentOnServerErrorAndOnMissingIdentityFields() {
        DataServiceAssetMetadataAdapter adapter = withBaseUrl(new DataServiceAssetMetadataAdapter(restTemplate));

        server.expect(anything()).andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        server.expect(anything()).andRespond(withSuccess("{\"symbol\":\"ZZZZ\"}", APPLICATION_JSON));
        server.expect(anything()).andRespond(withSuccess("{}", APPLICATION_JSON));

        assertThat(adapter.fetchMetadata("ZZZZ")).isEmpty();
        assertThat(adapter.fetchMetadata("ZZZZ")).isEmpty();
        assertThat(adapter.fetchMetadata("ZZZZ")).isEmpty();
        server.verify();
    }

    @Test
    void researchSectionsAreAbsentOrEmptyOnServerError() {
        DataServiceResearchAdapter adapter = withBaseUrl(new DataServiceResearchAdapter(restTemplate));

        server.expect(anything()).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        server.expect(anything()).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        server.expect(anything()).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));
        server.expect(anything()).andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThat(adapter.getCompositeScore("AAPL")).isEmpty();
        assertThat(adapter.fetchFundamental("AAPL")).isEmpty();
        assertThat(adapter.fetchEarnings("AAPL")).isEmpty();
        assertThat(adapter.fetchInstitutionalScores("AAPL")).isEmpty();
        server.verify();
    }

    @Test
    void agentAnalysisIsAbsentOnServerErrorAndOnMissingDecision() {
        DataServiceAgentAnalysisAdapter adapter = withBaseUrl(
                new DataServiceAgentAnalysisAdapter(restTemplate, new SimpleMeterRegistry()));
        AgentMetricSnapshot metrics = new AgentMetricSnapshot(
                BigDecimal.valueOf(150), Map.of(), Map.of(), Map.of(), Map.of(), Map.of());

        server.expect(anything()).andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        server.expect(anything()).andRespond(withSuccess("{\"confidence\":70}", APPLICATION_JSON));
        server.expect(anything()).andRespond(withSuccess("{\"decision\":\"BUY\"}", APPLICATION_JSON));

        assertThat(adapter.runAnalysis("AAPL", metrics, null)).isEmpty();
        assertThat(adapter.runAnalysis("AAPL", metrics, null)).isEmpty();
        assertThat(adapter.runAnalysis("AAPL", metrics, null)).isEmpty();
        server.verify();
    }
}
