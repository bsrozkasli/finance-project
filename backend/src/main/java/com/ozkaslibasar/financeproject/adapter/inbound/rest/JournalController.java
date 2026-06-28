package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import com.ozkaslibasar.financeproject.domain.port.outbound.JournalTradePort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Tag(name = "Journal", description = "Trading journal management")
@RestController
@RequestMapping("/api/v1/journal/trades")
@RequiredArgsConstructor
public class JournalController {

    private static final String DEFAULT_USER = "default";

    private final JournalTradePort tradePort;

    @Operation(summary = "GET Journal endpoint", description = "Implements the GET operation for the Journal API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping
    public PagedResponse<JournalTrade> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        List<JournalTrade> all = tradePort.findByUserId(DEFAULT_USER);
        int safeSize = Math.max(size, 1);
        int safePage = Math.max(page, 0);
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        int totalPages = all.isEmpty() ? 0 : (int) Math.ceil((double) all.size() / safeSize);
        return new PagedResponse<>(all.subList(from, to), all.size(), totalPages, safePage);
    }

    @Operation(summary = "GET Journal endpoint", description = "Implements the GET operation for the Journal API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @GetMapping("/stats")
    public JournalStats stats() {
        List<JournalTrade> all = tradePort.findByUserId(DEFAULT_USER);
        int openTrades = (int) all.stream().filter(trade -> trade.status() == JournalTradeStatus.OPEN).count();
        List<JournalTrade> closed = all.stream().filter(trade -> trade.status() == JournalTradeStatus.CLOSED).toList();
        long wins = closed.stream().filter(trade -> trade.returnPct().compareTo(BigDecimal.ZERO) > 0).count();
        BigDecimal avgReturn = closed.isEmpty()
                ? BigDecimal.ZERO
                : closed.stream().map(JournalTrade::returnPct).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(closed.size()), 4, RoundingMode.HALF_UP);
        String best = all.stream().max((left, right) -> left.returnPct().compareTo(right.returnPct()))
                .map(JournalTrade::symbol)
                .orElse(null);
        String worst = all.stream().min((left, right) -> left.returnPct().compareTo(right.returnPct()))
                .map(JournalTrade::symbol)
                .orElse(null);
        BigDecimal winRate = closed.isEmpty()
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(wins).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(closed.size()), 4, RoundingMode.HALF_UP);
        return new JournalStats(all.size(), openTrades, closed.size(), winRate, avgReturn, best, worst);
    }

    @Operation(summary = "POST Journal endpoint", description = "Implements the POST operation for the Journal API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JournalTrade add(@RequestBody JournalTradeRequest request) {
        return tradePort.save(toTrade(null, request));
    }

    @Operation(summary = "PUT Journal endpoint", description = "Implements the PUT operation for the Journal API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @PutMapping("/{id}")
    public JournalTrade update(@PathVariable long id, @RequestBody JournalTradeRequest request) {
        tradePort.findByIdAndUserId(id, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trade not found: " + id));
        return tradePort.save(toTrade(id, request));
    }

    @Operation(summary = "DELETE Journal endpoint", description = "Implements the DELETE operation for the Journal API described in SPEC.md sections 7 and 8.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successful response"),
            @ApiResponse(responseCode = "201", description = "Resource created when the endpoint creates persistent state"),
            @ApiResponse(responseCode = "204", description = "Command completed without response body"),
            @ApiResponse(responseCode = "400", description = "Malformed or invalid request"),
            @ApiResponse(responseCode = "404", description = "Requested resource was not found"),
            @ApiResponse(responseCode = "409", description = "Request conflicts with existing state"),
            @ApiResponse(responseCode = "422", description = "Business rule violation"),
            @ApiResponse(responseCode = "429", description = "Rate limit exceeded"),
            @ApiResponse(responseCode = "502", description = "Invalid upstream provider response"),
            @ApiResponse(responseCode = "503", description = "Required dependency unavailable")
    })
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        tradePort.findByIdAndUserId(id, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Trade not found: " + id));
        tradePort.deleteByIdAndUserId(id, DEFAULT_USER);
    }

    private JournalTrade toTrade(Long id, JournalTradeRequest request) {
        try {
            BigDecimal quantity = request.quantity();
            BigDecimal purchasePrice = request.purchasePrice();
            BigDecimal currentPrice = request.currentPrice() == null ? purchasePrice : request.currentPrice();
            BigDecimal commission = request.commission() == null ? BigDecimal.ZERO : request.commission();
            BigDecimal marketValue = quantity.multiply(currentPrice);
            BigDecimal pnl = currentPrice.subtract(purchasePrice).multiply(quantity).subtract(commission);
            BigDecimal costBasis = purchasePrice.multiply(quantity).add(commission);
            BigDecimal returnPct = costBasis.compareTo(BigDecimal.ZERO) == 0
                    ? BigDecimal.ZERO
                    : pnl.multiply(BigDecimal.valueOf(100)).divide(costBasis, 4, RoundingMode.HALF_UP);
            LocalDate closedAt = request.closedAt();
            JournalTradeStatus status = request.status() == null
                    ? (closedAt == null ? JournalTradeStatus.OPEN : JournalTradeStatus.CLOSED)
                    : request.status();
            return new JournalTrade(
                    id,
                    DEFAULT_USER,
                    request.symbol(),
                    request.company(),
                    request.type(),
                    quantity,
                    purchasePrice,
                    currentPrice,
                    marketValue,
                    commission,
                    request.strategy(),
                    request.notes(),
                    request.tags(),
                    request.openedAt(),
                    closedAt,
                    status,
                    pnl,
                    returnPct,
                    null,
                    null,
                    null);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    public record JournalTradeRequest(
            String symbol,
            String company,
            JournalTradeType type,
            BigDecimal quantity,
            BigDecimal purchasePrice,
            BigDecimal currentPrice,
            LocalDate openedAt,
            LocalDate closedAt,
            JournalTradeStatus status,
            BigDecimal commission,
            String strategy,
            String notes,
            List<String> tags) {
    }

    public record JournalStats(
            int totalTrades,
            int openTrades,
            int closedTrades,
            BigDecimal winRate,
            BigDecimal avgReturn,
            String bestTrade,
            String worstTrade) {
    }

    public record PagedResponse<T>(List<T> content, int totalElements, int totalPages, int number) {
    }
}
