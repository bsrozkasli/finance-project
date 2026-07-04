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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;

@Tag(name = "Prices", description = "Latest price and historical OHLCV endpoints")
@RestController
@RequestMapping("/api/v1/prices")
@RequiredArgsConstructor
public class PriceController {

    private final PriceRefreshService priceRefreshService;
    private final RestMapper mapper;

    @Operation(summary = "GET Prices endpoint", description = "Implements the GET operation for the Prices API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/{symbol}/latest")
    @Cacheable(value = "priceCache", key = "'latest:' + #symbol.toUpperCase()")
    public PriceResponseDto getLatestPrice(@PathVariable String symbol) {
        PriceHistory latest = priceRefreshService.getFreshLatest(symbol.toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price not found"));
        return mapper.toPriceResponseDto(latest);
    }

    @Operation(summary = "GET Prices endpoint", description = "Implements the GET operation for the Prices API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
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
}
