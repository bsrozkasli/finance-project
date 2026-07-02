package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import com.ozkaslibasar.financeproject.domain.model.Portfolio;
import com.ozkaslibasar.financeproject.domain.model.PortfolioAssetType;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionAction;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransactionSource;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Tag(name = "Portfolios", description = "Portfolio accounts, transaction ledger, and derived holdings")
@RestController
@RequestMapping("/api/v1/portfolios")
@RequiredArgsConstructor
public class PortfolioManagementController {

    private static final String DEFAULT_USER = "default";

    private final PortfolioPort portfolioPort;
    private final PortfolioTransactionPort transactionPort;
    private final PortfolioLedgerService ledgerService;
    private final JournalTradePort journalTradePort;

    @GetMapping
    public List<Portfolio> listPortfolios() {
        return portfolioPort.findByUserId(DEFAULT_USER);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Portfolio createPortfolio(@RequestBody PortfolioRequest request) {
        return portfolioPort.save(new Portfolio(
                null,
                DEFAULT_USER,
                request.name(),
                request.baseCurrency(),
                request.description(),
                request.defaultPortfolio(),
                null,
                null));
    }

    @PutMapping("/{portfolioId}")
    public Portfolio updatePortfolio(@PathVariable Long portfolioId, @RequestBody PortfolioRequest request) {
        getPortfolio(portfolioId);
        return portfolioPort.save(new Portfolio(
                portfolioId,
                DEFAULT_USER,
                request.name(),
                request.baseCurrency(),
                request.description(),
                request.defaultPortfolio(),
                null,
                null));
    }

    @DeleteMapping("/{portfolioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePortfolio(@PathVariable Long portfolioId) {
        getPortfolio(portfolioId);
        portfolioPort.deleteByIdAndUserId(portfolioId, DEFAULT_USER);
    }

    @GetMapping("/{portfolioId}/transactions")
    public List<PortfolioTransaction> listTransactions(@PathVariable Long portfolioId) {
        getPortfolio(portfolioId);
        return transactionPort.findByPortfolioIdAndUserId(portfolioId, DEFAULT_USER);
    }

    @PostMapping("/{portfolioId}/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public PortfolioTransaction createTransaction(
            @PathVariable Long portfolioId,
            @RequestBody PortfolioTransactionRequest request) {
        Portfolio portfolio = getPortfolio(portfolioId);
        try {
            PortfolioTransaction saved = ledgerService.addTransaction(new PortfolioTransaction(
                    null,
                    portfolio.id(),
                    DEFAULT_USER,
                    request.symbol(),
                    request.assetType(),
                    request.action(),
                    request.quantity(),
                    request.price(),
                    request.currency() == null ? portfolio.baseCurrency() : request.currency(),
                    request.fee(),
                    request.fxRateToBase(),
                    request.tradeDate(),
                    request.source(),
                    request.notes(),
                    null,
                    null));
            createLinkedJournalEntry(portfolio, saved, request.journalNotes());
            return saved;
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), ex);
        }
    }

    @DeleteMapping("/{portfolioId}/transactions/{transactionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(@PathVariable Long portfolioId, @PathVariable Long transactionId) {
        getPortfolio(portfolioId);
        transactionPort.findByIdAndPortfolioIdAndUserId(transactionId, portfolioId, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found: " + transactionId));
        transactionPort.deleteByIdAndPortfolioIdAndUserId(transactionId, portfolioId, DEFAULT_USER);
    }

    @GetMapping("/{portfolioId}/holdings")
    public List<PortfolioHolding> listHoldings(@PathVariable Long portfolioId) {
        getPortfolio(portfolioId);
        return ledgerService.calculateHoldings(portfolioId, DEFAULT_USER);
    }

    private Portfolio getPortfolio(Long portfolioId) {
        return portfolioPort.findByIdAndUserId(portfolioId, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Portfolio not found: " + portfolioId));
    }

    private void createLinkedJournalEntry(Portfolio portfolio, PortfolioTransaction transaction, String journalNotes) {
        if (journalNotes == null || journalNotes.isBlank()) {
            return;
        }
        if (transaction.action() != PortfolioTransactionAction.BUY && transaction.action() != PortfolioTransactionAction.SELL) {
            return;
        }
        JournalTradeStatus status = transaction.action() == PortfolioTransactionAction.SELL
                ? JournalTradeStatus.CLOSED
                : JournalTradeStatus.OPEN;
        LocalDate closedAt = status == JournalTradeStatus.CLOSED ? transaction.tradeDate() : null;
        journalTradePort.save(new JournalTrade(
                null,
                DEFAULT_USER,
                transaction.symbol(),
                transaction.symbol(),
                transaction.action() == PortfolioTransactionAction.SELL ? JournalTradeType.SELL : JournalTradeType.BUY,
                transaction.quantity(),
                transaction.price(),
                transaction.price(),
                transaction.quantity().multiply(transaction.price()),
                transaction.fee(),
                portfolio.name(),
                journalNotes,
                List.of("portfolio-ledger"),
                transaction.tradeDate(),
                closedAt,
                status,
                null,
                null,
                null,
                portfolio.id(),
                transaction.id(),
                null,
                null));
    }

    public record PortfolioRequest(
            String name,
            String baseCurrency,
            String description,
            boolean defaultPortfolio) {
    }

    public record PortfolioTransactionRequest(
            String symbol,
            PortfolioAssetType assetType,
            PortfolioTransactionAction action,
            BigDecimal quantity,
            BigDecimal price,
            String currency,
            BigDecimal fee,
            BigDecimal fxRateToBase,
            LocalDate tradeDate,
            PortfolioTransactionSource source,
            String notes,
            String journalNotes) {
    }
}
