package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioLedgerLockPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.function.Function;

public class PortfolioLedgerService {

    private final PortfolioTransactionPort transactionPort;
    private final PortfolioLedgerLockPort lockPort;

    public PortfolioLedgerService(PortfolioTransactionPort transactionPort, PortfolioLedgerLockPort lockPort) {
        this.transactionPort = Objects.requireNonNull(transactionPort, "transactionPort must not be null");
        this.lockPort = Objects.requireNonNull(lockPort, "lockPort must not be null");
    }

    /**
     * Validates against the active events and saves, serialized per portfolio (R-13) so concurrent additions cannot
     * jointly oversell a position. A CSV event whose locator already exists throws
     * {@link DuplicateOriginLocatorException}; the check runs under the lock so the unique index is never hit.
     */
    public PortfolioTransaction addTransaction(PortfolioTransaction transaction) {
        return lockPort.withPortfolioLock(transaction.portfolioId(), () -> {
            refuseKnownCsvLocator(transaction);
            List<PortfolioTransaction> existing = transactionPort.findByPortfolioIdAndUserId(
                    transaction.portfolioId(), transaction.userId());
            validateTransaction(existing, transaction);
            return transactionPort.save(transaction);
        });
    }

    /**
     * Runs {@code work} under the per-portfolio lock with a {@link LedgerChunk} seeded once from the active events
     * (R-21). Each {@link LedgerChunk#add} applies the same ledger rules as {@link #addTransaction} but validates
     * incrementally instead of re-reading and replaying the whole ledger per event. Everything the work writes
     * commits or rolls back together, so callers keep chunks bounded.
     */
    public <T> T inLedgerChunk(Long portfolioId, String userId, Function<LedgerChunk, T> work) {
        Objects.requireNonNull(work, "work must not be null");
        return lockPort.withPortfolioLock(portfolioId, () -> work.apply(
                new LedgerChunk(new ArrayList<>(transactionPort.findByPortfolioIdAndUserId(portfolioId, userId)))));
    }

    private void refuseKnownCsvLocator(PortfolioTransaction transaction) {
        if (transaction.source() == PortfolioTransactionSource.CSV && transaction.originLocator() != null
                && transactionPort.existsBySourceAndOriginLocator(transaction.source(),
                transaction.originLocator())) {
            throw new DuplicateOriginLocatorException(transaction.originLocator());
        }
    }

    /**
     * A running view of one portfolio's active ledger, valid only inside {@link #inLedgerChunk}. An event dated on
     * or after every event already in the view sorts last in {@link #chronological}, so it is applied to the running
     * positions directly; an earlier-dated (back-dated) event could change how later events replay, so it is
     * validated by a full in-memory replay, exactly as {@link #addTransaction} does.
     */
    public final class LedgerChunk {
        private final List<PortfolioTransaction> events;
        private Map<String, Accumulator> positions = new LinkedHashMap<>();
        private LocalDate latestTradeDate;
        private IllegalArgumentException unusableLedger;

        private LedgerChunk(List<PortfolioTransaction> events) {
            this.events = events;
            try {
                reseed();
            } catch (IllegalArgumentException e) {
                // The stored ledger no longer replays: every addition is refused with that reason, as before.
                unusableLedger = e;
            }
        }

        /**
         * Validates against the view, saves and extends the view.
         *
         * @throws DuplicateOriginLocatorException when a CSV event with the locator already exists
         * @throws IllegalArgumentException when the event is invalid against the ledger (the view is unchanged)
         */
        public PortfolioTransaction add(PortfolioTransaction transaction) {
            refuseKnownCsvLocator(transaction);
            if (unusableLedger != null) {
                throw new IllegalArgumentException(unusableLedger.getMessage(), unusableLedger);
            }
            boolean appendsLast = latestTradeDate == null || !transaction.tradeDate().isBefore(latestTradeDate);
            if (appendsLast) {
                applyTransaction(positions, transaction);
            } else {
                validateTransaction(events, transaction);
            }
            PortfolioTransaction saved = transactionPort.save(transaction);
            events.add(saved);
            if (appendsLast) {
                latestTradeDate = saved.tradeDate();
            } else {
                reseed();
            }
            return saved;
        }

        private void reseed() {
            positions = new LinkedHashMap<>();
            latestTradeDate = null;
            for (PortfolioTransaction event : chronological(events)) {
                applyTransaction(positions, event);
                latestTradeDate = event.tradeDate();
            }
        }
    }

    /**
     * Voids one active event under the same per-portfolio lock as additions (R-17). The remaining active events are
     * replayed first; if that is invalid nothing changes and {@link LedgerInconsistencyException} is thrown. Otherwise
     * {@code sameTransactionWork} (for example the linked journal delete) runs and then the event is voided, all in
     * the lock's transaction, so they commit or roll back together.
     *
     * @throws NoSuchElementException when the id is not an active event of the portfolio
     */
    public void voidTransaction(Long portfolioId, String userId, Long transactionId, Instant voidedAt,
                                Runnable sameTransactionWork) {
        Objects.requireNonNull(sameTransactionWork, "sameTransactionWork must not be null");
        lockPort.withPortfolioLock(portfolioId, () -> {
            List<PortfolioTransaction> active = transactionPort.findByPortfolioIdAndUserId(portfolioId, userId);
            PortfolioTransaction target = active.stream()
                    .filter(t -> Objects.equals(t.id(), transactionId))
                    .findFirst()
                    .orElseThrow(() -> new NoSuchElementException("Transaction not found: " + transactionId));
            List<PortfolioTransaction> remaining = active.stream().filter(t -> t != target).toList();
            try {
                calculatePositions(remaining);
            } catch (IllegalArgumentException ex) {
                throw new LedgerInconsistencyException(target.symbol(),
                        "Cannot delete transaction " + transactionId + " (" + target.symbol() + "): "
                                + ex.getMessage(), ex);
            }
            sameTransactionWork.run();
            transactionPort.voidByIdAndPortfolioIdAndUserId(transactionId, portfolioId, userId, voidedAt);
            return null;
        });
    }

    public List<PortfolioHolding> calculateHoldings(Long portfolioId, String userId) {
        return calculateHoldings(transactionPort.findByPortfolioIdAndUserId(portfolioId, userId));
    }

    public List<PortfolioHolding> calculateHoldings(List<PortfolioTransaction> transactions) {
        Map<String, Accumulator> bySymbol = new LinkedHashMap<>();
        for (PortfolioTransaction transaction : chronological(transactions)) {
            applyTransaction(bySymbol, transaction);
        }
        return holdingsFrom(bySymbol);
    }

    /** Every traded symbol, including positions closed back to zero, so their realized activity is kept. */
    public List<PortfolioHolding> calculatePositions(List<PortfolioTransaction> transactions) {
        Map<String, Accumulator> bySymbol = new LinkedHashMap<>();
        for (PortfolioTransaction transaction : chronological(transactions)) {
            applyTransaction(bySymbol, transaction);
        }
        return bySymbol.values().stream().map(Accumulator::toHolding).toList();
    }

    public Map<LocalDate, List<PortfolioHolding>> calculateHoldingsByDate(
            List<PortfolioTransaction> transactions,
            List<LocalDate> valuationDates) {
        List<PortfolioTransaction> orderedTransactions = chronological(transactions);
        List<LocalDate> orderedDates = valuationDates.stream()
                .map(date -> Objects.requireNonNull(date, "valuation date must not be null"))
                .distinct()
                .sorted()
                .toList();

        Map<String, Accumulator> bySymbol = new LinkedHashMap<>();
        Map<LocalDate, List<PortfolioHolding>> snapshots = new LinkedHashMap<>();
        int transactionIndex = 0;
        for (LocalDate valuationDate : orderedDates) {
            while (transactionIndex < orderedTransactions.size()
                    && !orderedTransactions.get(transactionIndex).tradeDate().isAfter(valuationDate)) {
                applyTransaction(bySymbol, orderedTransactions.get(transactionIndex));
                transactionIndex++;
            }
            snapshots.put(valuationDate, holdingsFrom(bySymbol));
        }
        return snapshots;
    }

    private void applyTransaction(Map<String, Accumulator> bySymbol, PortfolioTransaction transaction) {
        if (transaction.symbol() == null || transaction.symbol().isBlank()) {
            return;
        }
        Accumulator acc = bySymbol.computeIfAbsent(transaction.symbol(), key -> new Accumulator(
                transaction.portfolioId(), transaction.symbol(), transaction.assetType(), transaction.currency()));
        apply(acc, transaction);
    }

    private List<PortfolioHolding> holdingsFrom(Map<String, Accumulator> bySymbol) {
        return bySymbol.values().stream()
                .filter(acc -> acc.quantity.compareTo(BigDecimal.ZERO) > 0)
                .map(Accumulator::toHolding)
                .toList();
    }

    private void validateTransaction(List<PortfolioTransaction> existing, PortfolioTransaction candidate) {
        List<PortfolioTransaction> withCandidate = new ArrayList<>(existing);
        withCandidate.add(candidate);
        calculateHoldings(withCandidate);
    }

    private List<PortfolioTransaction> chronological(List<PortfolioTransaction> transactions) {
        return transactions.stream()
                .sorted(Comparator.comparing(PortfolioTransaction::tradeDate)
                        .thenComparing(PortfolioTransaction::id, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    private void apply(Accumulator acc, PortfolioTransaction transaction) {
        switch (transaction.action()) {
            case BUY -> applyBuy(acc, transaction);
            case SELL -> applySell(acc, transaction);
            case DIVIDEND -> acc.realizedPnl = acc.realizedPnl.add(toBase(transaction.price(), transaction.fxRateToBase()));
            case FEE -> acc.realizedPnl = acc.realizedPnl.subtract(toBase(transaction.fee(), transaction.fxRateToBase()));
            case MANUAL_VALUATION, CASH_DEPOSIT, CASH_WITHDRAWAL, TRANSFER_IN, TRANSFER_OUT -> {
                // These actions are part of the ledger but do not change share holdings.
            }
        }
    }

    private void applyBuy(Accumulator acc, PortfolioTransaction transaction) {
        BigDecimal gross = transaction.quantity().multiply(transaction.price()).add(transaction.fee());
        acc.quantity = acc.quantity.add(transaction.quantity());
        acc.costBasis = acc.costBasis.add(toBase(gross, transaction.fxRateToBase()));
        acc.assetType = transaction.assetType();
        acc.currency = transaction.currency();
    }

    private void applySell(Accumulator acc, PortfolioTransaction transaction) {
        if (acc.quantity.compareTo(transaction.quantity()) < 0) {
            throw new IllegalArgumentException("sell quantity exceeds current holding for " + transaction.symbol());
        }
        BigDecimal averageCost = acc.averageCost();
        BigDecimal removedCost = averageCost.multiply(transaction.quantity());
        BigDecimal proceeds = transaction.quantity().multiply(transaction.price()).subtract(transaction.fee());
        BigDecimal proceedsBase = toBase(proceeds, transaction.fxRateToBase());
        acc.quantity = acc.quantity.subtract(transaction.quantity());
        acc.costBasis = acc.costBasis.subtract(removedCost);
        acc.realizedPnl = acc.realizedPnl.add(proceedsBase.subtract(removedCost));
        if (acc.quantity.compareTo(BigDecimal.ZERO) == 0) {
            acc.costBasis = BigDecimal.ZERO;
        }
    }

    private BigDecimal toBase(BigDecimal value, BigDecimal fxRateToBase) {
        return value.multiply(fxRateToBase);
    }

    private static final class Accumulator {
        private final Long portfolioId;
        private final String symbol;
        private PortfolioAssetType assetType;
        private String currency;
        private BigDecimal quantity = BigDecimal.ZERO;
        private BigDecimal costBasis = BigDecimal.ZERO;
        private BigDecimal realizedPnl = BigDecimal.ZERO;

        private Accumulator(Long portfolioId, String symbol, PortfolioAssetType assetType, String currency) {
            this.portfolioId = portfolioId;
            this.symbol = symbol;
            this.assetType = assetType;
            this.currency = currency;
        }

        private BigDecimal averageCost() {
            if (quantity.compareTo(BigDecimal.ZERO) == 0) {
                return BigDecimal.ZERO;
            }
            return costBasis.divide(quantity, 8, RoundingMode.HALF_UP);
        }

        private PortfolioHolding toHolding() {
            return new PortfolioHolding(portfolioId, symbol, assetType, quantity, averageCost(), costBasis, realizedPnl, currency);
        }
    }
}
