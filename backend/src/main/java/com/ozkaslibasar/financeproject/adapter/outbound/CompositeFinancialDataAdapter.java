package com.ozkaslibasar.financeproject.adapter.outbound;

import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServicePriceAdapter;
import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooFinancePriceAdapter;
import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooStatementClientAdapter;
import com.ozkaslibasar.financeproject.domain.model.FinancialStatement;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.service.FinancialStatementMerger;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

/**
 * Hybrid financial data adapter: Yahoo-backed statements + Yahoo/data-service price fallback.
 *
 * <p>Replaces the legacy FMP-based composite. Financial statements are now fetched
 * from the local FastAPI data-service (which proxies yfinance), keeping the
 * provider-agnostic contract intact.</p>
 */
@Component
@Primary
@RequiredArgsConstructor
public class CompositeFinancialDataAdapter implements FinancialDataPort {

    private final YahooStatementClientAdapter yahooStatementClient;
    private final YahooFinancePriceAdapter yahooFinancePriceAdapter;
    private final DataServicePriceAdapter dataServicePriceAdapter;

    @Override
    public List<FinancialStatement> fetchStatements(String symbol) {
        return FinancialStatementMerger.merge(
                yahooStatementClient.fetchIncomeStatements(symbol),
                yahooStatementClient.fetchBalanceSheets(symbol)
        );
    }

    @Override
    public List<PriceHistory> fetchPriceHistory(String symbol, String interval, String range) {
        List<PriceHistory> yahoo = yahooFinancePriceAdapter.fetchPriceHistory(symbol, interval, range);
        if (!yahoo.isEmpty()) {
            return yahoo;
        }
        List<PriceHistory> dataService = dataServicePriceAdapter.fetchPriceHistory(symbol, interval, range);
        return dataService != null ? dataService : Collections.emptyList();
    }
}
