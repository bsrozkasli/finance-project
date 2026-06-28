package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@Tag(name = "Technical Analysis", description = "Technical indicators and signals")
@RestController
@RequestMapping("/api/v1/technical")
@RequiredArgsConstructor
@Slf4j
public class TechnicalController {

    private final TechnicalAnalysisPort technicalAnalysisPort;

    @Operation(summary = "GET Technical Analysis endpoint", description = "Implements the GET operation for the Technical Analysis API described in SPEC.md sections 7 and 8.")
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
    @Cacheable(value = "technicalCache", key = "#symbol.toUpperCase() + ':' + #interval + ':' + #range")
    public TechnicalResponse getTechnicalAnalysis(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "3mo") String range) {
        log.info("Fetching technical analysis for {} interval={} range={}", symbol, interval, range);
        return technicalAnalysisPort.fetchTechnicalAnalysis(symbol.toUpperCase(), interval, range)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Technical analysis unavailable for " + symbol));
    }

    @Operation(summary = "GET Technical Analysis endpoint", description = "Implements the GET operation for the Technical Analysis API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/{symbol}/signals")
    @Cacheable(value = "technicalCache", key = "'sig:' + #symbol.toUpperCase() + ':' + #interval + ':' + #range")
    public TechnicalResponse getTechnicalSignals(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "3mo") String range) {
        log.info("Fetching technical signals for {}", symbol);
        return technicalAnalysisPort.fetchTechnicalSignals(symbol.toUpperCase(), interval, range)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Technical signals unavailable for " + symbol));
    }

    private TechnicalResponse toResponse(TechnicalAnalysisPort.TechnicalAnalysisResult result) {
        return new TechnicalResponse(
                result.symbol(),
                result.timestamp(),
                result.rsi(),
                result.macd(),
                result.macdSignal(),
                result.macdHistogram(),
                result.bbUpper(),
                result.bbMiddle(),
                result.bbLower(),
                result.atr(),
                result.sma(),
                result.ema(),
                result.action(),
                result.confidence());
    }

    public record TechnicalResponse(
            String symbol,
            String timestamp,
            Double rsi,
            Double macd,
            Double macdSignal,
            Double macdHistogram,
            Double bbUpper,
            Double bbMiddle,
            Double bbLower,
            Double atr,
            Double sma,
            Double ema,
            String signalAction,
            Double signalConfidence) {
    }
}