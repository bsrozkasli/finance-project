package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubPriceTargetDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubRecommendationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for analyst recommendations and price targets.
 *
 * <p>All data is sourced from Finnhub (primary) via the rate-limited
 * {@link FinnhubClient}. Results are cached in Redis:
 * <ul>
 *   <li>Recommendations: 6 hours (analystCache)</li>
 *   <li>Price targets: 6 hours (analystCache)</li>
 * </ul>
 * </p>
 */
@Tag(name = "Analyst Data", description = "Analyst recommendations and price targets")
@RestController
@RequestMapping("/api/v1/analyst")
@RequiredArgsConstructor
@Slf4j
public class AnalystController {

    private final FinnhubClient finnhubClient;

    /**
     * Returns the last 4 months of analyst recommendation trends
     * (strongBuy, buy, hold, sell, strongSell counts per period).
     */
    @Operation(summary = "GET Analyst Data endpoint", description = "Implements the GET operation for the Analyst Data API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/{symbol}/recommendations")
    @Cacheable(value = "analystCache", key = "'rec:' + #symbol.toUpperCase()")
    public List<FinnhubRecommendationDto> getRecommendations(@PathVariable String symbol) {
        log.info("Fetching analyst recommendations for: {}", symbol);
        try {
            List<FinnhubRecommendationDto> result = finnhubClient.getRecommendations(symbol.toUpperCase());
            // Normalize null provider response to empty list to honour list-contract.
            return result != null ? result : List.of();
        } catch (Exception e) {
            // Provider unavailable: degrade gracefully with empty list (200 []).
            log.warn("Recommendation provider unavailable for {}: {}", symbol, e.getMessage());
            return List.of();
        }
    }

    /**
     * Returns the analyst price target consensus (mean, median, high, low).
     */
    @Operation(summary = "GET Analyst Data endpoint", description = "Implements the GET operation for the Analyst Data API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/{symbol}/price-target")
    @Cacheable(value = "analystCache", key = "'pt:' + #symbol.toUpperCase()")
    public ResponseEntity<?> getPriceTarget(@PathVariable String symbol) {
        log.info("Fetching price target for: {}", symbol);
        try {
            return ResponseEntity.ok(finnhubClient.getPriceTarget(symbol.toUpperCase()));
        } catch (Exception e) {
            // Provider unavailable: degrade gracefully with JSON null (200 null body).
            log.warn("Price target provider unavailable for {}: {}", symbol, e.getMessage());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("null");
        }
    }
}
