package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Derives Portfolio State from accepted ledger events only (PRD-FR-014); it stores nothing. The version is a SHA-256
 * over the derivation name, the portfolio, user and as-of date, and each event's economic and lineage fields in id
 * order, with numbers written without trailing zeros. The same events therefore give the same version in any order
 * and after a database round-trip, and any added or changed event gives a new one. Notes and timestamps are not part
 * of the state and do not affect it.
 */
public class PortfolioStateService {

    private static final String DERIVATION = "pstate-v1";

    private final PortfolioTransactionPort transactionPort;
    private final PortfolioLedgerService ledger;

    public PortfolioStateService(PortfolioTransactionPort transactionPort, PortfolioLedgerService ledger) {
        this.transactionPort = Objects.requireNonNull(transactionPort, "transactionPort must not be null");
        this.ledger = Objects.requireNonNull(ledger, "ledger must not be null");
    }

    public PortfolioState stateAt(Long portfolioId, String userId, LocalDate asOf) {
        return project(portfolioId, userId, asOf, transactionPort.findByPortfolioIdAndUserId(portfolioId, userId));
    }

    public PortfolioState project(Long portfolioId, String userId, LocalDate asOf, List<PortfolioTransaction> events) {
        Objects.requireNonNull(portfolioId, "portfolioId must not be null");
        Objects.requireNonNull(userId, "userId must not be null");
        Objects.requireNonNull(asOf, "asOf must not be null");
        Set<Long> ids = new HashSet<>();
        for (PortfolioTransaction event : events) {
            if (event.id() == null) {
                throw new IllegalArgumentException("only accepted ledger events with an id can form a state");
            }
            if (!event.portfolioId().equals(portfolioId) || !event.userId().equals(userId)) {
                throw new IllegalArgumentException("event " + event.id() + " belongs to another portfolio or user");
            }
            if (!ids.add(event.id())) {
                throw new IllegalArgumentException("duplicate ledger event " + event.id());
            }
        }
        List<PortfolioTransaction> included = events.stream()
                .filter(event -> !event.tradeDate().isAfter(asOf))
                .sorted(Comparator.comparing(PortfolioTransaction::id))
                .toList();
        return new PortfolioState(version(portfolioId, userId, asOf, included), portfolioId, userId, asOf,
                included.stream().map(PortfolioTransaction::id).toList(), ledger.calculatePositions(included));
    }

    private static String version(Long portfolioId, String userId, LocalDate asOf, List<PortfolioTransaction> events) {
        StringBuilder canonical = new StringBuilder();
        append(canonical, DERIVATION, portfolioId.toString(), userId, asOf.toString());
        for (PortfolioTransaction e : events) {
            append(canonical, e.id().toString(), e.symbol(), e.assetType().name(), e.action().name(),
                    number(e.quantity()), number(e.price()), e.currency(), number(e.fee()), number(e.fxRateToBase()),
                    e.tradeDate().toString(), e.source().name(), e.originLocator());
        }
        return DERIVATION + ":" + HexFormat.of().formatHex(sha256(canonical.toString()));
    }

    /** Length-prefixed, so no field value can be confused with a separator. Null is written as length -1. */
    private static void append(StringBuilder out, String... fields) {
        for (String field : fields) {
            if (field == null) {
                out.append("-1:");
            } else {
                out.append(field.length()).append(':').append(field);
            }
        }
        out.append('\n');
    }

    private static String number(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static byte[] sha256(String text) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
