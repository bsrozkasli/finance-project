package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.Asset;
import com.ozkaslibasar.financeproject.domain.model.ExposureStatus;
import com.ozkaslibasar.financeproject.domain.model.PortfolioHolding;
import com.ozkaslibasar.financeproject.domain.model.PortfolioState;
import com.ozkaslibasar.financeproject.domain.model.PortfolioStatePosition;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import com.ozkaslibasar.financeproject.domain.model.PositionValuationStatus;
import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.ValuationInput;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

/**
 * Derives Portfolio State from accepted ledger events only (PRD-FR-014); it stores nothing. Open positions are valued
 * only from retained prices and fail closed (decision D-2); nothing is fetched from providers. The version is a
 * SHA-256 over the derivation name, the portfolio, user, as-of date and base currency, each event's economic and
 * lineage fields in id order, and, per position in symbol order, its valuation status and price inputs, with numbers
 * written without trailing zeros. The same events and prices therefore give the same version in any order and after a
 * database round-trip, and any added or changed event or price gives a new one. Notes, timestamps and {@code voidedAt}
 * are not part of the state and do not affect it, so a stored state still replays after an event is voided.
 */
public class PortfolioStateService {

    private static final String DERIVATION = "pstate-v2";
    /** A close at most this many calendar days older than the as-of date is current (D-2). */
    private static final long STALE_AFTER_DAYS = 7;
    private static final int WEIGHT_SCALE = 10;

    private final PortfolioTransactionPort transactionPort;
    private final PortfolioLedgerService ledger;
    private final PriceRepositoryPort priceRepository;
    private final AssetRepositoryPort assetRepository;
    private final PortfolioPort portfolioPort;

    public PortfolioStateService(PortfolioTransactionPort transactionPort, PortfolioLedgerService ledger,
                                 PriceRepositoryPort priceRepository, AssetRepositoryPort assetRepository,
                                 PortfolioPort portfolioPort) {
        this.transactionPort = Objects.requireNonNull(transactionPort, "transactionPort must not be null");
        this.ledger = Objects.requireNonNull(ledger, "ledger must not be null");
        this.priceRepository = Objects.requireNonNull(priceRepository, "priceRepository must not be null");
        this.assetRepository = Objects.requireNonNull(assetRepository, "assetRepository must not be null");
        this.portfolioPort = Objects.requireNonNull(portfolioPort, "portfolioPort must not be null");
    }

    public PortfolioState stateAt(Long portfolioId, String userId, LocalDate asOf) {
        String baseCurrency = portfolioPort.findByIdAndUserId(portfolioId, userId)
                .orElseThrow(() -> new IllegalArgumentException("portfolio " + portfolioId + " not found"))
                .baseCurrency();
        return project(portfolioId, userId, asOf, baseCurrency,
                transactionPort.findByPortfolioIdAndUserId(portfolioId, userId));
    }

    /** Values open positions from the latest stored close on or before {@code asOf}, then delegates. */
    public PortfolioState project(Long portfolioId, String userId, LocalDate asOf, String baseCurrency,
                                  List<PortfolioTransaction> events) {
        List<PortfolioTransaction> included = validatedEvents(portfolioId, userId, asOf, events);
        List<ValuationInput> inputs = ledger.calculatePositions(included).stream()
                .filter(holding -> holding.quantity().signum() != 0)
                .map(holding -> readInput(holding.symbol(), asOf))
                .toList();
        return build(portfolioId, userId, asOf, baseCurrency, included, inputs);
    }

    /**
     * Derives the state from explicit valuation inputs instead of reading prices, so a stored state can be replayed
     * with the inputs it was derived from. An open position without an input is treated as having no price and no
     * known currency.
     */
    public PortfolioState project(Long portfolioId, String userId, LocalDate asOf, String baseCurrency,
                                  List<PortfolioTransaction> events, List<ValuationInput> valuationInputs) {
        Objects.requireNonNull(valuationInputs, "valuationInputs must not be null");
        return build(portfolioId, userId, asOf, baseCurrency,
                validatedEvents(portfolioId, userId, asOf, events), valuationInputs);
    }

    private static List<PortfolioTransaction> validatedEvents(Long portfolioId, String userId, LocalDate asOf,
                                                              List<PortfolioTransaction> events) {
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
        return events.stream()
                .filter(event -> !event.tradeDate().isAfter(asOf))
                .sorted(Comparator.comparing(PortfolioTransaction::id))
                .toList();
    }

    private ValuationInput readInput(String symbol, LocalDate asOf) {
        Instant endOfAsOfDay = asOf.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC).minusNanos(1);
        Optional<PriceHistory> latest = priceRepository.findByAssetIdAndPeriod(symbol, Instant.EPOCH, endOfAsOfDay)
                .stream()
                .filter(price -> !price.timestamp().toLocalDate().isAfter(asOf))
                .max(Comparator.comparing(PriceHistory::timestamp));
        String currency = assetRepository.findBySymbol(symbol).map(Asset::currency).orElse(null);
        return new ValuationInput(symbol, latest.map(PriceHistory::close).orElse(null),
                latest.map(price -> price.timestamp().toLocalDate()).orElse(null), currency);
    }

    private PortfolioState build(Long portfolioId, String userId, LocalDate asOf, String baseCurrency,
                                 List<PortfolioTransaction> included, List<ValuationInput> suppliedInputs) {
        if (baseCurrency == null || baseCurrency.isBlank()) {
            throw new IllegalArgumentException("baseCurrency must not be blank");
        }
        String base = baseCurrency.trim().toUpperCase();
        Map<String, ValuationInput> supplied = new HashMap<>();
        for (ValuationInput input : suppliedInputs) {
            if (supplied.put(input.symbol(), input) != null) {
                throw new IllegalArgumentException("duplicate valuation input for " + input.symbol());
            }
            if (input.priceDate() != null && input.priceDate().isAfter(asOf)) {
                throw new IllegalArgumentException("valuation input for " + input.symbol() + " is after asOf");
            }
        }

        List<PortfolioHolding> holdings = ledger.calculatePositions(included).stream()
                .sorted(Comparator.comparing(PortfolioHolding::symbol))
                .toList();
        List<PortfolioStatePosition> positions = new ArrayList<>();
        List<ValuationInput> usedInputs = new ArrayList<>();
        for (PortfolioHolding holding : holdings) {
            if (holding.quantity().signum() == 0) {
                positions.add(position(holding, PositionValuationStatus.CLOSED, null, null, null));
                continue;
            }
            ValuationInput input = normalized(supplied.getOrDefault(holding.symbol(),
                    new ValuationInput(holding.symbol(), null, null, null)));
            usedInputs.add(input);
            PositionValuationStatus status = status(holding, input, base, asOf);
            boolean valued = status == PositionValuationStatus.PRICED || status == PositionValuationStatus.STALE_PRICE;
            positions.add(position(holding, status, valued ? input.close() : null,
                    valued ? input.priceDate() : null,
                    valued ? holding.quantity().multiply(input.close()) : null));
        }

        Map<String, BigDecimal> assetTypeWeights = new TreeMap<>();
        ExposureStatus exposureStatus = weigh(positions, assetTypeWeights);

        List<Long> eventIds = included.stream().map(PortfolioTransaction::id).toList();
        String version = version(portfolioId, userId, asOf, base, included, positions, usedInputs);
        return new PortfolioState(version, portfolioId, userId, asOf, base, exposureStatus, eventIds, positions,
                assetTypeWeights, usedInputs);
    }

    private static ValuationInput normalized(ValuationInput input) {
        String currency = input.priceCurrency() == null || input.priceCurrency().isBlank()
                ? null : input.priceCurrency().trim().toUpperCase();
        return new ValuationInput(input.symbol(), input.close(), input.priceDate(), currency);
    }

    /** Check order matters: currency unknown, then mismatch, then no price, then stale, then priced. */
    private static PositionValuationStatus status(PortfolioHolding holding, ValuationInput input, String base,
                                                  LocalDate asOf) {
        if (input.priceCurrency() == null) {
            return PositionValuationStatus.CURRENCY_UNKNOWN;
        }
        if (holding.currency() == null || !input.priceCurrency().equalsIgnoreCase(holding.currency().trim())
                || !input.priceCurrency().equalsIgnoreCase(base)) {
            return PositionValuationStatus.CURRENCY_MISMATCH;
        }
        if (input.close() == null || input.priceDate() == null) {
            return PositionValuationStatus.NO_PRICE;
        }
        return ChronoUnit.DAYS.between(input.priceDate(), asOf) > STALE_AFTER_DAYS
                ? PositionValuationStatus.STALE_PRICE : PositionValuationStatus.PRICED;
    }

    private static PortfolioStatePosition position(PortfolioHolding holding, PositionValuationStatus status,
                                                   BigDecimal price, LocalDate priceDate, BigDecimal marketValue) {
        return new PortfolioStatePosition(holding.symbol(), holding.assetType(), holding.quantity(),
                holding.averageCost(), holding.costBasis(), holding.realizedPnl(), holding.currency(), status, price,
                priceDate, marketValue, null);
    }

    /**
     * Fills weights in place when every open position is {@code PRICED} and the total is positive. Returns the
     * exposure status; on {@code PARTIAL} and {@code EMPTY} the weights stay absent and the map stays empty.
     */
    private static ExposureStatus weigh(List<PortfolioStatePosition> positions,
                                        Map<String, BigDecimal> assetTypeWeights) {
        List<PortfolioStatePosition> open = positions.stream()
                .filter(p -> p.valuationStatus() != PositionValuationStatus.CLOSED).toList();
        if (open.isEmpty()) {
            return ExposureStatus.EMPTY;
        }
        BigDecimal total = BigDecimal.ZERO;
        for (PortfolioStatePosition p : open) {
            if (p.valuationStatus() != PositionValuationStatus.PRICED) {
                return ExposureStatus.PARTIAL;
            }
            total = total.add(p.marketValue());
        }
        if (total.signum() == 0) {
            return ExposureStatus.PARTIAL;
        }
        Map<String, BigDecimal> typeValues = new TreeMap<>();
        for (int i = 0; i < positions.size(); i++) {
            PortfolioStatePosition p = positions.get(i);
            if (p.valuationStatus() == PositionValuationStatus.CLOSED) {
                continue;
            }
            positions.set(i, new PortfolioStatePosition(p.symbol(), p.assetType(), p.quantity(), p.averageCost(),
                    p.costBasis(), p.realizedPnl(), p.currency(), p.valuationStatus(), p.price(), p.priceDate(),
                    p.marketValue(), p.marketValue().divide(total, WEIGHT_SCALE, RoundingMode.HALF_UP)));
            typeValues.merge(p.assetType().name(), p.marketValue(), BigDecimal::add);
        }
        for (Map.Entry<String, BigDecimal> entry : typeValues.entrySet()) {
            assetTypeWeights.put(entry.getKey(), entry.getValue().divide(total, WEIGHT_SCALE, RoundingMode.HALF_UP));
        }
        return ExposureStatus.COMPLETE;
    }

    private static String version(Long portfolioId, String userId, LocalDate asOf, String baseCurrency,
                                  List<PortfolioTransaction> events, List<PortfolioStatePosition> positions,
                                  List<ValuationInput> inputs) {
        Map<String, ValuationInput> inputBySymbol = new HashMap<>();
        inputs.forEach(input -> inputBySymbol.put(input.symbol(), input));
        StringBuilder canonical = new StringBuilder();
        append(canonical, DERIVATION, portfolioId.toString(), userId, asOf.toString(), baseCurrency);
        for (PortfolioTransaction e : events) {
            append(canonical, e.id().toString(), e.symbol(), e.assetType().name(), e.action().name(),
                    number(e.quantity()), number(e.price()), e.currency(), number(e.fee()), number(e.fxRateToBase()),
                    e.tradeDate().toString(), e.source().name(), e.originLocator());
        }
        for (PortfolioStatePosition p : positions) {
            ValuationInput input = inputBySymbol.get(p.symbol());
            append(canonical, p.symbol(), p.valuationStatus().name(),
                    input == null || input.close() == null ? null : number(input.close()),
                    input == null || input.priceDate() == null ? null : input.priceDate().toString(),
                    input == null ? null : input.priceCurrency());
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
