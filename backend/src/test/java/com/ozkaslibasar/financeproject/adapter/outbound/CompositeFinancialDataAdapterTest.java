package com.ozkaslibasar.financeproject.adapter.outbound;

import com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice.DataServicePriceAdapter;
import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooFinancePriceAdapter;
import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooStatementClientAdapter;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CompositeFinancialDataAdapterTest {

    private final YahooFinancePriceAdapter yahoo = mock(YahooFinancePriceAdapter.class);
    private final DataServicePriceAdapter dataService = mock(DataServicePriceAdapter.class);
    private final CompositeFinancialDataAdapter adapter = new CompositeFinancialDataAdapter(
            mock(YahooStatementClientAdapter.class), yahoo, dataService, new SimpleMeterRegistry());

    @Test
    void returnsDataServiceRowsWhenYahooThrows() {
        List<PriceHistory> providerRows = List.of(new PriceHistory(
                "AAPL", new BigDecimal("10"), new BigDecimal("12"), new BigDecimal("9"),
                new BigDecimal("11"), new BigDecimal("1000"), LocalDateTime.of(2026, 1, 1, 0, 0)));
        when(yahoo.fetchPriceHistory("AAPL", "1d", "5d"))
                .thenThrow(new IllegalStateException("Yahoo unavailable"));
        when(dataService.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(providerRows);

        List<PriceHistory> result = adapter.fetchPriceHistory("AAPL", "1d", "5d");

        assertThat(result).isSameAs(providerRows);
        verify(dataService).fetchPriceHistory("AAPL", "1d", "5d");
    }

    @Test
    void returnsEmptyWhenYahooThrowsAndDataServiceIsUnavailable() {
        when(yahoo.fetchPriceHistory("AAPL", "1d", "5d"))
                .thenThrow(new IllegalStateException("Yahoo unavailable"));
        // The data-service adapter represents provider failure with an empty list.
        when(dataService.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of());

        List<PriceHistory> result = adapter.fetchPriceHistory("AAPL", "1d", "5d");

        assertThat(result).isEmpty();
        verify(dataService).fetchPriceHistory("AAPL", "1d", "5d");
    }
}
