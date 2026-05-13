package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpHistoricalPriceResponseDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpAssetProfileDto;

import java.util.List;

/**
 * OpenFeign Client for Financial Modeling Prep (FMP) API.
 */
@FeignClient(name = "fmpClient", url = "${fmp.api.url:https://financialmodelingprep.com/api/v3}")
public interface FmpClient {

    @GetMapping("/historical-price-full/{symbol}")
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    FmpHistoricalPriceResponseDto getHistoricalPrices(
            @PathVariable("symbol") String symbol,
            @RequestParam("apikey") String apiKey
    );

    @GetMapping("/profile/{symbol}")
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    List<FmpAssetProfileDto> getAssetProfile(
            @PathVariable("symbol") String symbol,
            @RequestParam("apikey") String apiKey
    );
}
