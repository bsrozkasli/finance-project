package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PriceRefreshServiceTest {

    @Mock
    private PriceRepositoryPort priceRepository;

    @Mock
    private FinancialDataPort financialDataPort;

    @Test
    void shouldRejectNullPriceRepositoryInConstructor() {
        assertThatThrownBy(() -> new PriceRefreshService(null, financialDataPort))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("priceRepository");
    }

    @Test
    void shouldRejectNullFinancialDataPortInConstructor() {
        assertThatThrownBy(() -> new PriceRefreshService(priceRepository, null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("financialDataPort");
    }

    @Test
    void shouldNormalizeSymbolForLatestAndHistoryCalls() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory p = price("AAPL", "100", Instant.now().minusSeconds(60));

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.of(p));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of());
        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(p));

        service.getFreshLatest(" aapl ");
        service.getFreshHistory("aApL", "1d", "1mo");

        verify(priceRepository).findLatestByAssetId("AAPL");
        verify(financialDataPort).fetchPriceHistory("AAPL", "1d", "5d");
        verify(priceRepository).findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class));
    }

    @Test
    void shouldRejectBlankOrNullSymbolBeforePortCalls() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);

        assertThatThrownBy(() -> service.getFreshLatest("   "))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbol must not be blank");
        assertThatThrownBy(() -> service.getFreshHistory(null, "1d", "1mo"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("symbol must not be blank");

        verifyNoInteractions(priceRepository, financialDataPort);
    }

    @Test
    void shouldFollowDbFirstOrderForGetFreshLatest() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory fetched = price("AAPL", "111", Instant.now());

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.empty());
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of(fetched));

        service.getFreshLatest("aapl");

        InOrder order = inOrder(priceRepository, financialDataPort, priceRepository);
        order.verify(priceRepository).findLatestByAssetId("AAPL");
        order.verify(financialDataPort).fetchPriceHistory("AAPL", "1d", "5d");
        order.verify(priceRepository).saveAll(List.of(fetched));
    }

    @Test
    void shouldReturnEmptyLatestWhenLocalAndProviderBothEmpty() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.empty());
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of());

        Optional<PriceHistory> result = service.getFreshLatest("AAPL");

        assertThat(result).isEmpty();
        verify(priceRepository, never()).saveAll(any());
    }

    @Test
    void shouldReturnExistingLatestWhenProviderIsNullOrEmpty() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory local = price("AAPL", "100", Instant.now().minusSeconds(300));

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.of(local));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(null);

        Optional<PriceHistory> nullProvider = service.getFreshLatest("AAPL");
        assertThat(nullProvider).contains(local);

        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of());
        Optional<PriceHistory> emptyProvider = service.getFreshLatest("AAPL");
        assertThat(emptyProvider).contains(local);

        verify(priceRepository, never()).saveAll(any());
    }

    @Test
    void shouldReturnNewestPriceFromLocalAndProviderCandidates() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory localOld = price("AAPL", "100", Instant.now().minusSeconds(120));
        PriceHistory providerNew = price("AAPL", "110", Instant.now().minusSeconds(10));

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.of(localOld));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of(providerNew));

        Optional<PriceHistory> result = service.getFreshLatest("aapl");

        assertThat(result).contains(providerNew);
        verify(priceRepository).saveAll(List.of(providerNew));
    }

    @Test
    void shouldSelectNewestWhenProviderRowsAreReverseOrdered() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory older = price("AAPL", "101", Instant.now().minusSeconds(120));
        PriceHistory newest = price("AAPL", "111", Instant.now().minusSeconds(5));

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.empty());
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of(newest, older));

        Optional<PriceHistory> result = service.getFreshLatest("AAPL");

        assertThat(result).contains(newest);
    }

    @Test
    void shouldNotReturnDifferentSymbolFromProviderForLatestRequest() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory local = price("AAPL", "100", Instant.now().minusSeconds(60));
        PriceHistory wrongSymbolNewer = price("MSFT", "999", Instant.now().minusSeconds(1));

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.of(local));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of(wrongSymbolNewer));

        Optional<PriceHistory> result = service.getFreshLatest("AAPL");

        assertThat(result).contains(local);
    }

    @Test
    void shouldUseDefaultIntervalAndRangeWhenMissingAndRefreshNeeded() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of());
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenReturn(List.of());

        service.getFreshHistory("aapl", "  ", null);

        verify(financialDataPort).fetchPriceHistory("AAPL", "1d", "1mo");
    }

    @Test
    void shouldReadRepositoryBeforeProviderForHistoryRefresh() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory fetched = price("AAPL", "100", Instant.now().minusSeconds(60));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of());
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenReturn(List.of(fetched));

        service.getFreshHistory("AAPL", "1d", "1mo");

        InOrder order = inOrder(priceRepository, financialDataPort, priceRepository);
        order.verify(priceRepository).findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class));
        order.verify(financialDataPort).fetchPriceHistory("AAPL", "1d", "1mo");
        order.verify(priceRepository).saveAll(List.of(fetched));
    }

    @Test
    void shouldNotPersistOrReturnDifferentSymbolRowsForHistoryRefresh() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant now = Instant.now();
        PriceHistory local = price("AAPL", "90", now.minus(Duration.ofDays(3)));
        PriceHistory wrongSymbol = price("MSFT", "999", now.minus(Duration.ofDays(1)));
        PriceHistory matchingSymbol = price("AAPL", "110", now.minus(Duration.ofDays(1)));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(local));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo"))
                .thenReturn(List.of(wrongSymbol, matchingSymbol));

        List<PriceHistory> result = service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(result).extracting(PriceHistory::assetId)
                .containsOnly("AAPL");
        assertThat(result).extracting(PriceHistory::close)
                .containsExactly(local.close(), matchingSymbol.close());
        verify(priceRepository).saveAll(List.of(matchingSymbol));
    }
    @Test
    void shouldNotRefreshWhenDailyHistoryIsFreshToday() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant capturedNow = Instant.now();
        LocalDate utcDate = LocalDateTime.ofInstant(capturedNow, ZoneOffset.UTC).toLocalDate();
        Instant todayStartUtc = utcDate.atStartOfDay().toInstant(ZoneOffset.UTC);

        List<PriceHistory> local = List.of(price("AAPL", "100", todayStartUtc));
        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class))).thenReturn(local);

        List<PriceHistory> result = service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(result).containsExactlyElementsOf(local);
        verify(financialDataPort, never()).fetchPriceHistory(any(), any(), any());
        verify(priceRepository, never()).saveAll(any());
    }

    @Test
    void shouldRefreshAndMergeWhenDailyHistoryIsStale() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant now = Instant.now();
        PriceHistory staleLocal = price("AAPL", "90", now.minus(Duration.ofDays(3)));
        PriceHistory inRangeFetched = price("AAPL", "100", now.minus(Duration.ofDays(1)));
        PriceHistory duplicateTimestampFetched = price("AAPL", "95", staleLocal.timestampAsInstant());

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(staleLocal));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo"))
                .thenReturn(List.of(inRangeFetched, duplicateTimestampFetched));

        List<PriceHistory> result = service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).timestampAsInstant()).isBeforeOrEqualTo(result.get(1).timestampAsInstant());
        assertThat(result).extracting(PriceHistory::close)
                .containsExactly(duplicateTimestampFetched.close(), inRangeFetched.close());
        verify(priceRepository).saveAll(List.of(inRangeFetched, duplicateTimestampFetched));
    }

    @Test
    void shouldAlwaysRefreshForLiveRange5dEvenIfLocalLooksFresh() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory localToday = price("AAPL", "100", Instant.now().minusSeconds(120));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(localToday));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of());

        service.getFreshHistory("AAPL", "1d", "5d");

        verify(financialDataPort).fetchPriceHistory("AAPL", "1d", "5d");
    }

    @Test
    void shouldAlwaysRefreshForIntradayIntervals() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory localToday = price("AAPL", "100", Instant.now().minusSeconds(120));
        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(localToday));
        when(financialDataPort.fetchPriceHistory(eq("AAPL"), any(), eq("1mo"))).thenReturn(List.of());

        service.getFreshHistory("AAPL", "1m", "1mo");
        service.getFreshHistory("AAPL", "5m", "1mo");
        service.getFreshHistory("AAPL", "15m", "1mo");
        service.getFreshHistory("AAPL", "30m", "1mo");
        service.getFreshHistory("AAPL", "1h", "1mo");
        service.getFreshHistory("AAPL", "4h", "1mo");

        verify(financialDataPort, times(6)).fetchPriceHistory(eq("AAPL"), any(), eq("1mo"));
    }

    @Test
    void shouldRefreshForMalformedIntervalsEndingWithMOrH() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory localToday = price("AAPL", "100", Instant.now().minusSeconds(120));
        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(localToday));
        when(financialDataPort.fetchPriceHistory(eq("AAPL"), any(), eq("1mo"))).thenReturn(List.of());

        service.getFreshHistory("AAPL", "abc-m", "1mo");
        service.getFreshHistory("AAPL", "0m", "1mo");
        service.getFreshHistory("AAPL", "xm", "1mo");
        service.getFreshHistory("AAPL", "hourh", "1mo");

        verify(financialDataPort, times(4)).fetchPriceHistory(eq("AAPL"), any(), eq("1mo"));
    }

    @Test
    void shouldMapRangesToReasonableRepositoryWindow() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of());
        when(financialDataPort.fetchPriceHistory(eq("AAPL"), any(), any())).thenReturn(List.of());

        assertRangeApproximately(service, "5d", 4, 6);
        assertRangeApproximately(service, "1mo", 27, 33);
        assertRangeApproximately(service, "3mo", 85, 95);
        assertRangeApproximately(service, "6mo", 176, 186);
        assertRangeApproximately(service, "1y", 364, 366);
        assertRangeApproximately(service, "2y", 729, 732);
        assertRangeApproximately(service, "5y", 1824, 1828);
        assertRangeApproximately(service, "unknown", 27, 33);
    }

    @Test
    void shouldReturnLocalHistoryWhenProviderReturnsNullOrEmptyDuringStaleRefresh() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant stale = Instant.now().minus(Duration.ofDays(3));
        List<PriceHistory> local = List.of(price("AAPL", "100", stale));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class))).thenReturn(local);
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenReturn(null);

        List<PriceHistory> nullResult = service.getFreshHistory("AAPL", "1d", "1mo");
        assertThat(nullResult).containsExactlyElementsOf(local);

        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenReturn(List.of());
        List<PriceHistory> emptyResult = service.getFreshHistory("AAPL", "1d", "1mo");
        assertThat(emptyResult).containsExactlyElementsOf(local);

        verify(priceRepository, never()).saveAll(any());
    }

    @Test
    void shouldReturnLocalHistoryWhenProviderThrowsDuringRefresh() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        List<PriceHistory> local = List.of(price("AAPL", "100", Instant.now().minus(Duration.ofDays(2))));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class))).thenReturn(local);
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenThrow(new RuntimeException("provider down"));

        List<PriceHistory> result = service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(result).containsExactlyElementsOf(local);
        verify(priceRepository, never()).saveAll(any());
    }

    @Test
    void shouldKeepOnlyOneRowPerTimestampAfterMerge() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant ts = Instant.now().minus(Duration.ofDays(2));
        PriceHistory localDup = price("AAPL", "100", ts);
        PriceHistory providerDup = price("AAPL", "120", ts);

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class))).thenReturn(List.of(localDup));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenReturn(List.of(providerDup));

        List<PriceHistory> result = service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(result).hasSize(1);
        assertThat(result.get(0)).isEqualTo(providerDup);
    }

    @Test
    void shouldFilterOutOfRangeAndFutureRowsFromReturnedHistory() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant now = Instant.now();
        PriceHistory localInRange = price("AAPL", "100", now.minus(Duration.ofDays(20)));
        PriceHistory providerBeforeRange = price("AAPL", "80", now.minus(Duration.ofDays(40)));
        PriceHistory providerInRange = price("AAPL", "110", now.minus(Duration.ofDays(10)));
        PriceHistory providerFuture = price("AAPL", "130", now.plus(Duration.ofDays(1)));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class)))
                .thenReturn(List.of(localInRange));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo"))
                .thenReturn(List.of(providerBeforeRange, providerInRange, providerFuture));

        List<PriceHistory> result = service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(result).extracting(PriceHistory::close)
                .containsExactly(localInRange.close(), providerInRange.close());
    }

    @Test
    void shouldNotMutateRepositoryOwnedListDuringMerge() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        List<PriceHistory> local = new ArrayList<>(List.of(price("AAPL", "100", Instant.now().minus(Duration.ofDays(2)))));
        List<PriceHistory> snapshot = new ArrayList<>(local);
        List<PriceHistory> fetched = List.of(price("AAPL", "110", Instant.now().minus(Duration.ofDays(1))));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class))).thenReturn(local);
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "1mo")).thenReturn(fetched);

        service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(local).containsExactlyElementsOf(snapshot);
    }

    @Test
    void shouldBeDeterministicForRepeatedFreshNonLiveRequests() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant capturedNow = Instant.now();
        Instant todayStart = LocalDateTime.ofInstant(capturedNow, ZoneOffset.UTC).toLocalDate().atStartOfDay().toInstant(ZoneOffset.UTC);
        List<PriceHistory> local = List.of(price("AAPL", "100", todayStart));

        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class))).thenReturn(local);

        List<PriceHistory> first = service.getFreshHistory("AAPL", "1d", "1mo");
        List<PriceHistory> second = service.getFreshHistory("AAPL", "1d", "1mo");

        assertThat(first).isEqualTo(second);
        verify(financialDataPort, never()).fetchPriceHistory(any(), any(), any());
    }

    @Test
    void shouldThrowWhenRepositoryReturnsNullForHistory() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        when(priceRepository.findByAssetIdAndPeriod(eq("AAPL"), any(Instant.class), any(Instant.class))).thenReturn(null);

        assertThatThrownBy(() -> service.getFreshHistory("AAPL", "1d", "1mo"))
                .isInstanceOf(NullPointerException.class);
    }

    @Test
    void shouldClarifyEqualTimestampWinnerForLatestPrice() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        Instant ts = Instant.now().minusSeconds(60);
        PriceHistory local = price("AAPL", "100", ts);
        PriceHistory provider = price("AAPL", "101", ts);

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.of(local));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenReturn(List.of(provider));

        Optional<PriceHistory> result = service.getFreshLatest("AAPL");
        assertThat(result).isPresent();
    }

    @Test
    void shouldClarifyLatestProviderExceptionFallbackOwnership() {
        PriceRefreshService service = new PriceRefreshService(priceRepository, financialDataPort);
        PriceHistory local = price("AAPL", "100", Instant.now().minusSeconds(60));

        when(priceRepository.findLatestByAssetId("AAPL")).thenReturn(Optional.of(local));
        when(financialDataPort.fetchPriceHistory("AAPL", "1d", "5d")).thenThrow(new RuntimeException("down"));

        assertThatCode(() -> service.getFreshLatest("AAPL")).doesNotThrowAnyException();
    }

    private void assertRangeApproximately(PriceRefreshService service, String range, long minDays, long maxDays) {
        ArgumentCaptor<Instant> fromCaptor = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> toCaptor = ArgumentCaptor.forClass(Instant.class);

        Instant before = Instant.now();
        service.getFreshHistory("AAPL", "1d", range);
        Instant after = Instant.now();

        verify(priceRepository, times(1)).findByAssetIdAndPeriod(eq("AAPL"), fromCaptor.capture(), toCaptor.capture());

        long between = Duration.between(fromCaptor.getValue(), toCaptor.getValue()).toDays();
        assertThat(between).isBetween(minDays, maxDays);
        assertThat(toCaptor.getValue()).isAfterOrEqualTo(before.minusSeconds(2));
        assertThat(toCaptor.getValue()).isBeforeOrEqualTo(after.plusSeconds(2));

        org.mockito.Mockito.clearInvocations(priceRepository, financialDataPort);
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
                timestamp
        );
    }
}
