package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubNewsDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Tag(name = "News", description = "Symbol news endpoints")
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
@Slf4j
public class NewsController {

    private final FinnhubClient finnhubClient;

    @Operation(summary = "GET News endpoint", description = "Implements the GET operation for the News API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/{symbol}")
    @Cacheable(value = "newsCache", key = "#symbol")
    public List<FinnhubNewsDto> getNews(@PathVariable String symbol) {
        log.info("Fetching news for symbol: {}", symbol);
        
        // Fetch news for the last 7 days
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(7);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        
        return finnhubClient.getCompanyNews(
                symbol.toUpperCase(), 
                from.format(formatter), 
                to.format(formatter)
        );
    }
}
