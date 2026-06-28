package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.EarningsEvent;
import com.ozkaslibasar.financeproject.domain.model.EconomicEvent;
import com.ozkaslibasar.financeproject.domain.model.MacroSnapshot;
import com.ozkaslibasar.financeproject.domain.model.MarketCalendar;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.List;

@Tag(name = "Market Calendar", description = "Macro snapshot and market calendar data")
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MarketCalendarController {

    private final MarketCalendarPort marketCalendarPort;

    @Operation(summary = "Fetch FRED macro snapshot")
    @GetMapping("/macro/snapshot")
    public MacroSnapshot getMacroSnapshot() {
        return marketCalendarPort.fetchMacroSnapshot()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Macro snapshot unavailable"
                ));
    }

    @Operation(summary = "Fetch combined market calendar")
    @GetMapping("/calendar")
    public MarketCalendar getMarketCalendar(@RequestParam(required = false) String symbols) {
        return marketCalendarPort.fetchMarketCalendar(parseSymbols(symbols));
    }

    @Operation(summary = "Fetch earnings calendar")
    @GetMapping("/calendar/earnings")
    public List<EarningsEvent> getEarningsCalendar(@RequestParam(required = false) String symbols) {
        return marketCalendarPort.fetchEarnings(parseSymbols(symbols));
    }

    @Operation(summary = "Fetch high-impact economic events")
    @GetMapping("/calendar/economic-events")
    public List<EconomicEvent> getEconomicEvents() {
        return marketCalendarPort.fetchEconomicEvents();
    }

    private List<String> parseSymbols(String symbols) {
        if (symbols == null || symbols.isBlank()) {
            return List.of();
        }
        return Arrays.stream(symbols.split(","))
                .map(String::trim)
                .filter(symbol -> !symbol.isBlank())
                .map(String::toUpperCase)
                .toList();
    }
}