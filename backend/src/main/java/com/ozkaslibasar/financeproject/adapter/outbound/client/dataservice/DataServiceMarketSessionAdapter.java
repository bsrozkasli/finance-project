package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketSessionPort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Arrays;
import java.util.List;

@Component
@Slf4j
public class DataServiceMarketSessionAdapter implements MarketSessionPort {
    private final RestTemplate restTemplate;
    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceMarketSessionAdapter(RestTemplate restTemplate) { this.restTemplate = restTemplate; }

    @Override
    public List<MarketSession> fetchSessions(List<String> exchanges) {
        try {
            String url = UriComponentsBuilder.fromHttpUrl(baseUrl + "/api/v1/market/sessions")
                    .queryParam("exchanges", String.join(",", exchanges)).toUriString();
            ResponseDto response = restTemplate.getForObject(url, ResponseDto.class);
            if (response == null || response.sessions == null) return List.of();
            return Arrays.stream(response.sessions).map(item -> new MarketSession(
                    item.exchange, item.state, item.timezone, item.nextOpen, item.nextClose, item.source)).toList();
        } catch (Exception exc) {
            log.warn("Failed to fetch market sessions: {}", exc.getMessage());
            return List.of();
        }
    }

    @Data
    static class ResponseDto { private SessionDto[] sessions; }

    @Data
    static class SessionDto {
        private String exchange;
        private String state;
        private String timezone;
        @JsonProperty("next_open") private String nextOpen;
        @JsonProperty("next_close") private String nextClose;
        private String source;
    }
}