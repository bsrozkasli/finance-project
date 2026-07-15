package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeCommand;
import com.ozkaslibasar.financeproject.domain.model.JournalTradePage;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStats;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.Optional;

public class JournalTradeService {

    private final JournalTradePort tradePort;
    private final PriceRefreshService priceRefreshService;

    public JournalTradeService(JournalTradePort tradePort, PriceRefreshService priceRefreshService) {
        this.tradePort = Objects.requireNonNull(tradePort, "tradePort must not be null");
        this.priceRefreshService = Objects.requireNonNull(priceRefreshService, "priceRefreshService must not be null");
    }

    public JournalTradePage list(String userId, int page, int size) {
        List<JournalTrade> all = enrichOpenTrades(tradePort.findByUserId(userId));
        int safeSize = Math.max(size, 1);
        int safePage = Math.max(page, 0);
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        int totalPages = all.isEmpty() ? 0 : (int) Math.ceil((double) all.size() / safeSize);
        return new JournalTradePage(all.subList(from, to), all.size(), totalPages, safePage);
    }

    public JournalTradeStats stats(String userId) {
        List<JournalTrade> all = enrichOpenTrades(tradePort.findByUserId(userId));
        int openTrades = (int) all.stream().filter(trade -> trade.status() == JournalTradeStatus.OPEN).count();
        List<JournalTrade> closed = all.stream()
                .filter(trade -> trade.status() == JournalTradeStatus.CLOSED)
                .toList();
        long wins = closed.stream()
                .filter(trade -> trade.returnPct().compareTo(BigDecimal.ZERO) > 0)
                .count();
        BigDecimal avgReturn = closed.isEmpty()
                ? BigDecimal.ZERO
                : closed.stream()
                .map(JournalTrade::returnPct)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(closed.size()), 4, RoundingMode.HALF_UP);
        String best = all.stream()
                .max((left, right) -> left.returnPct().compareTo(right.returnPct()))
                .map(JournalTrade::symbol)
                .orElse(null);
        String worst = all.stream()
                .min((left, right) -> left.returnPct().compareTo(right.returnPct()))
                .map(JournalTrade::symbol)
                .orElse(null);
        BigDecimal winRate = closed.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(wins)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(closed.size()), 4, RoundingMode.HALF_UP);
        return new JournalTradeStats(all.size(), openTrades, closed.size(), winRate, avgReturn, best, worst);
    }

    public JournalTrade add(JournalTradeCommand command) {
        return tradePort.save(toTrade(null, command));
    }

    public JournalTrade update(long id, JournalTradeCommand command) {
        tradePort.findByIdAndUserId(id, command.userId())
                .orElseThrow(() -> new NoSuchElementException("Trade not found: " + id));
        return tradePort.save(toTrade(id, command));
    }

    public void delete(long id, String userId) {
        tradePort.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new NoSuchElementException("Trade not found: " + id));
        tradePort.deleteByIdAndUserId(id, userId);
    }

    private JournalTrade toTrade(Long id, JournalTradeCommand command) {
        BigDecimal quantity = command.quantity();
        BigDecimal purchasePrice = command.purchasePrice();
        BigDecimal commission = command.commission() == null ? BigDecimal.ZERO : command.commission();
        JournalTradeStatus status = command.status() == null
                ? (command.closedAt() == null ? JournalTradeStatus.OPEN : JournalTradeStatus.CLOSED)
                : command.status();
        BigDecimal currentPrice = resolveCurrentPrice(
                command.symbol(),
                command.currentPrice(),
                purchasePrice,
                status);
        BigDecimal marketValue = quantity.multiply(currentPrice);
        BigDecimal pnl = currentPrice.subtract(purchasePrice).multiply(quantity).subtract(commission);
        BigDecimal costBasis = purchasePrice.multiply(quantity).add(commission);
        BigDecimal returnPct = costBasis.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : pnl.multiply(BigDecimal.valueOf(100)).divide(costBasis, 4, RoundingMode.HALF_UP);
        return new JournalTrade(
                id,
                command.userId(),
                command.symbol(),
                command.company(),
                command.type(),
                quantity,
                purchasePrice,
                currentPrice,
                marketValue,
                commission,
                command.strategy(),
                command.notes(),
                command.tags(),
                command.openedAt(),
                command.closedAt(),
                status,
                pnl,
                returnPct,
                null,
                command.portfolioId(),
                command.transactionId(),
                null,
                null);
    }

    private List<JournalTrade> enrichOpenTrades(List<JournalTrade> trades) {
        Map<String, Optional<BigDecimal>> latestPriceBySymbol = new HashMap<>();
        return trades.stream()
                .map(trade -> enrichOpenTrade(trade, latestPriceBySymbol))
                .toList();
    }

    private JournalTrade enrichOpenTrade(JournalTrade trade, Map<String, Optional<BigDecimal>> latestPriceBySymbol) {
        if (trade.status() != JournalTradeStatus.OPEN) {
            return trade;
        }
        Optional<BigDecimal> latestPrice = latestPriceBySymbol.computeIfAbsent(
                trade.symbol(),
                symbol -> priceRefreshService.getFreshLatest(symbol).map(PriceHistory::close));
        return latestPrice
                .map(price -> withCurrentPrice(trade, price))
                .orElse(trade);
    }

    private JournalTrade withCurrentPrice(JournalTrade trade, BigDecimal currentPrice) {
        BigDecimal marketValue = trade.quantity().multiply(currentPrice);
        BigDecimal pnl = currentPrice.subtract(trade.purchasePrice()).multiply(trade.quantity()).subtract(trade.commission());
        BigDecimal costBasis = trade.purchasePrice().multiply(trade.quantity()).add(trade.commission());
        BigDecimal returnPct = costBasis.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : pnl.multiply(BigDecimal.valueOf(100)).divide(costBasis, 4, RoundingMode.HALF_UP);
        return new JournalTrade(
                trade.id(),
                trade.userId(),
                trade.symbol(),
                trade.company(),
                trade.type(),
                trade.quantity(),
                trade.purchasePrice(),
                currentPrice,
                marketValue,
                trade.commission(),
                trade.strategy(),
                trade.notes(),
                trade.tags(),
                trade.openedAt(),
                trade.closedAt(),
                trade.status(),
                pnl,
                returnPct,
                null,
                trade.portfolioId(),
                trade.transactionId(),
                trade.createdAt(),
                trade.updatedAt());
    }

    private BigDecimal resolveCurrentPrice(
            String symbol,
            BigDecimal requestedCurrentPrice,
            BigDecimal fallbackPrice,
            JournalTradeStatus status) {
        if (requestedCurrentPrice != null) {
            return requestedCurrentPrice;
        }
        if (status == JournalTradeStatus.OPEN) {
            return priceRefreshService.getFreshLatest(symbol)
                    .map(PriceHistory::close)
                    .orElse(fallbackPrice);
        }
        return fallbackPrice;
    }
}
