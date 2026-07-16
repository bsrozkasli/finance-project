package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetMetadataPort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Component
@Slf4j
public class DataServiceAssetMetadataAdapter implements AssetMetadataPort {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceAssetMetadataAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public Optional<AssetMetadata> fetchMetadata(String symbol) {
        try {
            String encodedSymbol = URLEncoder.encode(symbol.toUpperCase(), StandardCharsets.UTF_8);
            AssetInfoDto response = restTemplate.getForObject(
                    baseUrl + "/api/v1/assets/" + encodedSymbol + "/info",
                    AssetInfoDto.class);
            if (response == null || response.getSymbol() == null || response.getName() == null) {
                return Optional.empty();
            }
            return Optional.of(new AssetMetadata(
                    response.getSymbol().toUpperCase(),
                    response.getName(),
                    inferType(response),
                    response.getExchange(),
                    response.getCurrency(),
                    response.getSector(),
                    response.getIndustry(),
                    response.getMarketCap(),
                    response.getSource()));
        } catch (Exception e) {
            log.warn("Asset metadata unavailable for {}: {}", symbol, e.getMessage());
            return Optional.empty();
        }
    }

    private AssetType inferType(AssetInfoDto response) {
        String joined = ((response.getExchange() == null ? "" : response.getExchange()) + " "
                + (response.getIndustry() == null ? "" : response.getIndustry())).toUpperCase();
        if (joined.contains("ETF")) {
            return AssetType.ETF;
        }
        if (joined.contains("INDEX")) {
            return AssetType.INDEX;
        }
        if (joined.contains("CRYPTO")) {
            return AssetType.CRYPTO;
        }
        return AssetType.STOCK;
    }

    @Data
    static class AssetInfoDto {
        private String symbol;
        private String name;
        private String exchange;
        private String currency;
        private String sector;
        private String industry;
        @JsonProperty("market_cap")
        private Long marketCap;
        private String source;
    }
}
