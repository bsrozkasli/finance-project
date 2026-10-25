package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/** R-24: LedgerChunk.add must decide and accumulate exactly like sequential addTransaction (fixed seed). */
class PortfolioLedgerChunkDifferentialTest {

    private static final Long PORTFOLIO = 3L;
    private static final String USER = "default";
    private static final String[] SYMBOLS = {"AAA", "BBB", "CCC", "DDD"};
    private static final PortfolioTransactionAction[] ACTIONS = {
            PortfolioTransactionAction.BUY, PortfolioTransactionAction.BUY, PortfolioTransactionAction.SELL,
            PortfolioTransactionAction.SELL, PortfolioTransactionAction.DIVIDEND, PortfolioTransactionAction.FEE};

    @Test
    void chunkedAdditionsMatchSequentialAdditionsOnRandomSequences() {
        Random random = new Random(20261025L);
        for (int sequence = 0; sequence < 300; sequence++) {
            Store sequential = new Store();
            Store chunked = new Store();
            PortfolioLedgerService sequentialLedger = LedgerTestSupport.ledger(sequential);
            PortfolioLedgerService chunkedLedger = LedgerTestSupport.ledger(chunked);

            int seeded = random.nextInt(6);
            for (int i = 0; i < seeded; i++) {
                PortfolioTransaction event = randomEvent(random);
                boolean accepted = tryAdd(sequentialLedger, event);
                assertThat(tryAdd(chunkedLedger, event)).isEqualTo(accepted);
            }

            List<PortfolioTransaction> candidates = new ArrayList<>();
            int count = 10 + random.nextInt(40);
            for (int i = 0; i < count; i++) {
                candidates.add(randomEvent(random));
            }
            List<Boolean> expected = new ArrayList<>();
            for (PortfolioTransaction candidate : candidates) {
                expected.add(tryAdd(sequentialLedger, candidate));
            }

            List<PortfolioHolding> chunkPositions = new ArrayList<>();
            List<Boolean> actual = chunkedLedger.inLedgerChunk(PORTFOLIO, USER, chunk -> {
                List<Boolean> decisions = new ArrayList<>();
                for (PortfolioTransaction candidate : candidates) {
                    try {
                        chunk.add(candidate);
                        decisions.add(true);
                    } catch (IllegalArgumentException e) {
                        decisions.add(false);
                    }
                }
                chunkPositions.addAll(chunk.positions());
                return decisions;
            });

            assertThat(actual).as("decisions, sequence %d", sequence).isEqualTo(expected);
            List<PortfolioHolding> replayed = sequentialLedger.calculatePositions(
                    sequential.findByPortfolioIdAndUserId(PORTFOLIO, USER));
            assertThat(chunked.saved).hasSameSizeAs(sequential.saved);
            for (PortfolioHolding holding : replayed) {
                PortfolioHolding other = chunkPositions.stream()
                        .filter(h -> h.symbol().equals(holding.symbol())).findFirst().orElseThrow();
                assertThat(other.quantity()).as("quantity %s #%d", holding.symbol(), sequence)
                        .isEqualByComparingTo(holding.quantity());
                assertThat(other.costBasis()).as("cost basis %s #%d", holding.symbol(), sequence)
                        .isEqualByComparingTo(holding.costBasis());
                assertThat(other.realizedPnl()).as("realized %s #%d", holding.symbol(), sequence)
                        .isEqualByComparingTo(holding.realizedPnl());
            }
            assertThat(chunkPositions).hasSameSizeAs(replayed);
        }
    }

    private static boolean tryAdd(PortfolioLedgerService ledger, PortfolioTransaction event) {
        try {
            ledger.addTransaction(event);
            return true;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private static PortfolioTransaction randomEvent(Random random) {
        PortfolioTransactionAction action = ACTIONS[random.nextInt(ACTIONS.length)];
        String symbol = SYMBOLS[random.nextInt(SYMBOLS.length)];
        boolean trade = action == PortfolioTransactionAction.BUY || action == PortfolioTransactionAction.SELL;
        BigDecimal quantity = trade ? BigDecimal.valueOf(1 + random.nextInt(10)) : null;
        BigDecimal price = BigDecimal.valueOf(1 + random.nextInt(200), 1);
        BigDecimal fee = BigDecimal.valueOf(random.nextInt(30), 1);
        BigDecimal fx = random.nextBoolean() ? BigDecimal.ONE : new BigDecimal("1.0" + (1 + random.nextInt(8)));
        return new PortfolioTransaction(null, PORTFOLIO, USER, symbol, PortfolioAssetType.US_STOCK, action, quantity,
                price, "USD", fee, fx, LocalDate.parse("2026-01-01").plusDays(random.nextInt(12)),
                PortfolioTransactionSource.MANUAL, null, null, null);
    }

    private static final class Store implements PortfolioTransactionPort {
        final List<PortfolioTransaction> saved = new ArrayList<>();
        private final AtomicLong ids = new AtomicLong();

        @Override
        public List<PortfolioTransaction> findByPortfolioIdAndUserId(Long portfolioId, String userId) {
            return saved.stream().sorted(Comparator.comparing(PortfolioTransaction::id)).toList();
        }

        @Override
        public Optional<PortfolioTransaction> findByIdAndPortfolioIdAndUserId(Long id, Long portfolioId,
                                                                              String userId) {
            return saved.stream().filter(t -> t.id().equals(id)).findFirst();
        }

        @Override
        public PortfolioTransaction save(PortfolioTransaction t) {
            PortfolioTransaction stored = new PortfolioTransaction(ids.incrementAndGet(), t.portfolioId(),
                    t.userId(), t.symbol(), t.assetType(), t.action(), t.quantity(), t.price(), t.currency(),
                    t.fee(), t.fxRateToBase(), t.tradeDate(), t.source(), t.notes(), null, null,
                    t.originLocator(), null);
            saved.add(stored);
            return stored;
        }

        @Override
        public void voidByIdAndPortfolioIdAndUserId(Long id, Long portfolioId, String userId, Instant voidedAt) {
            throw new UnsupportedOperationException();
        }

        @Override
        public List<PortfolioTransaction> findByIdsIncludingVoided(Long portfolioId, String userId,
                                                                   Collection<Long> ids) {
            return List.of();
        }

        @Override
        public boolean existsBySourceAndOriginLocator(PortfolioTransactionSource source, String originLocator) {
            return false;
        }

        @Override
        public Optional<PortfolioTransaction> findActiveBySourceAndOriginLocator(
                PortfolioTransactionSource source, String originLocator) {
            return Optional.empty();
        }
    }
}
