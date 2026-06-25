package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/**
 * REST controller that proxies technical analysis requests to the FastAPI data-service.
 *
 * <p>Results are cached in Redis under {@code technicalCache} (5 minutes TTL)
 * to avoid hammering the data-service on every panel render.</p>
 *
 * <p>Endpoints:
 * <ul>
 *   <li>GET /api/v1/technical/{symbol}?interval=1d&range=3mo  — full indicator set</li>
 *   <li>GET /api/v1/technical/{symbol}/signals                — BUY/HOLD/SELL signal</li>
 * </ul>
 * </p>
 */
@RestController
@RequestMapping("/api/v1/technical")
@RequiredArgsConstructor
@Slf4j
public class TechnicalController {

    private final TechnicalAnalysisPort technicalAnalysisPort;

    @GetMapping("/{symbol}")
    @Cacheable(value = "technicalCache", key = "#symbol.toUpperCase() + ':' + #interval + ':' + #range")
    public TechnicalAnalysisPort.TechnicalAnalysisResult getTechnicalAnalysis(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "3mo") String range) {
        log.info("Fetching technical analysis for {} interval={} range={}", symbol, interval, range);
        return technicalAnalysisPort.fetchTechnicalAnalysis(symbol.toUpperCase(), interval, range)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Technical analysis unavailable for " + symbol));
    }

    @GetMapping("/{symbol}/signals")
    @Cacheable(value = "technicalCache", key = "'sig:' + #symbol.toUpperCase() + ':' + #interval + ':' + #range")
    public TechnicalAnalysisPort.TechnicalAnalysisResult getTechnicalSignals(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "1d") String interval,
            @RequestParam(defaultValue = "3mo") String range) {
        log.info("Fetching technical signals for {}", symbol);
        return technicalAnalysisPort.fetchTechnicalSignals(symbol.toUpperCase(), interval, range)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Technical signals unavailable for " + symbol));
    }
}
