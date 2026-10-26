package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.PriceLookup;
import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;
import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchSnapshot;
import com.ozkaslibasar.financeproject.domain.model.WatchlistResearchStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.ResearchDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.TechnicalAnalysisPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WatchlistResearchSnapshotUseCaseTest {

    private static final ResearchDataPort.FundamentalResearch FUNDAMENTAL = new ResearchDataPort.FundamentalResearch(
            "AAPL",
            new ResearchDataPort.FundamentalMetrics(0.22, 0.12, 0.18, 0.44, 0.31, 0.24, 1.9, 1.4, 0.52, 1000.0, 240.0, 300.0),
            "2025", "USD", "2026-07-10T00:00:00Z");
    private static final ResearchDataPort.EarningsQuarter QUARTER =
            new ResearchDataPort.EarningsQuarter("2026Q1", 1.5, 1.4, 0.1, 7.1, true);
    private static final ResearchDataPort.InstitutionalScores SCORES =
            new ResearchDataPort.InstitutionalScores(7, 3.1, -2.5, 80, "wide", 70);
    private static final TechnicalAnalysisPort.TechnicalAnalysisResult INDICATORS =
            new TechnicalAnalysisPort.TechnicalAnalysisResult("AAPL", "t1", 55.0, 1.0, 0.5, 0.5, null, null, null,
                    null, 191.0, 190.0, 185.0, 170.0, 192.0, null, null);
    private static final TechnicalAnalysisPort.TechnicalAnalysisResult SIGNAL =
            new TechnicalAnalysisPort.TechnicalAnalysisResult("AAPL", "t2", null, null, null, null, null, null, null,
                    null, null, null, null, null, null, "BUY", 0.7);

    private WatchlistPort watchlistPort;
    private PriceRefreshService priceRefreshService;
    private TechnicalAnalysisPort technicalAnalysisPort;
    private ResearchDataPort researchDataPort;
    private WatchlistResearchSnapshotUseCase useCase;

    @BeforeEach
    void setUp() {
        watchlistPort = mock(WatchlistPort.class);
        priceRefreshService = mock(PriceRefreshService.class);
        technicalAnalysisPort = mock(TechnicalAnalysisPort.class);
        researchDataPort = mock(ResearchDataPort.class);
        useCase = new WatchlistResearchSnapshotUseCase(
                watchlistPort,
                priceRefreshService,
                technicalAnalysisPort,
                researchDataPort);
        when(watchlistPort.findByIdAndUserId(1L, "default"))
                .thenReturn(Optional.of(new Watchlist(1L, "default", "Core", List.of("AAPL"), null, null)));
        when(priceRefreshService.lookupFreshLatest(anyString()))
                .thenReturn(new PriceLookup(Optional.empty(), PriceLookup.Origin.NONE_REFRESH_EMPTY));
        stubAllEmpty();
    }

    private void stubAllEmpty() {
        when(technicalAnalysisPort.fetchTechnicalAnalysisResult(anyString(), anyString(), anyString()))
                .thenReturn(ProviderFetch.empty("Provider returned no data"));
        when(technicalAnalysisPort.fetchTechnicalSignalsResult(anyString(), anyString(), anyString()))
                .thenReturn(ProviderFetch.empty("Provider returned no data"));
        when(researchDataPort.fetchFundamentalResult(anyString())).thenReturn(ProviderFetch.empty("Provider returned no data"));
        when(researchDataPort.fetchEarningsResult(anyString())).thenReturn(ProviderFetch.empty("Provider returned no data"));
        when(researchDataPort.fetchInstitutionalScoresResult(anyString())).thenReturn(ProviderFetch.empty("Provider returned no data"));
    }

    private WatchlistResearchSnapshot.WatchlistResearchRow row() {
        return useCase.getSnapshot("default", 1L, 25, 0, List.of(), false).rows().get(0);
    }

    private static <T> ProviderFetch<T> fetchOf(ProviderFetch.Outcome outcome, T data) {
        return switch (outcome) {
            case OK -> ProviderFetch.ok(data);
            case EMPTY -> ProviderFetch.empty("empty-message");
            case FAILED -> ProviderFetch.failed("failed-message");
            case RATE_LIMITED -> ProviderFetch.rateLimited("rate-message");
            case INSUFFICIENT_DATA -> ProviderFetch.insufficientData("insufficient-message");
        };
    }

    private static WatchlistResearchStatus expectedStatus(ProviderFetch.Outcome outcome) {
        return WatchlistResearchStatus.valueOf(outcome.name());
    }

    private static String expectedMessage(ProviderFetch.Outcome outcome) {
        return switch (outcome) {
            case OK -> null;
            case EMPTY -> "empty-message";
            case FAILED -> "failed-message";
            case RATE_LIMITED -> "rate-message";
            case INSUFFICIENT_DATA -> "insufficient-message";
        };
    }

    @Test
    void snapshotFiltersRequestedSymbolsAndPaginatesInWatchlistOrder() {
        Watchlist watchlist = new Watchlist(10L, "default", "Core", List.of("MSFT", "AAPL", "GOOG"), null, null);
        when(watchlistPort.findByIdAndUserId(10L, "default")).thenReturn(Optional.of(watchlist));

        WatchlistResearchSnapshot snapshot = useCase.getSnapshot(
                "default",
                10L,
                1,
                1,
                List.of("aapl", "msft"),
                false);

        assertThat(snapshot.totalSymbols()).isEqualTo(2);
        assertThat(snapshot.requestedSymbols()).containsExactly("MSFT", "AAPL");
        assertThat(snapshot.rows()).hasSize(1);
        WatchlistResearchSnapshot.WatchlistResearchRow row = snapshot.rows().get(0);
        assertThat(row.symbol()).isEqualTo("AAPL");
        assertThat(row.price().status()).isEqualTo(WatchlistResearchStatus.EMPTY);
        assertThat(row.overallStatus()).isEqualTo(WatchlistResearchStatus.EMPTY);
        assertThat(snapshot.policy().maxLimit()).isEqualTo(50);
        assertThat(snapshot.policy().partialFailureEnabled()).isTrue();
    }

    @Test
    void snapshotReturnsPartialDataWhenOneProviderSectionFails() {
        PriceHistory price = new PriceHistory(
                "AAPL",
                BigDecimal.valueOf(190),
                BigDecimal.valueOf(195),
                BigDecimal.valueOf(188),
                BigDecimal.valueOf(194),
                BigDecimal.valueOf(123456),
                LocalDateTime.of(2026, 7, 10, 15, 30));
        when(priceRefreshService.lookupFreshLatest("AAPL"))
                .thenReturn(new PriceLookup(Optional.of(price), PriceLookup.Origin.FRESH));
        when(technicalAnalysisPort.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo"))
                .thenReturn(ProviderFetch.rateLimited("Provider rate limited"));
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(ProviderFetch.ok(FUNDAMENTAL));

        WatchlistResearchSnapshot.WatchlistResearchRow row = row();

        assertThat(row.price().status()).isEqualTo(WatchlistResearchStatus.OK);
        assertThat(row.price().data().lastPrice()).isEqualByComparingTo("194");
        assertThat(row.technical().status()).isEqualTo(WatchlistResearchStatus.RATE_LIMITED);
        assertThat(row.technical().message()).isEqualTo("Provider rate limited");
        assertThat(row.fundamentals().status()).isEqualTo(WatchlistResearchStatus.OK);
        assertThat(row.fundamentals().data().roe()).isEqualTo(0.22);
        assertThat(row.overallStatus()).isEqualTo(WatchlistResearchStatus.RATE_LIMITED);
    }

    @ParameterizedTest
    @EnumSource(ProviderFetch.Outcome.class)
    void fundamentalsSectionFollowsTheProviderOutcome(ProviderFetch.Outcome outcome) {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(fetchOf(outcome, FUNDAMENTAL));

        var section = row().fundamentals();

        assertThat(section.status()).isEqualTo(expectedStatus(outcome));
        assertThat(section.message()).isEqualTo(expectedMessage(outcome));
        assertThat(section.data() != null).isEqualTo(outcome == ProviderFetch.Outcome.OK);
    }

    @ParameterizedTest
    @EnumSource(ProviderFetch.Outcome.class)
    void earningsSectionFollowsTheProviderOutcome(ProviderFetch.Outcome outcome) {
        when(researchDataPort.fetchEarningsResult("AAPL")).thenReturn(fetchOf(outcome, List.of(QUARTER)));

        var section = row().earnings();

        assertThat(section.status()).isEqualTo(expectedStatus(outcome));
        assertThat(section.message()).isEqualTo(expectedMessage(outcome));
        if (outcome == ProviderFetch.Outcome.OK) {
            assertThat(section.data().quarters()).containsExactly(QUARTER);
        } else {
            assertThat(section.data()).isNull();
        }
    }

    @ParameterizedTest
    @EnumSource(ProviderFetch.Outcome.class)
    void institutionalSectionFollowsTheProviderOutcome(ProviderFetch.Outcome outcome) {
        when(researchDataPort.fetchInstitutionalScoresResult("AAPL")).thenReturn(fetchOf(outcome, SCORES));

        var section = row().institutional();

        assertThat(section.status()).isEqualTo(expectedStatus(outcome));
        assertThat(section.message()).isEqualTo(expectedMessage(outcome));
        assertThat(section.data() != null).isEqualTo(outcome == ProviderFetch.Outcome.OK);
    }

    @ParameterizedTest
    @EnumSource(ProviderFetch.Outcome.class)
    void technicalSectionFollowsTheProviderOutcomeWhenBothCallsAgree(ProviderFetch.Outcome outcome) {
        when(technicalAnalysisPort.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo")).thenReturn(fetchOf(outcome, INDICATORS));
        when(technicalAnalysisPort.fetchTechnicalSignalsResult("AAPL", "1d", "3mo")).thenReturn(fetchOf(outcome, SIGNAL));

        var section = row().technical();

        assertThat(section.status()).isEqualTo(expectedStatus(outcome));
        assertThat(section.message()).isEqualTo(expectedMessage(outcome));
        if (outcome == ProviderFetch.Outcome.OK) {
            assertThat(section.data().rsi14()).isEqualTo(55.0);
            assertThat(section.data().action()).isEqualTo("BUY");
        } else {
            assertThat(section.data()).isNull();
        }
    }

    @Test
    void technicalWithDataFromOneCallIsPartialOkAndKeepsTheOtherPartNull() {
        when(technicalAnalysisPort.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.failed("failed-message"));
        when(technicalAnalysisPort.fetchTechnicalSignalsResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.ok(SIGNAL));

        var section = row().technical();

        assertThat(section.status()).isEqualTo(WatchlistResearchStatus.OK);
        assertThat(section.data().action()).isEqualTo("BUY");
        assertThat(section.data().rsi14()).isNull();
    }

    @Test
    void technicalWithNoDataPicksTheMoreSevereOutcomeOfTheTwoCalls() {
        when(technicalAnalysisPort.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.insufficientData("insufficient-message"));
        when(technicalAnalysisPort.fetchTechnicalSignalsResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.failed("failed-message"));

        var section = row().technical();

        assertThat(section.status()).isEqualTo(WatchlistResearchStatus.FAILED);
        assertThat(section.message()).isEqualTo("failed-message");
    }

    @Test
    void anEscapingExceptionStillMapsThroughTheMessageBasedStatus() {
        when(technicalAnalysisPort.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo"))
                .thenThrow(new RuntimeException("429 rate limit"));

        assertThat(row().technical().status()).isEqualTo(WatchlistResearchStatus.RATE_LIMITED);
    }

    @Test
    void aPortThatReturnsNullIsReportedAsFailedNeverAsDataOrEmpty() {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(null);

        var section = row().fundamentals();

        assertThat(section.status()).isEqualTo(WatchlistResearchStatus.FAILED);
        assertThat(section.data()).isNull();
    }

    @Test
    void overallStatusKeepsTheCanonicalPrecedence() {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(ProviderFetch.ok(FUNDAMENTAL));
        assertThat(row().overallStatus()).isEqualTo(WatchlistResearchStatus.OK);

        when(researchDataPort.fetchEarningsResult("AAPL")).thenReturn(ProviderFetch.insufficientData("m"));
        assertThat(row().overallStatus()).isEqualTo(WatchlistResearchStatus.INSUFFICIENT_DATA);

        when(researchDataPort.fetchInstitutionalScoresResult("AAPL")).thenReturn(ProviderFetch.failed("m"));
        assertThat(row().overallStatus()).isEqualTo(WatchlistResearchStatus.FAILED);

        when(technicalAnalysisPort.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.rateLimited("m"));
        when(technicalAnalysisPort.fetchTechnicalSignalsResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.rateLimited("m"));
        assertThat(row().overallStatus()).isEqualTo(WatchlistResearchStatus.RATE_LIMITED);
    }

    @Test
    void allEmptyGivesAnEmptyOverallStatus() {
        assertThat(row().overallStatus()).isEqualTo(WatchlistResearchStatus.EMPTY);
    }

    // ---- price section: status from how the price was obtained (D-2) ----

    private static final String STALE_FAILED_MESSAGE = "Provider refresh failed; showing the last stored price";
    private static final String STALE_EMPTY_MESSAGE = "Provider returned no newer price; showing the last stored price";

    private static PriceHistory storedPrice() {
        return new PriceHistory("AAPL", BigDecimal.valueOf(190), BigDecimal.valueOf(195), BigDecimal.valueOf(188),
                BigDecimal.valueOf(194), BigDecimal.valueOf(123456), LocalDateTime.of(2026, 7, 3, 20, 0));
    }

    private void stubLookup(PriceLookup.Origin origin) {
        boolean hasPrice = origin == PriceLookup.Origin.FRESH
                || origin == PriceLookup.Origin.STORED_REFRESH_FAILED
                || origin == PriceLookup.Origin.STORED_REFRESH_EMPTY;
        when(priceRefreshService.lookupFreshLatest("AAPL"))
                .thenReturn(new PriceLookup(hasPrice ? Optional.of(storedPrice()) : Optional.empty(), origin));
    }

    @Test
    void aFreshPriceIsOkWithNoMessage() {
        stubLookup(PriceLookup.Origin.FRESH);

        var price = row().price();

        assertThat(price.status()).isEqualTo(WatchlistResearchStatus.OK);
        assertThat(price.message()).isNull();
        assertThat(price.data().lastPrice()).isEqualByComparingTo("194");
    }

    @Test
    void aStoredPriceAfterAFailedRefreshIsStaleAndKeepsItsData() {
        stubLookup(PriceLookup.Origin.STORED_REFRESH_FAILED);

        var price = row().price();

        assertThat(price.status()).isEqualTo(WatchlistResearchStatus.STALE);
        assertThat(price.message()).isEqualTo(STALE_FAILED_MESSAGE);
        assertThat(price.data().lastPrice()).isEqualByComparingTo("194");
        assertThat(price.data().timestamp()).isEqualTo(storedPrice().timestampAsInstant());
        assertThat(price.source()).isEqualTo("local-store/provider-chain");
        assertThat(price.observedAt()).isNotNull();
    }

    @Test
    void aStoredPriceAfterAnEmptyRefreshIsStaleAndKeepsItsData() {
        stubLookup(PriceLookup.Origin.STORED_REFRESH_EMPTY);

        var price = row().price();

        assertThat(price.status()).isEqualTo(WatchlistResearchStatus.STALE);
        assertThat(price.message()).isEqualTo(STALE_EMPTY_MESSAGE);
        assertThat(price.data().lastPrice()).isEqualByComparingTo("194");
    }

    @Test
    void noPriceAfterAFailedRefreshIsFailedWithNoData() {
        stubLookup(PriceLookup.Origin.NONE_REFRESH_FAILED);

        var price = row().price();

        assertThat(price.status()).isEqualTo(WatchlistResearchStatus.FAILED);
        assertThat(price.message()).isEqualTo("Provider request failed");
        assertThat(price.data()).isNull();
    }

    @Test
    void noPriceAfterAnEmptyRefreshIsEmptyWithNoData() {
        stubLookup(PriceLookup.Origin.NONE_REFRESH_EMPTY);

        var price = row().price();

        assertThat(price.status()).isEqualTo(WatchlistResearchStatus.EMPTY);
        assertThat(price.message()).isEqualTo("Provider returned no data");
        assertThat(price.data()).isNull();
    }

    @Test
    void aStalePriceDoesNotChangeTheOverallPrecedence() {
        stubLookup(PriceLookup.Origin.STORED_REFRESH_FAILED);
        // Every other section is EMPTY (setUp): STALE takes no part in the precedence, so the row reads EMPTY.
        assertThat(row().overallStatus()).isEqualTo(WatchlistResearchStatus.EMPTY);

        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(ProviderFetch.ok(FUNDAMENTAL));
        assertThat(row().overallStatus()).isEqualTo(WatchlistResearchStatus.OK);
    }

    @Test
    void repeatedFailedPriceRefreshesNeverOpenABreaker() {
        stubLookup(PriceLookup.Origin.NONE_REFRESH_FAILED);

        for (int i = 0; i < 5; i++) {
            assertThat(row().price().status()).isEqualTo(WatchlistResearchStatus.FAILED);
            assertThat(row().price().message()).isEqualTo("Provider request failed");
        }
        verify(priceRefreshService, times(10)).lookupFreshLatest("AAPL");
    }

    // ---- circuit breaker: 3 failures open it for 60 s; per section key ----

    private void callThreeTimes() {
        for (int i = 0; i < 3; i++) {
            row();
        }
    }

    @ParameterizedTest
    @EnumSource(value = ProviderFetch.Outcome.class, names = {"FAILED", "RATE_LIMITED"})
    void failedAndRateLimitedOutcomesOpenTheBreakerAfterThreeCalls(ProviderFetch.Outcome outcome) {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(fetchOf(outcome, FUNDAMENTAL));

        callThreeTimes();
        var fourth = row().fundamentals();

        assertThat(fourth.status()).isEqualTo(WatchlistResearchStatus.STALE);
        assertThat(fourth.message()).isEqualTo("Provider temporarily disabled after repeated failures");
        verify(researchDataPort, times(3)).fetchFundamentalResult("AAPL");
    }

    @ParameterizedTest
    @EnumSource(value = ProviderFetch.Outcome.class, names = {"OK", "EMPTY", "INSUFFICIENT_DATA"})
    void validAnswersNeverOpenTheBreaker(ProviderFetch.Outcome outcome) {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(fetchOf(outcome, FUNDAMENTAL));

        callThreeTimes();
        var fourth = row().fundamentals();

        assertThat(fourth.status()).isEqualTo(expectedStatus(outcome));
        verify(researchDataPort, times(4)).fetchFundamentalResult("AAPL");
    }

    @Test
    void threeClientErrorFailuresDoNotOpenTheBreakerButKeepTheFailedStatus() {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(ProviderFetch.failedClientError("client-message"));

        callThreeTimes();
        var fourth = row().fundamentals();

        assertThat(fourth.status()).isEqualTo(WatchlistResearchStatus.FAILED);
        assertThat(fourth.message()).isEqualTo("client-message");
        verify(researchDataPort, times(4)).fetchFundamentalResult("AAPL");
    }

    @Test
    void threeProviderFaultFailuresOpenTheBreaker() {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(ProviderFetch.failed("m"));

        callThreeTimes();

        assertThat(row().fundamentals().status()).isEqualTo(WatchlistResearchStatus.STALE);
        verify(researchDataPort, times(3)).fetchFundamentalResult("AAPL");
    }

    @Test
    void clientErrorsInterleavedWithProviderFaultsDoNotAddToTheCount() {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(
                ProviderFetch.failed("m"), ProviderFetch.failedClientError("c"), ProviderFetch.failed("m"),
                ProviderFetch.failedClientError("c"), ProviderFetch.failed("m"));

        row();
        row();
        row();
        assertThat(row().fundamentals().status()).isEqualTo(WatchlistResearchStatus.FAILED); // 2 provider faults so far
        assertThat(row().fundamentals().status()).isEqualTo(WatchlistResearchStatus.FAILED); // 3rd provider fault opens it
        assertThat(row().fundamentals().status()).isEqualTo(WatchlistResearchStatus.STALE);
        verify(researchDataPort, times(5)).fetchFundamentalResult("AAPL");
    }

    @Test
    void technicalTieBetweenClientErrorAndProviderFaultCountsAsProviderFault() {
        when(technicalAnalysisPort.fetchTechnicalAnalysisResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.failedClientError("c"));
        when(technicalAnalysisPort.fetchTechnicalSignalsResult("AAPL", "1d", "3mo")).thenReturn(ProviderFetch.failed("p"));

        callThreeTimes();

        assertThat(row().technical().status()).isEqualTo(WatchlistResearchStatus.STALE);
    }

    @Test
    void aValidAnswerResetsTheFailureCount() {
        when(researchDataPort.fetchFundamentalResult("AAPL"))
                .thenReturn(ProviderFetch.failed("m"), ProviderFetch.failed("m"), ProviderFetch.empty("m"),
                        ProviderFetch.failed("m"), ProviderFetch.failed("m"), ProviderFetch.ok(FUNDAMENTAL));

        for (int i = 0; i < 5; i++) {
            row();
        }
        assertThat(row().fundamentals().status()).isEqualTo(WatchlistResearchStatus.OK);
    }

    @Test
    void theBreakerIsPerSection() {
        when(researchDataPort.fetchFundamentalResult("AAPL")).thenReturn(ProviderFetch.failed("m"));
        when(researchDataPort.fetchEarningsResult("AAPL")).thenReturn(ProviderFetch.ok(List.of(QUARTER)));

        callThreeTimes();
        var row = row();

        assertThat(row.fundamentals().status()).isEqualTo(WatchlistResearchStatus.STALE);
        assertThat(row.earnings().status()).isEqualTo(WatchlistResearchStatus.OK);
    }

    @Test
    void sectionDataIsMappedFromTheProviderResult() {
        when(researchDataPort.fetchInstitutionalScoresResult("AAPL")).thenReturn(ProviderFetch.ok(SCORES));

        var section = row().institutional();

        assertThat(section.data().piotroskiFScore()).isEqualTo(7);
        assertThat(section.data().economicMoat()).isEqualTo("wide");
    }
}
