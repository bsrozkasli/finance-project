package com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo;

import com.ozkaslibasar.financeproject.adapter.outbound.client.guard.ProviderRequestGuard;
import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.anything;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Asset type comes from Yahoo's instrumentType only; the exchange name is never used to guess it. */
class YahooFinanceAssetInfoTest {

    private final RestTemplate restTemplate = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
    private final YahooFinancePriceAdapter adapter = new YahooFinancePriceAdapter(
            restTemplate, new SimpleMeterRegistry(), new ProviderRequestGuard(1000, 1000, 1));

    private Optional<Asset> fetch(String metaJson) {
        server.expect(anything()).andRespond(withSuccess(
                "{\"chart\":{\"result\":[{\"meta\":" + metaJson + ",\"timestamp\":[],\"indicators\":{\"quote\":[]}}]}}",
                APPLICATION_JSON));
        return adapter.fetchAssetInfo("SPY");
    }

    @Test
    void usesProviderInstrumentType() {
        Optional<Asset> asset = fetch("{\"symbol\":\"SPY\",\"currency\":\"USD\",\"exchangeName\":\"PCX\",\"instrumentType\":\"ETF\"}");

        assertThat(asset).isPresent();
        assertThat(asset.get().type()).isEqualTo(AssetType.ETF);
    }

    @Test
    void missingInstrumentTypeIsUnresolvedNotStock() {
        Optional<Asset> asset = fetch("{\"symbol\":\"XYZ\",\"currency\":\"USD\",\"exchangeName\":\"NMS\"}");

        assertThat(asset).isPresent();
        assertThat(asset.get().type()).isEqualTo(AssetType.UNRESOLVED);
    }

    @Test
    void exchangeNameContainingEtfIsNotEnoughToClassify() {
        Optional<Asset> asset = fetch("{\"symbol\":\"XYZ\",\"exchangeName\":\"NYSEARCA\"}");

        assertThat(asset).isPresent();
        assertThat(asset.get().type()).isEqualTo(AssetType.UNRESOLVED);
    }
}
