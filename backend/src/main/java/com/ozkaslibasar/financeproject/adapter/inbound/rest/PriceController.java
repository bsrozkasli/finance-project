package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.inbound.rest.dto.PriceResponseDto;
import com.ozkaslibasar.financeproject.adapter.inbound.rest.mapper.RestMapper;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Tag(name = "Prices", description = "Latest price and historical OHLCV endpoints")
@RestController
@RequestMapping("/api/v1/prices")
@RequiredArgsConstructor
public class PriceController {

    private final PriceRefreshService priceRefreshService;
    private final RestMapper mapper;

    @Operation(summary = "GET Prices endpoint", description = "Returns the latest price for a symbol.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "404", description = "Price not found for the given symbol"),
            @ApiResponse(responseCode = "500", description = "Mapping failure"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}/latest")
    @Cacheable(value = "priceCache", key = "'latest:' + #symbol.toUpperCase()")
    public PriceResponseDto getLatestPrice(@PathVariable String symbol) {
        PriceHistory latest = priceRefreshService.getFreshLatest(symbol.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price not found"));
        try {
            return mapper.toPriceResponseDto(latest);
        } catch (RuntimeException e) {
            // Mapper failure is a local technical error (500), not an upstream dependency failure (503).
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Price mapping failed", e);
        }
    }

    @Operation(summary = "GET Price history endpoint", description = "Returns OHLCV history for a symbol.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}/history")
    @Cacheable(value = "priceCache", key = "'hist:' + #symbol.toUpperCase() + ':' + #interval + ':' + #range")
    public List<PriceResponseDto> getPriceHistory(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "1mo") String range) {
        return mapper.toPriceResponseDtoList(priceRefreshService.getFreshHistory(symbol.toUpperCase(Locale.ROOT), interval, range));
    }

    @Operation(summary = "POST Prices batch-history endpoint", description = "Returns historical OHLCV candles for multiple symbols while preserving per-symbol provider degradation.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @PostMapping("/batch-history")
    public Map<String, List<PriceResponseDto>> getBatchPriceHistory(@RequestBody BatchPriceHistoryRequest request) {
        if (request == null) {
            return Map.of();
        }
        String interval = request.interval() == null || request.interval().isBlank() ? "1d" : request.interval();
        String range = request.range() == null || request.range().isBlank() ? "1mo" : request.range();
        Map<String, List<PriceResponseDto>> response = new LinkedHashMap<>();

        if (request.symbols() == null || request.symbols().isEmpty()) {
            return response;
        }

        request.symbols().stream()
                .filter(symbol -> symbol != null && !symbol.isBlank())
                .map(symbol -> symbol.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .forEach(symbol -> response.put(symbol, fetchHistoryForBatch(symbol, interval, range)));

        return response;
    }

    private List<PriceResponseDto> fetchHistoryForBatch(String symbol, String interval, String range) {
        try {
            return mapper.toPriceResponseDtoList(priceRefreshService.getFreshHistory(symbol, interval, range));
        } catch (RuntimeException ex) {
            return List.of();
        }
    }

    public record BatchPriceHistoryRequest(List<String> symbols, String interval, String range) {
    }
}
