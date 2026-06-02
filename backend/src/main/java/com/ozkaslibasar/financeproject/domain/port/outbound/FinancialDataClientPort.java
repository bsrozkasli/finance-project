package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;

import java.util.List;
import java.util.Optional;

/**
 * Legacy outbound port kept for compatibility with current adapters.
 */
public interface FinancialDataClientPort extends FinancialDataPort {

    List<PriceHistory> fetchPriceHistory(String symbol);

    Optional<Asset> fetchAssetInfo(String symbol);

    @Override
    default List<FinancialStatement> fetchStatements(String symbol) {
        return List.of();
    }

    @Override
    default List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range) {
        return fetchPriceHistory(symbol);
    }
}
