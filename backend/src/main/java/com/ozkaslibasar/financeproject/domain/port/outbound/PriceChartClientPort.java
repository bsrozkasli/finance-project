package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port — contract for fetching real-time and historical price data
 * from a chart-based financial data provider (e.g. Yahoo Finance Chart API).
 *
 * <p>This port is intentionally separated from {@link FinancialStatementClientPort}
 * to respect the rate limits of each provider: Yahoo Finance is free and unlimited
 * for price data, while FMP is reserved exclusively for fundamental statements.</p>
 *
 * <p>Rate-limiting and circuit-breaker annotations ({@code @RateLimiter},
 * {@code @CircuitBreaker}) are applied in the adapter implementation,
 * never in this domain-layer interface.</p>
 */
public interface PriceChartClientPort {

    /**
     * Fetches OHLCV price history for the given symbol.
     *
     * @param symbol   the ticker symbol (e.g. {@code "AAPL"}, {@code "THYAO.IS"})
     * @param interval the data interval (e.g. {@code "1d"}, {@code "1h"}, {@code "5m"})
     * @param range    the historical range (e.g. {@code "1mo"}, {@code "6mo"}, {@code "1y"})
     * @return a list of price records ordered by timestamp ascending;
     *         returns an empty list — never {@code null} — if no data is available
     */
    List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range);

    /**
     * Fetches basic asset metadata (name, type) for bootstrap purposes.
     *
     * <p>Used when a new symbol is registered to populate the asset record
     * before any dedicated profile API call is made.</p>
     *
     * @param symbol the ticker symbol to look up
     * @return an {@link Optional} containing the asset details, or empty if not found
     */
    Optional<Asset> fetchAssetInfo(String symbol);
}
