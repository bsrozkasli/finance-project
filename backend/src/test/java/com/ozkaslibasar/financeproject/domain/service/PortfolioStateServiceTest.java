package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ExposureStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioStatePosition;
import com.ozkaslibasar.financeproject.domain.model.PositionValuationStatus;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.ValuationInput;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-002 Task 3 / PRD-FR-014 preparation: a Portfolio State is derived only from accepted ledger events and named
 * by a content-addressed version, so the same events always give the same state and version and any change to them
 * gives a new version. Exposures (decision D-2) come only from retained prices and fail closed.
 */
class PortfolioStateServiceTest {

    private static final Long PORTFOLIO = 7L;
    private static final String USER = "state-user";
    private static final LocalDate AS_OF = LocalDate.of(2026, 10, 20);

    private final InMemoryTransactionPort port = new InMemoryTransactionPort();
    private final InMemoryPrices prices = new InMemoryPrices();
    private final InMemoryAssets assets = new InMemoryAssets();
    private final InMemoryPortfolios portfolios = new InMemoryPortfolios();
    private final PortfolioStateService service =
            new PortfolioStateService(port, new PortfolioLedgerService(port), prices, assets, portfolios);

    @BeforeEach
    void portfolioExists() {
        portfolios.put(new Portfolio(PORTFOLIO, USER, "State", "USD", null, false, null, null));
    }

    private static PortfolioTransaction tx(long id, String symbol, PortfolioTransactionAction action, String qty,
                                           String price, int day) {
        return new PortfolioTransaction(id, PORTFOLIO, USER, symbol, PortfolioAssetType.US_STOCK, action,
                new BigDecimal(qty), new BigDecimal(price), "USD", BigDecimal.ZERO, BigDecimal.ONE,
                LocalDate.of(2026, 10, day), PortfolioTransactionSource.MANUAL, null, null, null, "manual:fixture-" + id);
    }

    private static List<PortfolioTransaction> buyThenPartialSell() {
        return List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "100", 1),
                tx(2, "AAPL", PortfolioTransactionAction.SELL, "4", "150", 2));
    }

    @Test
    void stateCarriesQuantityBasisAndRealizedActivityFromAcceptedEvents() {
        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());

        PortfolioStatePosition aapl = state.positions().get(0);
        assertThat(aapl.symbol()).isEqualTo("AAPL");
        assertThat(aapl.quantity()).isEqualByComparingTo("6");
        assertThat(aapl.costBasis()).isEqualByComparingTo("600");
        assertThat(aapl.realizedPnl()).isEqualByComparingTo("200");
        assertThat(state.sourceEventIds()).containsExactly(1L, 2L);
        assertThat(state.portfolioId()).isEqualTo(PORTFOLIO);
        assertThat(state.asOf()).isEqualTo(AS_OF);
    }

    @Test
    void aClosedPositionKeepsItsRealizedActivityInTheState() {
        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "100", 1),
                tx(2, "AAPL", PortfolioTransactionAction.SELL, "10", "120", 2)));

        assertThat(state.positions()).hasSize(1);
        assertThat(state.positions().get(0).quantity()).isEqualByComparingTo("0");
        assertThat(state.positions().get(0).costBasis()).isEqualByComparingTo("0");
        assertThat(state.positions().get(0).realizedPnl()).isEqualByComparingTo("200");
    }

    @Test
    void reorderedEventsGiveTheSameVersionAndPositions() {
        List<PortfolioTransaction> events = new ArrayList<>(buyThenPartialSell());
        events.add(tx(3, "MSFT", PortfolioTransactionAction.BUY, "2", "300", 1));
        PortfolioState inOrder = service.project(PORTFOLIO, USER, AS_OF, "USD", events);

        List<PortfolioTransaction> reversedEvents = new ArrayList<>(events);
        Collections.reverse(reversedEvents);
        PortfolioState reversed = service.project(PORTFOLIO, USER, AS_OF, "USD", reversedEvents);

        assertThat(reversed).isEqualTo(inOrder);
    }

    @Test
    void numericScaleDoesNotChangeTheVersion() {
        PortfolioTransaction scaled = new PortfolioTransaction(1L, PORTFOLIO, USER, "AAPL", PortfolioAssetType.US_STOCK,
                PortfolioTransactionAction.BUY, new BigDecimal("10.000000"), new BigDecimal("100.00"), "USD",
                new BigDecimal("0.00"), new BigDecimal("1.000000"), LocalDate.of(2026, 10, 1),
                PortfolioTransactionSource.MANUAL, null, null, null, "manual:fixture-1");

        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", List.of(scaled)).version())
                .isEqualTo(service.project(PORTFOLIO, USER, AS_OF, "USD",
                        List.of(tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "100", 1))).version());
    }

    @Test
    void aCorrectionEventYieldsANewVersionAndThePriorEventsStillReplayThePriorState() {
        PortfolioState before = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());
        List<PortfolioTransaction> corrected = new ArrayList<>(buyThenPartialSell());
        corrected.add(tx(3, "AAPL", PortfolioTransactionAction.BUY, "4", "150", 3));

        PortfolioState after = service.project(PORTFOLIO, USER, AS_OF, "USD", corrected);

        assertThat(after.version()).isNotEqualTo(before.version());
        assertThat(after.positions().get(0).quantity()).isEqualByComparingTo("10");
        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell())).isEqualTo(before);
    }

    @Test
    void anyEconomicChangeToAnEventChangesTheVersion() {
        String base = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version();

        String repriced = service.project(PORTFOLIO, USER, AS_OF, "USD", List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "101", 1),
                tx(2, "AAPL", PortfolioTransactionAction.SELL, "4", "150", 2))).version();

        assertThat(repriced).isNotEqualTo(base);
    }

    @Test
    void eventsAfterTheAsOfDateAreExcluded() {
        List<PortfolioTransaction> events = new ArrayList<>(buyThenPartialSell());
        events.add(tx(3, "AAPL", PortfolioTransactionAction.BUY, "5", "100", 25));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", events);

        assertThat(state.sourceEventIds()).containsExactly(1L, 2L);
        assertThat(state).isEqualTo(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()));
    }

    @Test
    void theVersionIsAContentAddressNamingItsDerivation() {
        String version = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version();

        assertThat(version).matches("pstate-v2:[0-9a-f]{64}");
        assertThat(service.project(PORTFOLIO, USER, AS_OF.plusDays(1), "USD", buyThenPartialSell()).version())
                .isNotEqualTo(version);
    }

    @Test
    void onlyAcceptedEventsOfThisPortfolioAndUserCanFormAState() {
        PortfolioTransaction unsaved = new PortfolioTransaction(null, PORTFOLIO, USER, "AAPL",
                PortfolioAssetType.US_STOCK, PortfolioTransactionAction.BUY, BigDecimal.ONE, BigDecimal.TEN, "USD",
                BigDecimal.ZERO, BigDecimal.ONE, LocalDate.of(2026, 10, 1), PortfolioTransactionSource.MANUAL,
                null, null, null);
        PortfolioTransaction otherPortfolio = new PortfolioTransaction(9L, 8L, USER, "AAPL",
                PortfolioAssetType.US_STOCK, PortfolioTransactionAction.BUY, BigDecimal.ONE, BigDecimal.TEN, "USD",
                BigDecimal.ZERO, BigDecimal.ONE, LocalDate.of(2026, 10, 1), PortfolioTransactionSource.MANUAL,
                null, null, null);

        assertThatThrownBy(() -> service.project(PORTFOLIO, USER, AS_OF, "USD", List.of(unsaved)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.project(PORTFOLIO, USER, AS_OF, "USD", List.of(otherPortfolio)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.project(PORTFOLIO, "someone-else", AS_OF, "USD", buyThenPartialSell()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.project(PORTFOLIO, USER, AS_OF, "USD",
                List.of(buyThenPartialSell().get(0), buyThenPartialSell().get(0))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void stateAtReadsTheRetainedLedgerThroughThePort() {
        buyThenPartialSell().forEach(port::save);

        assertThat(service.stateAt(PORTFOLIO, USER, AS_OF))
                .isEqualTo(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()));
    }

    @Test
    void stateAtIgnoresVoidedEventsButKeepsThemReplayable() {
        buyThenPartialSell().forEach(port::save);
        port.voidByIdAndPortfolioIdAndUserId(2L, PORTFOLIO, USER, Instant.parse("2026-10-21T10:00:00Z"));

        PortfolioState state = service.stateAt(PORTFOLIO, USER, AS_OF);

        assertThat(state.sourceEventIds()).containsExactly(1L);
        assertThat(state.positions().get(0).quantity()).isEqualByComparingTo("10");
        assertThat(port.findByIdsIncludingVoided(PORTFOLIO, USER, List.of(1L, 2L))).hasSize(2);
    }

    @Test
    void stateListsAreImmutable() {
        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());

        assertThatThrownBy(() -> state.positions().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> state.sourceEventIds().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    // ---- exposures (decision D-2) ----

    private static PortfolioTransaction inCurrency(PortfolioTransaction t, String currency) {
        return new PortfolioTransaction(t.id(), t.portfolioId(), t.userId(), t.symbol(), t.assetType(), t.action(),
                t.quantity(), t.price(), currency, t.fee(), t.fxRateToBase(), t.tradeDate(), t.source(), null, null,
                null, t.originLocator());
    }

    private void asset(String symbol, String currency) {
        assets.put(new Asset(symbol, symbol, AssetType.STOCK, null, currency, null, symbol,
                AssetMetadataStatus.VERIFIED));
    }

    private static final List<PortfolioTransaction> AAPL_AND_MSFT = List.of(
            tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "100", 1),
            tx(2, "AAPL", PortfolioTransactionAction.SELL, "4", "150", 2),
            tx(3, "MSFT", PortfolioTransactionAction.BUY, "2", "300", 1));

    private PortfolioStatePosition position(PortfolioState state, String symbol) {
        return state.positions().stream().filter(p -> p.symbol().equals(symbol)).findFirst().orElseThrow();
    }

    @Test
    void completeExposuresWeightPricedPositionsAndAssetTypes() {
        asset("AAPL", "USD");
        asset("MSFT", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        prices.put("MSFT", "200", LocalDate.of(2026, 10, 19));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", AAPL_AND_MSFT);

        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.COMPLETE);
        PortfolioStatePosition aapl = position(state, "AAPL");
        assertThat(aapl.valuationStatus()).isEqualTo(PositionValuationStatus.PRICED);
        assertThat(aapl.price()).isEqualByComparingTo("100");
        assertThat(aapl.priceDate()).isEqualTo(LocalDate.of(2026, 10, 20));
        assertThat(aapl.marketValue()).isEqualByComparingTo("600");
        assertThat(aapl.weight()).isEqualTo(new BigDecimal("0.6000000000"));
        assertThat(position(state, "MSFT").marketValue()).isEqualByComparingTo("400");
        assertThat(position(state, "MSFT").weight()).isEqualTo(new BigDecimal("0.4000000000"));
        assertThat(state.assetTypeWeights()).containsExactlyInAnyOrderEntriesOf(
                Map.of("US_STOCK", new BigDecimal("1.0000000000")));
        assertThat(state.baseCurrency()).isEqualTo("USD");
        assertThat(state.valuationInputs()).containsExactly(
                new ValuationInput("AAPL", new BigDecimal("100"), LocalDate.of(2026, 10, 20), "USD"),
                new ValuationInput("MSFT", new BigDecimal("200"), LocalDate.of(2026, 10, 19), "USD"));
    }

    @Test
    void assetTypeWeightsSumTheWeightsOfEachType() {
        asset("AAPL", "USD");
        asset("GLD", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        prices.put("GLD", "100", LocalDate.of(2026, 10, 20));
        PortfolioTransaction gold = new PortfolioTransaction(3L, PORTFOLIO, USER, "GLD", PortfolioAssetType.GOLD,
                PortfolioTransactionAction.BUY, new BigDecimal("4"), new BigDecimal("90"), "USD", BigDecimal.ZERO,
                BigDecimal.ONE, LocalDate.of(2026, 10, 1), PortfolioTransactionSource.MANUAL, null, null, null,
                "manual:fixture-3");

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD",
                List.of(buyThenPartialSell().get(0), buyThenPartialSell().get(1), gold));

        assertThat(state.assetTypeWeights()).containsExactlyInAnyOrderEntriesOf(Map.of(
                "US_STOCK", new BigDecimal("0.6000000000"), "GOLD", new BigDecimal("0.4000000000")));
    }

    @Test
    void theLatestCloseOnOrBeforeAsOfIsUsedAndLaterClosesAreIgnored() {
        asset("AAPL", "USD");
        prices.put("AAPL", "90", LocalDate.of(2026, 10, 15));
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        prices.put("AAPL", "999", LocalDate.of(2026, 10, 21));

        PortfolioStatePosition aapl = position(
                service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()), "AAPL");

        assertThat(aapl.price()).isEqualByComparingTo("100");
        assertThat(aapl.priceDate()).isEqualTo(LocalDate.of(2026, 10, 20));
    }

    @Test
    void aPriceExactlySevenDaysOldIsPricedAndEightDaysOldIsStale() {
        asset("AAPL", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 13));
        assertThat(position(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()), "AAPL")
                .valuationStatus()).isEqualTo(PositionValuationStatus.PRICED);

        prices.clear();
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 12));
        PortfolioState stale = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());
        PortfolioStatePosition aapl = position(stale, "AAPL");
        assertThat(aapl.valuationStatus()).isEqualTo(PositionValuationStatus.STALE_PRICE);
        assertThat(aapl.marketValue()).isEqualByComparingTo("600");
        assertThat(aapl.weight()).isNull();
        assertThat(stale.exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
    }

    @Test
    void aPositionWithoutAnyPriceIsNoPrice() {
        asset("AAPL", "USD");

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());

        PortfolioStatePosition aapl = position(state, "AAPL");
        assertThat(aapl.valuationStatus()).isEqualTo(PositionValuationStatus.NO_PRICE);
        assertThat(aapl.price()).isNull();
        assertThat(aapl.priceDate()).isNull();
        assertThat(aapl.marketValue()).isNull();
        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
        assertThat(state.valuationInputs()).containsExactly(new ValuationInput("AAPL", null, null, "USD"));
    }

    @Test
    void aMissingAssetOrBlankCurrencyIsCurrencyUnknownEvenWithAPrice() {
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        prices.put("MSFT", "200", LocalDate.of(2026, 10, 20));
        asset("MSFT", " ");

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", AAPL_AND_MSFT);

        assertThat(position(state, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_UNKNOWN);
        assertThat(position(state, "MSFT").valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_UNKNOWN);
        assertThat(position(state, "AAPL").marketValue()).isNull();
        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
    }

    @Test
    void aPriceCurrencyPositionCurrencyOrBaseCurrencyThatDiffersIsCurrencyMismatch() {
        asset("AAPL", "EUR");
        asset("MSFT", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        prices.put("MSFT", "200", LocalDate.of(2026, 10, 20));
        List<PortfolioTransaction> events = List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "6", "100", 1),
                inCurrency(tx(3, "MSFT", PortfolioTransactionAction.BUY, "2", "300", 1), "EUR"));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", events);

        assertThat(position(state, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_MISMATCH);
        assertThat(position(state, "MSFT").valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_MISMATCH);
        assertThat(position(state, "AAPL").marketValue()).isNull();

        asset("AAPL", "USD");
        assertThat(position(service.project(PORTFOLIO, USER, AS_OF, "EUR", buyThenPartialSell()), "AAPL")
                .valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_MISMATCH);
    }

    @Test
    void currencyUnknownOutranksMismatchAndMismatchOutranksNoPriceAndStale() {
        asset("AAPL", "EUR"); // mismatch and also no price
        PortfolioState noPrice = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());
        assertThat(position(noPrice, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_MISMATCH);

        prices.put("AAPL", "100", LocalDate.of(2026, 9, 1)); // mismatch and also stale
        PortfolioState stale = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());
        assertThat(position(stale, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_MISMATCH);

        assets.clear(); // currency unknown outranks everything
        PortfolioState unknown = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());
        assertThat(position(unknown, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.CURRENCY_UNKNOWN);
    }

    @Test
    void anyUnpricedOpenPositionMakesAllWeightsAbsent() {
        asset("AAPL", "USD");
        asset("MSFT", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", AAPL_AND_MSFT);

        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
        assertThat(position(state, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.PRICED);
        assertThat(position(state, "AAPL").marketValue()).isEqualByComparingTo("600");
        assertThat(state.positions()).allSatisfy(p -> assertThat(p.weight()).isNull());
        assertThat(state.assetTypeWeights()).isEmpty();
    }

    @Test
    void aStateWithoutOpenPositionsIsEmptyAndAClosedPositionIsNeverValued() {
        asset("AAPL", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "100", 1),
                tx(2, "AAPL", PortfolioTransactionAction.SELL, "10", "120", 2)));

        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.EMPTY);
        assertThat(state.assetTypeWeights()).isEmpty();
        assertThat(state.valuationInputs()).isEmpty();
        PortfolioStatePosition aapl = state.positions().get(0);
        assertThat(aapl.valuationStatus()).isEqualTo(PositionValuationStatus.CLOSED);
        assertThat(aapl.realizedPnl()).isEqualByComparingTo("200");
        assertThat(aapl.price()).isNull();
        assertThat(aapl.priceDate()).isNull();
        assertThat(aapl.marketValue()).isNull();
        assertThat(aapl.weight()).isNull();
        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", List.of()).exposureStatus())
                .isEqualTo(ExposureStatus.EMPTY);
    }

    @Test
    void aClosedPositionDoesNotBlockCompleteExposuresOfTheOpenOnes() {
        asset("AAPL", "USD");
        asset("MSFT", "USD");
        prices.put("MSFT", "200", LocalDate.of(2026, 10, 20));
        List<PortfolioTransaction> events = List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "100", 1),
                tx(2, "AAPL", PortfolioTransactionAction.SELL, "10", "120", 2),
                tx(3, "MSFT", PortfolioTransactionAction.BUY, "2", "300", 1));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", events);

        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.COMPLETE);
        assertThat(position(state, "MSFT").weight()).isEqualTo(new BigDecimal("1.0000000000"));
        assertThat(position(state, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.CLOSED);
    }

    @Test
    void aZeroTotalMarketValueIsPartialRatherThanADivisionByZero() {
        asset("AAPL", "USD");
        prices.put("AAPL", "0", LocalDate.of(2026, 10, 20));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());

        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
        assertThat(position(state, "AAPL").marketValue()).isEqualByComparingTo("0");
        assertThat(position(state, "AAPL").weight()).isNull();
        assertThat(state.assetTypeWeights()).isEmpty();
    }

    @Test
    void weightsAreRoundedHalfUpAtTenDecimals() {
        asset("AAPL", "USD");
        asset("MSFT", "USD");
        prices.put("AAPL", "1", LocalDate.of(2026, 10, 20));
        prices.put("MSFT", "2", LocalDate.of(2026, 10, 20));
        List<PortfolioTransaction> events = List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "1", "1", 1),
                tx(3, "MSFT", PortfolioTransactionAction.BUY, "1", "1", 1));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, "USD", events);

        assertThat(position(state, "AAPL").weight()).isEqualTo(new BigDecimal("0.3333333333"));
        assertThat(position(state, "MSFT").weight()).isEqualTo(new BigDecimal("0.6666666667"));
    }

    @Test
    void replayFromExplicitInputsEqualsThePricePortResult() {
        asset("AAPL", "USD");
        asset("MSFT", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        prices.put("MSFT", "200", LocalDate.of(2026, 10, 12));
        PortfolioState viaPort = service.project(PORTFOLIO, USER, AS_OF, "USD", AAPL_AND_MSFT);

        prices.clear();
        assets.clear();
        PortfolioState replayed = service.project(PORTFOLIO, USER, AS_OF, "USD", AAPL_AND_MSFT,
                viaPort.valuationInputs());

        assertThat(replayed).isEqualTo(viaPort);
        assertThat(replayed.version()).isEqualTo(viaPort.version());
    }

    @Test
    void anUnpricedStateReplaysFromItsStoredNullInputs() {
        PortfolioState viaPort = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell());
        asset("AAPL", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));

        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell(), viaPort.valuationInputs()))
                .isEqualTo(viaPort);
    }

    @Test
    void aChangedCloseCurrencyOrPriceDateChangesTheVersion() {
        asset("AAPL", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        String base = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version();

        prices.clear();
        prices.put("AAPL", "101", LocalDate.of(2026, 10, 20));
        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version()).isNotEqualTo(base);

        prices.clear();
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 19));
        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version()).isNotEqualTo(base);

        prices.clear();
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        asset("AAPL", "EUR");
        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version()).isNotEqualTo(base);
    }

    @Test
    void closeScaleDoesNotChangeTheVersion() {
        asset("AAPL", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        String base = service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version();

        prices.clear();
        prices.put("AAPL", "100.0000", LocalDate.of(2026, 10, 20));

        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", buyThenPartialSell()).version()).isEqualTo(base);
    }

    @Test
    void reorderedEventsGiveTheSameVersionWithPrices() {
        asset("AAPL", "USD");
        asset("MSFT", "USD");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        prices.put("MSFT", "200", LocalDate.of(2026, 10, 20));
        List<PortfolioTransaction> reversed = new ArrayList<>(AAPL_AND_MSFT);
        Collections.reverse(reversed);

        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", reversed))
                .isEqualTo(service.project(PORTFOLIO, USER, AS_OF, "USD", AAPL_AND_MSFT));
    }

    @Test
    void theVersionIgnoresVoidedAt() {
        List<PortfolioTransaction> events = buyThenPartialSell();
        List<PortfolioTransaction> voidedLater = events.stream()
                .map(t -> withVoidedAt(t, Instant.parse("2026-10-21T10:00:00Z"))).toList();

        assertThat(service.project(PORTFOLIO, USER, AS_OF, "USD", voidedLater).version())
                .isEqualTo(service.project(PORTFOLIO, USER, AS_OF, "USD", events).version());
    }

    @Test
    void stateAtUsesThePortfolioBaseCurrencyAndStoredPrices() {
        portfolios.put(new Portfolio(PORTFOLIO, USER, "State", "EUR", null, false, null, null));
        asset("AAPL", "EUR");
        prices.put("AAPL", "100", LocalDate.of(2026, 10, 20));
        buyThenPartialSell().stream().map(t -> inCurrency(t, "EUR")).forEach(port::save);

        PortfolioState state = service.stateAt(PORTFOLIO, USER, AS_OF);

        assertThat(state.baseCurrency()).isEqualTo("EUR");
        assertThat(position(state, "AAPL").valuationStatus()).isEqualTo(PositionValuationStatus.PRICED);
        assertThat(state.exposureStatus()).isEqualTo(ExposureStatus.COMPLETE);
    }

    @Test
    void stateAtForAnUnknownPortfolioIsRejected() {
        assertThatThrownBy(() -> service.stateAt(99L, USER, AS_OF)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.stateAt(PORTFOLIO, "someone-else", AS_OF))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static final class InMemoryPrices implements PriceRepositoryPort {
        private final List<PriceHistory> saved = new ArrayList<>();

        void put(String symbol, String close, LocalDate date) {
            BigDecimal c = new BigDecimal(close);
            saved.add(new PriceHistory(symbol, c, c, c, c, BigDecimal.ONE, date.atTime(21, 0)));
        }

        void clear() {
            saved.clear();
        }

        @Override
        public void saveAll(List<PriceHistory> prices) {
            saved.addAll(prices);
        }

        @Override
        public List<PriceHistory> findByAssetIdAndPeriod(String assetId, Instant from, Instant to) {
            return saved.stream()
                    .filter(p -> p.symbol().equals(assetId))
                    .filter(p -> !p.timestampAsInstant().isBefore(from) && !p.timestampAsInstant().isAfter(to))
                    .toList();
        }

        @Override
        public Optional<PriceHistory> findLatestByAssetId(String assetId) {
            return saved.stream().filter(p -> p.symbol().equals(assetId))
                    .max(java.util.Comparator.comparing(PriceHistory::timestamp));
        }
    }

    private static final class InMemoryAssets implements AssetRepositoryPort {
        private final Map<String, Asset> bySymbol = new HashMap<>();

        void put(Asset asset) {
            bySymbol.put(asset.symbol(), asset);
        }

        void clear() {
            bySymbol.clear();
        }

        @Override
        public Asset save(Asset asset) {
            put(asset);
            return asset;
        }

        @Override
        public Optional<Asset> findBySymbol(String symbol) {
            return Optional.ofNullable(bySymbol.get(symbol));
        }

        @Override
        public List<Asset> findAll() {
            return List.copyOf(bySymbol.values());
        }

        @Override
        public void deleteBySymbol(String symbol) {
            bySymbol.remove(symbol);
        }
    }

    private static final class InMemoryPortfolios implements PortfolioPort {
        private final Map<Long, Portfolio> byId = new HashMap<>();

        void put(Portfolio portfolio) {
            byId.put(portfolio.id(), portfolio);
        }

        @Override
        public List<Portfolio> findByUserId(String userId) {
            return byId.values().stream().filter(p -> p.userId().equals(userId)).toList();
        }

        @Override
        public Optional<Portfolio> findByIdAndUserId(Long id, String userId) {
            return Optional.ofNullable(byId.get(id)).filter(p -> p.userId().equals(userId));
        }

        @Override
        public Portfolio save(Portfolio portfolio) {
            put(portfolio);
            return portfolio;
        }

        @Override
        public void deleteByIdAndUserId(Long id, String userId) {
            byId.remove(id);
        }
    }

    private static PortfolioTransaction withVoidedAt(PortfolioTransaction t, Instant voidedAt) {
        return new PortfolioTransaction(t.id(), t.portfolioId(), t.userId(), t.symbol(), t.assetType(), t.action(),
                t.quantity(), t.price(), t.currency(), t.fee(), t.fxRateToBase(), t.tradeDate(), t.source(),
                t.notes(), t.createdAt(), t.updatedAt(), t.originLocator(), voidedAt);
    }

    private static final class InMemoryTransactionPort implements PortfolioTransactionPort {
        private final List<PortfolioTransaction> saved = new ArrayList<>();

        @Override
        public List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId) {
            return saved.stream()
                    .filter(t -> t.portfolioId().equals(portfolioId) && t.userId().equals(userId)
                            && t.voidedAt() == null)
                    .toList();
        }

        @Override
        public Optional<PortfolioTransaction> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId) {
            return findByPortfolioIdAndUserId(portfolioId, userId).stream().filter(t -> t.id().equals(id)).findFirst();
        }

        @Override
        public PortfolioTransaction save(PortfolioTransaction transaction) {
            saved.add(transaction);
            return transaction;
        }

        @Override
        public void voidByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId, Instant voidedAt) {
            for (int i = 0; i < saved.size(); i++) {
                PortfolioTransaction t = saved.get(i);
                if (t.id().equals(id) && t.portfolioId().equals(portfolioId) && t.userId().equals(userId)
                        && t.voidedAt() == null) {
                    saved.set(i, withVoidedAt(t, voidedAt));
                }
            }
        }

        @Override
        public List<PortfolioTransaction> findByIdsIncludingVoided(Long portfolioId, String userId, Collection<Long> ids) {
            return saved.stream()
                    .filter(t -> t.portfolioId().equals(portfolioId) && t.userId().equals(userId) && ids.contains(t.id()))
                    .toList();
        }
    }
}
