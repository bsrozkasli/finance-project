package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;

import java.util.List;

/**
 * Outbound port for hybrid financial data fetching.
 */
public interface FinancialDataPort {

    List<FinancialStatement> fetchStatements(String symbol);

    List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range);
}
