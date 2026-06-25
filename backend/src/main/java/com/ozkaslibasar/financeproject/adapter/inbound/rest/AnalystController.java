package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubPriceTargetDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubRecommendationDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
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
    @GetMapping("/{symbol}/recommendations")
    @Cacheable(value = "analystCache", key = "'rec:' + #symbol.toUpperCase()")
    public List<FinnhubRecommendationDto> getRecommendations(@PathVariable String symbol) {
        log.info("Fetching analyst recommendations for: {}", symbol);
        return finnhubClient.getRecommendations(symbol.toUpperCase());
    }

    /**
     * Returns the analyst price target consensus (mean, median, high, low).
     */
    @GetMapping("/{symbol}/price-target")
    @Cacheable(value = "analystCache", key = "'pt:' + #symbol.toUpperCase()")
    public FinnhubPriceTargetDto getPriceTarget(@PathVariable String symbol) {
        log.info("Fetching price target for: {}", symbol);
        return finnhubClient.getPriceTarget(symbol.toUpperCase());
    }
}
