package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;

import java.util.List;
import java.util.Objects;

/**
 * Pure domain service responsible for orchestrating price data ingestion
 * from the Yahoo Finance Chart API.
 *
 * <p>This class is pure Java — it carries no Spring, JPA, or any other
 * framework annotation. It interacts exclusively through port interfaces,
 * keeping the domain layer isolated from infrastructure concerns.</p>
 *
 * <p>The scheduled trigger lives in the adapter layer ({@code PriceIngestionJob})
 * and calls {@link #ingestAll()} — per the rule that {@code @Scheduled} methods
 * may contain only a single service call.</p>
 *
 * <p>Default interval/range values mirror common usage:
 * {@code interval="1d"}, {@code range="1y"}. Callers can override these
 * via {@link #ingestForSymbol(String, String, String)}.</p>
 */
public class PriceIngestionService {

    /** Default yfinance-compatible bar interval. */
    public static final String DEFAULT_INTERVAL = "1d";

    /** Default yfinance-compatible lookback range. */
    public static final String DEFAULT_RANGE = "1y";

    private final AssetRepositoryPort    assetRepository;
    private final PriceRepositoryPort    priceRepository;
    private final PriceChartClientPort   chartClient;

    /**
     * Constructs the service with all required outbound ports.
     *
     * @param assetRepository the port for reading registered assets
     * @param priceRepository the port for persisting price records
     * @param chartClient     the port for fetching price data from Yahoo Finance
     */
    public PriceIngestionService(
            AssetRepositoryPort  assetRepository,
            PriceRepositoryPort  priceRepository,
            PriceChartClientPort chartClient) {

        this.assetRepository = Objects.requireNonNull(assetRepository, "assetRepository must not be null");
        this.priceRepository  = Objects.requireNonNull(priceRepository,  "priceRepository must not be null");
        this.chartClient       = Objects.requireNonNull(chartClient,      "chartClient must not be null");
    }

    /**
     * Triggers price ingestion for every asset currently registered in the system
     * using the default interval ({@value #DEFAULT_INTERVAL}) and
     * range ({@value #DEFAULT_RANGE}).
     *
     * <p>Called once per day by the {@code @Scheduled} adapter job.
     * Assets with no prices returned by Yahoo are silently skipped.</p>
     */
    public void ingestAll() {
        List<Asset> assets = assetRepository.findAll();
        assets.forEach(asset ->
                ingestForSymbol(asset.symbol(), DEFAULT_INTERVAL, DEFAULT_RANGE));
    }

    /**
     * Fetches and persists the price history for a single asset symbol.
     *
     * <p>If Yahoo returns an empty response, no write is performed —
     * ensuring that the database is never overwritten with empty data.</p>
     *
     * @param symbol   the ticker symbol (e.g. {@code "AAPL"}, {@code "THYAO.IS"})
     * @param interval bar size (e.g. {@code "1d"}, {@code "1h"})
     * @param range    lookback window (e.g. {@code "1mo"}, {@code "1y"})
     * @throws NullPointerException if any argument is {@code null}
     */
    public void ingestForSymbol(String symbol, String interval, String range) {
        Objects.requireNonNull(symbol,   "symbol must not be null");
        Objects.requireNonNull(interval, "interval must not be null");
        Objects.requireNonNull(range,    "range must not be null");

        List<PriceHistory> prices = chartClient.fetchPriceHistory(symbol, interval, range);
        if (!prices.isEmpty()) {
            priceRepository.saveAll(prices);
        }
    }
}
