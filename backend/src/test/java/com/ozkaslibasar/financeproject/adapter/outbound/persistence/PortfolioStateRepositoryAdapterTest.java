package com.ozkaslibasar.financeproject.adapter.outbound.persistence;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.AssetMetadataStatus;
import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ExposureStatus;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.StoredPortfolioState;
import com.ozkaslibasar.financeproject.domain.model.ValuationInput;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioStatePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioStateService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * EPIC-002 Task 3 / D-3: Portfolio States are stored append-only and replay from their stored event ids and
 * valuation inputs, also after an event is voided (R-4). Real PostgreSQL, because the unique key, the foreign keys
 * and numeric scale are database behaviour.
 */
@SpringBootTest
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class PortfolioStateRepositoryAdapterTest {

    private static final String USER = "state-adapter-user";
    private static final String SYMBOL = "STATEAD";
    private static final LocalDate AS_OF = LocalDate.of(2026, 10, 20);

    @Autowired
    private PortfolioStatePort statePort;
    @Autowired
    private PortfolioStateService stateService;
    @Autowired
    private PortfolioPort portfolioPort;
    @Autowired
    private PortfolioTransactionPort transactionPort;
    @Autowired
    private PortfolioLedgerService ledger;
    @Autowired
    private AssetRepositoryPort assets;
    @Autowired
    private PriceRepositoryPort prices;
    @Autowired
    private JdbcTemplate jdbc;

    private Long portfolioId;

    @AfterEach
    void cleanUp() {
        if (portfolioId != null) {
            portfolioPort.deleteByIdAndUserId(portfolioId, USER);
        }
        jdbc.update("DELETE FROM price_history WHERE asset_id = ?", SYMBOL);
        jdbc.update("DELETE FROM assets WHERE symbol = ?", SYMBOL);
    }

    private PortfolioTransaction buy(String quantity, String price, int day) {
        return new PortfolioTransaction(null, portfolioId, USER, SYMBOL, PortfolioAssetType.US_STOCK,
                PortfolioTransactionAction.BUY, new BigDecimal(quantity), new BigDecimal(price), "USD",
                BigDecimal.ZERO, BigDecimal.ONE, LocalDate.of(2026, 10, day), PortfolioTransactionSource.MANUAL,
                null, null, null);
    }

    private void seedPricedLedger() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "State adapter", "USD", null, false, null, null))
                .id();
        ledger.addTransaction(buy("10", "100.25", 1));
        ledger.addTransaction(buy("5", "101", 2));
        assets.save(new Asset(SYMBOL, "State adapter", AssetType.STOCK, "NASDAQ", "USD", "fixture", SYMBOL,
                AssetMetadataStatus.VERIFIED));
        BigDecimal close = new BigDecimal("130.5000");
        prices.saveAll(List.of(new PriceHistory(SYMBOL, close, close, close, close, BigDecimal.ONE,
                AS_OF.atStartOfDay())));
    }

    private static StoredPortfolioState stored(Long portfolioId, String version, List<Long> eventIds,
                                               List<ValuationInput> inputs) {
        return new StoredPortfolioState(version, portfolioId, USER, AS_OF, "USD", ExposureStatus.PARTIAL, eventIds,
                inputs, null);
    }

    @Test
    void aSavedStateIsReadBackWithEventsInputsAndNullsIntact() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Round trip", "USD", null, false, null, null))
                .id();
        List<ValuationInput> inputs = List.of(
                new ValuationInput("AAA", new BigDecimal("12.3456"), LocalDate.of(2026, 10, 19), "USD"),
                new ValuationInput("BBB", null, null, null));

        PortfolioStatePort.SaveResult saved =
                statePort.saveIfAbsent(stored(portfolioId, "pstate-v2:round", List.of(30L, 10L, 20L), inputs));

        assertThat(saved.created()).isTrue();
        StoredPortfolioState reread = statePort.findByVersion(portfolioId, USER, "pstate-v2:round").orElseThrow();
        assertThat(reread.createdAt()).isNotNull();
        assertThat(reread.asOf()).isEqualTo(AS_OF);
        assertThat(reread.baseCurrency()).isEqualTo("USD");
        assertThat(reread.exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
        assertThat(reread.eventIds()).containsExactlyInAnyOrder(10L, 20L, 30L);
        assertThat(reread.valuationInputs()).hasSize(2);
        ValuationInput aaa = reread.valuationInputs().stream().filter(i -> i.symbol().equals("AAA")).findFirst()
                .orElseThrow();
        assertThat(aaa.close()).isEqualByComparingTo("12.3456");
        assertThat(aaa.priceDate()).isEqualTo(LocalDate.of(2026, 10, 19));
        assertThat(aaa.priceCurrency()).isEqualTo("USD");
        ValuationInput bbb = reread.valuationInputs().stream().filter(i -> i.symbol().equals("BBB")).findFirst()
                .orElseThrow();
        assertThat(bbb.close()).isNull();
        assertThat(bbb.priceDate()).isNull();
        assertThat(bbb.priceCurrency()).isNull();
    }

    @Test
    void savingAnExistingVersionIsIdempotentAndChangesNothing() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Idempotent", "USD", null, false, null, null))
                .id();
        PortfolioStatePort.SaveResult first = statePort.saveIfAbsent(stored(portfolioId, "pstate-v2:idem",
                List.of(1L), List.of(new ValuationInput("AAA", BigDecimal.ONE, AS_OF, "USD"))));

        PortfolioStatePort.SaveResult second = statePort.saveIfAbsent(stored(portfolioId, "pstate-v2:idem",
                List.of(1L, 2L), List.of()));

        assertThat(first.created()).isTrue();
        assertThat(second.created()).isFalse();
        assertThat(second.stored().createdAt()).isEqualTo(first.stored().createdAt());
        assertThat(second.stored().eventIds()).containsExactly(1L);
        assertThat(second.stored().valuationInputs()).hasSize(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM portfolio_states WHERE portfolio_id = ?",
                Integer.class, portfolioId)).isEqualTo(1);
    }

    @Test
    void theUniqueKeyIsEnforcedByTheDatabaseAndScopedToThePortfolioAndUser() {
        portfolioId = portfolioPort.save(new Portfolio(null, USER, "Unique", "USD", null, false, null, null)).id();
        statePort.saveIfAbsent(stored(portfolioId, "pstate-v2:unique", List.of(), List.of()));

        assertThatThrownBy(() -> jdbc.update("INSERT INTO portfolio_states (portfolio_id, user_id, version, as_of, "
                        + "base_currency, exposure_status, created_at) VALUES (?, ?, ?, ?, 'USD', 'EMPTY', now())",
                portfolioId, USER, "pstate-v2:unique", AS_OF))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(statePort.findByVersion(portfolioId, "someone-else", "pstate-v2:unique")).isEmpty();
        assertThat(statePort.findByVersion(portfolioId + 1000, USER, "pstate-v2:unique")).isEmpty();
    }

    @Test
    void aMixedCasePriceCurrencyIsStoredExactlyAndReplaysToTheSameMismatchState() {
        seedPricedLedger();
        assets.save(new Asset(SYMBOL, "State adapter", AssetType.STOCK, "LSE", "GBp", "fixture", SYMBOL,
                AssetMetadataStatus.VERIFIED));

        PortfolioStateService.CreatedState created = stateService.create(portfolioId, USER, AS_OF);

        assertThat(created.state().positions().get(0).valuationStatus())
                .isEqualTo(com.ozkaslibasar.financeproject.domain.model.PositionValuationStatus.CURRENCY_MISMATCH);
        assertThat(created.state().positions().get(0).marketValue()).isNull();
        assertThat(created.state().exposureStatus()).isEqualTo(ExposureStatus.PARTIAL);
        assertThat(jdbc.queryForObject("SELECT v.price_currency FROM portfolio_state_valuations v "
                + "JOIN portfolio_states s ON s.id = v.state_id WHERE s.portfolio_id = ? AND s.version = ?",
                String.class, portfolioId, created.state().version())).isEqualTo("GBp");
        PortfolioState replayed = stateService.replay(portfolioId, USER, created.state().version()).orElseThrow();
        assertThat(replayed.version()).isEqualTo(created.state().version());
        assertThat(replayed.valuationInputs().get(0).priceCurrency()).isEqualTo("GBp");
    }

    @Test
    void aStateReplaysAfterItsEventsAreVoidedAndAfterThePricesAreGone() {
        seedPricedLedger();
        PortfolioStateService.CreatedState created = stateService.create(portfolioId, USER, AS_OF);
        assertThat(created.created()).isTrue();
        assertThat(created.state().exposureStatus()).isEqualTo(ExposureStatus.COMPLETE);

        List<Long> ids = created.state().sourceEventIds();
        ids.forEach(id -> transactionPort.voidByIdAndPortfolioIdAndUserId(id, portfolioId, USER,
                Instant.parse("2026-10-25T09:00:00Z")));
        jdbc.update("DELETE FROM price_history WHERE asset_id = ?", SYMBOL);
        assertThat(transactionPort.findByPortfolioIdAndUserId(portfolioId, USER)).isEmpty();

        PortfolioState replayed = stateService.replay(portfolioId, USER, created.state().version()).orElseThrow();

        assertThat(replayed.version()).isEqualTo(created.state().version());
        assertThat(replayed.sourceEventIds()).isEqualTo(ids);
        assertThat(replayed.exposureStatus()).isEqualTo(ExposureStatus.COMPLETE);
        assertThat(replayed.positions().get(0).marketValue()).isEqualByComparingTo("1957.50");
        assertThat(stateService.create(portfolioId, USER, AS_OF).created()).isTrue();
    }

    @Test
    void creatingTheSameStateTwiceStoresOneVersion() {
        seedPricedLedger();

        PortfolioStateService.CreatedState first = stateService.create(portfolioId, USER, AS_OF);
        PortfolioStateService.CreatedState second = stateService.create(portfolioId, USER, AS_OF);

        assertThat(first.created()).isTrue();
        assertThat(second.created()).isFalse();
        assertThat(second.state().version()).isEqualTo(first.state().version());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM portfolio_states WHERE portfolio_id = ?",
                Integer.class, portfolioId)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM portfolio_state_events", Integer.class))
                .isGreaterThanOrEqualTo(2);
    }
}
