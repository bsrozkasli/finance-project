package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-002 Task 3 / PRD-FR-014 preparation: a Portfolio State is derived only from accepted ledger events and named
 * by a content-addressed version, so the same events always give the same state and version and any change to them
 * gives a new version. Exposures are not modelled (no exposure formula or price evidence contract exists yet).
 */
class PortfolioStateServiceTest {

    private static final Long PORTFOLIO = 7L;
    private static final String USER = "state-user";
    private static final LocalDate AS_OF = LocalDate.of(2026, 10, 20);

    private final InMemoryTransactionPort port = new InMemoryTransactionPort();
    private final PortfolioStateService service = new PortfolioStateService(port, new PortfolioLedgerService(port));

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
        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell());

        PortfolioHolding aapl = state.positions().get(0);
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
        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, List.of(
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
        PortfolioState inOrder = service.project(PORTFOLIO, USER, AS_OF, events);

        List<PortfolioTransaction> reversedEvents = new ArrayList<>(events);
        Collections.reverse(reversedEvents);
        PortfolioState reversed = service.project(PORTFOLIO, USER, AS_OF, reversedEvents);

        assertThat(reversed).isEqualTo(inOrder);
    }

    @Test
    void numericScaleDoesNotChangeTheVersion() {
        PortfolioTransaction scaled = new PortfolioTransaction(1L, PORTFOLIO, USER, "AAPL", PortfolioAssetType.US_STOCK,
                PortfolioTransactionAction.BUY, new BigDecimal("10.000000"), new BigDecimal("100.00"), "USD",
                new BigDecimal("0.00"), new BigDecimal("1.000000"), LocalDate.of(2026, 10, 1),
                PortfolioTransactionSource.MANUAL, null, null, null, "manual:fixture-1");

        assertThat(service.project(PORTFOLIO, USER, AS_OF, List.of(scaled)).version())
                .isEqualTo(service.project(PORTFOLIO, USER, AS_OF,
                        List.of(tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "100", 1))).version());
    }

    @Test
    void aCorrectionEventYieldsANewVersionAndThePriorEventsStillReplayThePriorState() {
        PortfolioState before = service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell());
        List<PortfolioTransaction> corrected = new ArrayList<>(buyThenPartialSell());
        corrected.add(tx(3, "AAPL", PortfolioTransactionAction.BUY, "4", "150", 3));

        PortfolioState after = service.project(PORTFOLIO, USER, AS_OF, corrected);

        assertThat(after.version()).isNotEqualTo(before.version());
        assertThat(after.positions().get(0).quantity()).isEqualByComparingTo("10");
        assertThat(service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell())).isEqualTo(before);
    }

    @Test
    void anyEconomicChangeToAnEventChangesTheVersion() {
        String base = service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell()).version();

        String repriced = service.project(PORTFOLIO, USER, AS_OF, List.of(
                tx(1, "AAPL", PortfolioTransactionAction.BUY, "10", "101", 1),
                tx(2, "AAPL", PortfolioTransactionAction.SELL, "4", "150", 2))).version();

        assertThat(repriced).isNotEqualTo(base);
    }

    @Test
    void eventsAfterTheAsOfDateAreExcluded() {
        List<PortfolioTransaction> events = new ArrayList<>(buyThenPartialSell());
        events.add(tx(3, "AAPL", PortfolioTransactionAction.BUY, "5", "100", 25));

        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, events);

        assertThat(state.sourceEventIds()).containsExactly(1L, 2L);
        assertThat(state).isEqualTo(service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell()));
    }

    @Test
    void theVersionIsAContentAddressNamingItsDerivation() {
        String version = service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell()).version();

        assertThat(version).matches("pstate-v1:[0-9a-f]{64}");
        assertThat(service.project(PORTFOLIO, USER, AS_OF.plusDays(1), buyThenPartialSell()).version())
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

        assertThatThrownBy(() -> service.project(PORTFOLIO, USER, AS_OF, List.of(unsaved)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.project(PORTFOLIO, USER, AS_OF, List.of(otherPortfolio)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.project(PORTFOLIO, "someone-else", AS_OF, buyThenPartialSell()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.project(PORTFOLIO, USER, AS_OF,
                List.of(buyThenPartialSell().get(0), buyThenPartialSell().get(0))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void stateAtReadsTheRetainedLedgerThroughThePort() {
        buyThenPartialSell().forEach(port::save);

        assertThat(service.stateAt(PORTFOLIO, USER, AS_OF))
                .isEqualTo(service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell()));
    }

    @Test
    void stateListsAreImmutable() {
        PortfolioState state = service.project(PORTFOLIO, USER, AS_OF, buyThenPartialSell());

        assertThatThrownBy(() -> state.positions().clear()).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> state.sourceEventIds().clear()).isInstanceOf(UnsupportedOperationException.class);
    }

    private static final class InMemoryTransactionPort implements PortfolioTransactionPort {
        private final List<PortfolioTransaction> saved = new ArrayList<>();

        @Override
        public List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId) {
            return saved.stream()
                    .filter(t -> t.portfolioId().equals(portfolioId) && t.userId().equals(userId))
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
        public void deleteByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId) {
            saved.removeIf(t -> t.id().equals(id));
        }
    }
}
