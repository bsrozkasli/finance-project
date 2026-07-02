package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PriceRefreshServiceTest {

    @Mock
    private PriceRepositoryPort priceRepository;

    @Mock
    private FinancialDataPort financialDataPort;

    @InjectMocks
    private PriceRefreshService priceRefreshService;

    @Test
    void shouldFetchPersistAndReturnLatestProviderPrice() {
        PriceHistory fetched = price("AAPL", "110", Instant.now());
        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.empty());
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of(fetched));

        Optional<PriceHistory> result = priceRefreshService.getFreshLatest(" aapl ");

        assertThat(result).contains(fetched);
        verify(priceRepository).saveAll(List.of(fetched));
    }

    @Test
    void shouldReturnExistingLatestWhenProviderHasNoFreshRows() {
        PriceHistory existing = price("AAPL", "100", Instant.now().minusSeconds(60));
        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.of(existing));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of());

        Optional<PriceHistory> result = priceRefreshService.getFreshLatest("AAPL");

        assertThat(result).contains(existing);
        verify(priceRepository, never()).saveAll(any());
    }

    @Test
    void shouldMergeAndPersistFreshHistoryForLiveRange() {
        PriceHistory local = price("NVDA", "200", Instant.now().minusSeconds(2 * 86400L));
        PriceHistory fetched = price("NVDA", "210", Instant.now().minusSeconds(60));
        when(priceRepository.findByAssetIdAndPeriod(eq("NVDA"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(local));
        when(financialDataPort.fetchPriceHistory("NVDA", "1d", "5d")).thenReturn(List.of(fetched));

        List<PriceHistory> result = priceRefreshService.getFreshHistory("nvda", "1d", "5d");

        assertThat(result).extracting(PriceHistory::close)
                .containsExactly(local.close(), fetched.close());
        verify(priceRepository).saveAll(List.of(fetched));
    }

    private PriceHistory price(String symbol, String close, Instant timestamp) {
        BigDecimal value = new BigDecimal(close);
        return new PriceHistory(
                symbol,
                value,
                value,
                value,
                value,
                BigDecimal.valueOf(1000),
                timestamp);
    }
}
