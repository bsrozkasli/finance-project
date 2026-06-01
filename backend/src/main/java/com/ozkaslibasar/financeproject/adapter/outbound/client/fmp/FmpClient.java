package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpHistoricalPriceDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpAssetProfileDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpIncomeStatementDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto.FmpBalanceSheetDto;

import java.util.List;

/**
 * OpenFeign Client for Financial Modeling Prep (FMP) stable API.
 *
 * <p>The legacy v3 endpoints were deprecated by FMP on August 31, 2025.
 * All methods here use the current "/stable" API.</p>
 *
 * <p>All FMP calls are protected by {@code @RateLimiter(name = "fmpApi")} (250 req/day)
 * and {@code @CircuitBreaker(name = "fmpApi")} per CONTRIBUTING.md requirements.</p>
 */
@FeignClient(name = "fmpClient", url = "${fmp.api.url:https://financialmodelingprep.com/stable}")
public interface FmpClient {

    /**
     * GET /stable/historical-price-eod/full?symbol={symbol}&apikey={apiKey}
     * Returns a flat list of OHLCV records in descending date order.
     */
    @GetMapping("/historical-price-eod/full")
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    List<FmpHistoricalPriceDto> getHistoricalPrices(
            @RequestParam("symbol") String symbol,
            @RequestParam("apikey") String apiKey
    );

    /**
     * GET /stable/search-symbol?query={symbol}&limit=1&apikey={apiKey}
     * Returns asset metadata (symbol, name, currency, exchange).
     */
    @GetMapping("/search-symbol")
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    List<FmpAssetProfileDto> searchSymbol(
            @RequestParam("query") String symbol,
            @RequestParam("limit") int limit,
            @RequestParam("apikey") String apiKey
    );

    /**
     * GET /stable/income-statement?symbol={symbol}&period={period}&limit={limit}&apikey={apiKey}
     *
     * @param period {@code "annual"} or {@code "quarter"}
     * @param limit  number of periods to return (e.g. 20 for ~5 years quarterly)
     */
    @GetMapping("/income-statement")
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    List<FmpIncomeStatementDto> getIncomeStatements(
            @RequestParam("symbol") String symbol,
            @RequestParam("period") String period,
            @RequestParam("limit") int limit,
            @RequestParam("apikey") String apiKey
    );

    /**
     * GET /stable/balance-sheet-statement?symbol={symbol}&period={period}&limit={limit}&apikey={apiKey}
     *
     * @param period {@code "annual"} or {@code "quarter"}
     * @param limit  number of periods to return
     */
    @GetMapping("/balance-sheet-statement")
    @RateLimiter(name = "fmpApi")
    @CircuitBreaker(name = "fmpApi")
    List<FmpBalanceSheetDto> getBalanceSheets(
            @RequestParam("symbol") String symbol,
            @RequestParam("period") String period,
            @RequestParam("limit") int limit,
            @RequestParam("apikey") String apiKey
    );
}
