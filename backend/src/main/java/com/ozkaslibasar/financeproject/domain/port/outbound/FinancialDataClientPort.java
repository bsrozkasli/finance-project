package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;

import java.util.List;
import java.util.Optional;

/**
 * Outbound port — contract for fetching financial data from an external provider.
 *
 * <p>The concrete implementation (Financial Modeling Prep Feign client) lives in
 * {@code adapter/outbound/client}. Rate-limiting and circuit-breaker annotations
 * are applied there, never here in the domain.</p>
 */
public interface FinancialDataClientPort {

    /**
     * Fetches the most recent daily OHLCV price history for the given symbol.
     *
     * @param symbol the ticker symbol to look up (e.g. {@code "AAPL"})
     * @return a list of price history records ordered by timestamp descending;
     *         returns an empty list — never {@code null} — if no data is available
     */
    List<PriceHistory> fetchPriceHistory(String symbol);

    /**
     * Fetches metadata for the given symbol from the external provider.
     *
     * @param symbol the ticker symbol to look up
     * @return an {@link Optional} containing the asset details, or empty if not found
     */
    Optional<Asset> fetchAssetInfo(String symbol);
}
