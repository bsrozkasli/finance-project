package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;

import java.util.List;
import java.util.Objects;

/**
 * Domain service (use case) responsible for orchestrating price data ingestion.
 *
 * <p>This class is pure Java — it has no Spring, JPA, or any other framework dependency.
 * It drives all outbound interactions exclusively through port interfaces, keeping the
 * domain layer isolated from infrastructure concerns.</p>
 *
 * <p>The scheduled trigger lives in the adapter layer and calls
 * {@link #ingestAll()} directly — per the project's rule that
 * {@code @Scheduled} methods may contain only a single service call.</p>
 */
public class PriceIngestionUseCase {

    private final AssetRepositoryPort    assetRepository;
    private final PriceRepositoryPort    priceRepository;
    private final FinancialDataClientPort dataClient;

    /**
     * Constructs the use case with all required outbound ports.
     *
     * @param assetRepository the port for reading registered assets
     * @param priceRepository the port for persisting price records
     * @param dataClient      the port for fetching data from the external provider
     */
    public PriceIngestionUseCase(
            AssetRepositoryPort     assetRepository,
            PriceRepositoryPort     priceRepository,
            FinancialDataClientPort dataClient) {

        this.assetRepository = Objects.requireNonNull(assetRepository, "assetRepository must not be null");
        this.priceRepository  = Objects.requireNonNull(priceRepository,  "priceRepository must not be null");
        this.dataClient       = Objects.requireNonNull(dataClient,       "dataClient must not be null");
    }

    /**
     * Triggers price ingestion for every asset currently registered in the system.
     *
     * <p>Called once per day by the {@code @Scheduled} adapter job.
     * Assets with no prices returned by the external provider are silently skipped.</p>
     */
    public void ingestAll() {
        List<Asset> assets = assetRepository.findAll();
        assets.forEach(asset -> ingestForSymbol(asset.symbol()));
    }

    /**
     * Fetches and persists the latest price history for a single asset symbol.
     *
     * <p>If the external provider returns an empty response, no write is performed —
     * ensuring that the database is never overwritten with empty data.</p>
     *
     * @param symbol the ticker symbol to ingest (e.g. {@code "AAPL"})
     * @throws NullPointerException if {@code symbol} is {@code null}
     */
    public void ingestForSymbol(String symbol) {
        Objects.requireNonNull(symbol, "symbol must not be null");

        List<PriceHistory> prices = dataClient.fetchPriceHistory(symbol);
        if (!prices.isEmpty()) {
            priceRepository.saveAll(prices);
        }
    }
}
