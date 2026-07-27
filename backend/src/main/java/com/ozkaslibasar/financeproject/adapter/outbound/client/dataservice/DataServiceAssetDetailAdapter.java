package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetDetailDataPort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Optional;

@Component
@Slf4j
public class DataServiceAssetDetailAdapter implements AssetDetailDataPort {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceAssetDetailAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    @Cacheable(value = "assetProfileCache", key = "#symbol.trim().toUpperCase()")
    public Optional<CompanyProfile> fetchProfile(String symbol) {
        try {
            ProfileDto dto = restTemplate.getForObject(url(symbol, "profile"), ProfileDto.class);
            if (dto == null || dto.getName() == null || dto.getName().isBlank()) {
                return Optional.empty();
            }
            return Optional.of(new CompanyProfile(
                    dto.getSymbol(), dto.getName(), dto.getExchange(), dto.getCurrency(), dto.getSector(), dto.getIndustry(),
                    dto.getMarketCap(), dto.getDescription(), dto.getWebsite(), dto.getLogoUrl(), dto.getCountry(),
                    dto.getQuoteType(), dto.getFullTimeEmployees(), dto.getSource() == null ? "provider-chain" : dto.getSource()));
        } catch (Exception ex) {
            log.warn("Company profile unavailable for {}: {}", symbol, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    @Cacheable(value = "marketQuoteCache", key = "#symbol.trim().toUpperCase()")
    public Optional<MarketQuote> fetchMarketQuote(String symbol) {
        try {
            MarketQuoteDto dto = restTemplate.getForObject(url(symbol, "market-quote"), MarketQuoteDto.class);
            if (dto == null) {
                return Optional.empty();
            }
            return Optional.of(new MarketQuote(
                    dto.getSymbol(), dto.getMarketState(), dto.getExchangeTimezone(), dto.getPreviousClose(),
                    dto.getRegularPrice(), dto.getRegularChange(), dto.getRegularChangePercent(), parseInstant(dto.getRegularTimestamp()),
                    dto.getPreMarketPrice(), dto.getPreMarketChange(), dto.getPreMarketChangePercent(), parseInstant(dto.getPreMarketTimestamp()),
                    dto.getPostMarketPrice(), dto.getPostMarketChange(), dto.getPostMarketChangePercent(), parseInstant(dto.getPostMarketTimestamp()),
                    dto.getDelayed(), dto.getSource() == null ? "provider-chain" : dto.getSource()));
        } catch (Exception ex) {
            log.warn("Market quote unavailable for {}: {}", symbol, ex.getMessage());
            return Optional.empty();
        }
    }

    private String url(String symbol, String resource) {
        return baseUrl + "/api/v1/assets/" + URLEncoder.encode(symbol.toUpperCase(), StandardCharsets.UTF_8) + "/" + resource;
    }

    private Instant parseInstant(String value) {
        try {
            return value == null || value.isBlank() ? null : Instant.parse(value);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    @Data
    static class ProfileDto {
        private String symbol;
        private String name;
        private String exchange;
        private String currency;
        private String sector;
        private String industry;
        @JsonProperty("market_cap")
        private Long marketCap;
        private String description;
        private String website;
        @JsonProperty("logo_url")
        private String logoUrl;
        private String country;
        @JsonProperty("quote_type")
        private String quoteType;
        @JsonProperty("full_time_employees")
        private Integer fullTimeEmployees;
        private String source;
    }

    @Data
    static class MarketQuoteDto {
        private String symbol;
        @JsonProperty("market_state")
        private String marketState;
        @JsonProperty("exchange_timezone")
        private String exchangeTimezone;
        @JsonProperty("previous_close")
        private Double previousClose;
        @JsonProperty("regular_price")
        private Double regularPrice;
        @JsonProperty("regular_change")
        private Double regularChange;
        @JsonProperty("regular_change_percent")
        private Double regularChangePercent;
        @JsonProperty("regular_timestamp")
        private String regularTimestamp;
        @JsonProperty("pre_market_price")
        private Double preMarketPrice;
        @JsonProperty("pre_market_change")
        private Double preMarketChange;
        @JsonProperty("pre_market_change_percent")
        private Double preMarketChangePercent;
        @JsonProperty("pre_market_timestamp")
        private String preMarketTimestamp;
        @JsonProperty("post_market_price")
        private Double postMarketPrice;
        @JsonProperty("post_market_change")
        private Double postMarketChange;
        @JsonProperty("post_market_change_percent")
        private Double postMarketChangePercent;
        @JsonProperty("post_market_timestamp")
        private String postMarketTimestamp;
        private Boolean delayed;
        private String source;
    }
}