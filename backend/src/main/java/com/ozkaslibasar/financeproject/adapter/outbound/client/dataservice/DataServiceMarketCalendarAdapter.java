package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ozkaslibasar.financeproject.domain.model.EarningsEvent;
import com.ozkaslibasar.financeproject.domain.model.EconomicEvent;
import com.ozkaslibasar.financeproject.domain.model.MacroSnapshot;
import com.ozkaslibasar.financeproject.domain.model.MarketCalendar;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
@Slf4j
public class DataServiceMarketCalendarAdapter implements MarketCalendarPort {

    private final RestTemplate restTemplate;

    @Value("${data-service.base-url:http://localhost:8000}")
    private String baseUrl;

    public DataServiceMarketCalendarAdapter(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public Optional<MacroSnapshot> fetchMacroSnapshot() {
        try {
            MacroSnapshotDto dto = restTemplate.getForObject(baseUrl + "/api/v1/macro/snapshot", MacroSnapshotDto.class);
            if (dto == null || dto.hasNoMacroValues()) {
                return Optional.empty();
            }
            return Optional.of(dto.toDomain());
        } catch (Exception exc) {
            log.warn("Failed to fetch macro snapshot from data-service: {}", exc.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public MarketCalendar fetchMarketCalendar(List<String> symbols) {
        try {
            String url = calendarUrl("/api/v1/calendar", symbols);
            MarketCalendarDto dto = restTemplate.getForObject(url, MarketCalendarDto.class);
            if (dto == null) {
                return new MarketCalendar(List.of(), List.of(), Instant.now());
            }
            return dto.toDomain();
        } catch (Exception exc) {
            log.warn("Failed to fetch market calendar from data-service: {}", exc.getMessage());
            return new MarketCalendar(List.of(), List.of(), Instant.now());
        }
    }

    @Override
    public List<EarningsEvent> fetchEarnings(List<String> symbols) {
        try {
            String url = calendarUrl("/api/v1/calendar/earnings", symbols);
            EarningsEventDto[] response = restTemplate.getForObject(url, EarningsEventDto[].class);
            if (response == null) {
                return List.of();
            }
            return Arrays.stream(response).map(EarningsEventDto::toDomain).toList();
        } catch (Exception exc) {
            log.warn("Failed to fetch earnings calendar from data-service: {}", exc.getMessage());
            return List.of();
        }
    }

    @Override
    public List<EconomicEvent> fetchEconomicEvents() {
        try {
            EconomicEventDto[] response = restTemplate.getForObject(baseUrl + "/api/v1/calendar/economic-events", EconomicEventDto[].class);
            if (response == null) {
                return List.of();
            }
            return Arrays.stream(response).map(EconomicEventDto::toDomain).toList();
        } catch (Exception exc) {
            log.warn("Failed to fetch economic calendar from data-service: {}", exc.getMessage());
            return List.of();
        }
    }

    private String calendarUrl(String path, List<String> symbols) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(baseUrl + path);
        if (symbols != null && !symbols.isEmpty()) {
            builder.queryParam("symbols", String.join(",", symbols));
        }
        return builder.toUriString();
    }

    @Data
    static class MacroSnapshotDto {
        @JsonProperty("fed_funds_rate")
        private BigDecimal fedFundsRate;
        private BigDecimal cpi;
        @JsonProperty("cpi_yoy")
        private BigDecimal cpiYoy;
        @JsonProperty("gdp_growth")
        private BigDecimal gdpGrowth;
        @JsonProperty("unemployment_rate")
        private BigDecimal unemploymentRate;
        @JsonProperty("treasury_10y")
        private BigDecimal treasury10y;
        @JsonProperty("treasury_2y")
        private BigDecimal treasury2y;
        @JsonProperty("yield_curve_spread")
        private BigDecimal yieldCurveSpread;
        @JsonProperty("observed_at")
        private String observedAt;
        @JsonProperty("cached_at")
        private Instant cachedAt;

        boolean hasNoMacroValues() {
            return fedFundsRate == null
                    && cpi == null
                    && cpiYoy == null
                    && gdpGrowth == null
                    && unemploymentRate == null
                    && treasury10y == null
                    && treasury2y == null
                    && yieldCurveSpread == null;
        }

        MacroSnapshot toDomain() {
            return new MacroSnapshot(
                    fedFundsRate,
                    cpi,
                    cpiYoy,
                    gdpGrowth,
                    unemploymentRate,
                    treasury10y,
                    treasury2y,
                    yieldCurveSpread,
                    observedAt,
                    cachedAt != null ? cachedAt : Instant.now()
            );
        }
    }

    @Data
    static class EarningsEventDto {
        private String symbol;
        private String date;
        @JsonProperty("eps_estimate")
        private BigDecimal epsEstimate;
        @JsonProperty("eps_actual")
        private BigDecimal epsActual;
        @JsonProperty("revenue_estimate")
        private BigDecimal revenueEstimate;
        @JsonProperty("revenue_actual")
        private BigDecimal revenueActual;
        private String time;

        EarningsEvent toDomain() {
            return new EarningsEvent(symbol, date, epsEstimate, epsActual, revenueEstimate, revenueActual, time);
        }
    }

    @Data
    static class EconomicEventDto {
        private String event;
        private String date;
        private String country;
        private String impact;
        private Object actual;
        private Object estimate;
        private Object previous;

        EconomicEvent toDomain() {
            return new EconomicEvent(event, date, country, impact, actual, estimate, previous);
        }
    }

    @Data
    static class MarketCalendarDto {
        private List<EarningsEventDto> earnings = List.of();
        @JsonProperty("economic_events")
        private List<EconomicEventDto> economicEvents = List.of();
        @JsonProperty("cached_at")
        private Instant cachedAt;

        MarketCalendar toDomain() {
            return new MarketCalendar(
                    earnings == null ? List.of() : earnings.stream().map(EarningsEventDto::toDomain).toList(),
                    economicEvents == null ? List.of() : economicEvents.stream().map(EconomicEventDto::toDomain).toList(),
                    cachedAt != null ? cachedAt : Instant.now()
            );
        }
    }
}