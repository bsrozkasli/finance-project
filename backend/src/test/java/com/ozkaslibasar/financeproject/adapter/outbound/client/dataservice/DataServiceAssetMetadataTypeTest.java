package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetMetadataPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** The instrument type comes only from the provider's quote_type; it is never inferred from other text. */
class DataServiceAssetMetadataTypeTest {

    private final RestTemplate restTemplate = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();

    private Optional<AssetMetadataPort.AssetMetadata> fetch(String body) {
        DataServiceAssetMetadataAdapter adapter = new DataServiceAssetMetadataAdapter(restTemplate);
        ReflectionTestUtils.setField(adapter, "baseUrl", "http://data-service.test");
        server.expect(anything()).andRespond(withSuccess(body, APPLICATION_JSON));
        return adapter.fetchMetadata("TEST");
    }

    @ParameterizedTest
    @CsvSource({"EQUITY,STOCK", "ETF,ETF", "INDEX,INDEX", "CRYPTOCURRENCY,CRYPTO", "CURRENCY,FOREX", "equity,STOCK",
            "MUTUALFUND,UNRESOLVED", "FUTURE,UNRESOLVED", "'',UNRESOLVED"})
    void mapsProviderQuoteTypeAndLeavesUnsupportedUnresolved(String quoteType, AssetType expected) {
        var result = fetch("{\"symbol\":\"TEST\",\"name\":\"Test Co\",\"exchange\":\"NASDAQ\",\"quote_type\":\"" + quoteType + "\"}");

        assertThat(result).isPresent();
        assertThat(result.get().type()).isEqualTo(expected);
    }

    @Test
    void missingQuoteTypeIsUnresolvedEvenWhenTextMentionsEtfOrIndex() {
        var result = fetch("{\"symbol\":\"TEST\",\"name\":\"Test ETF\",\"exchange\":\"NASDAQ\",\"industry\":\"ETF Index Fund\"}");

        assertThat(result).isPresent();
        assertThat(result.get().type()).isEqualTo(AssetType.UNRESOLVED);
    }
}
