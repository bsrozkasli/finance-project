package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

public class PortfolioLedgerService {

    private final PortfolioTransactionPort transactionPort;

    public PortfolioLedgerService(PortfolioTransactionPort transactionPort) {
        this.transactionPort = Objects.requireNonNull(transactionPort, "transactionPort must not be null");
    }

    public PortfolioTransaction addTransaction(PortfolioTransaction transaction) {
        List<PortfolioTransaction> existing = transactionPort.findByPortfolioIdAndUserId(
                transaction.portfolioId(), transaction.userId());
        validateTransaction(existing, transaction);
        return transactionPort.save(transaction);
    }

    public List<PortfolioHolding> calculateHoldings(Long portfolioId, String userId) {
        return calculateHoldings(transactionPort.findByPortfolioIdAndUserId(portfolioId, userId));
    }

    public List<PortfolioHolding> calculateHoldings(List<PortfolioTransaction> transactions) {
        Map<String, Accumulator> bySymbol = new LinkedHashMap<>();
        for (PortfolioTransaction transaction : chronological(transactions)) {
            if (transaction.symbol() == null || transaction.symbol().isBlank()) {
                continue;
            }
            Accumulator acc = bySymbol.computeIfAbsent(transaction.symbol(), key -> new Accumulator(
                    transaction.portfolioId(), transaction.symbol(), transaction.assetType(), transaction.currency()));
            apply(acc, transaction);
        }
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
                .sorted(Comparator.comparing(PortfolioTransaction::tradeDate))
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
