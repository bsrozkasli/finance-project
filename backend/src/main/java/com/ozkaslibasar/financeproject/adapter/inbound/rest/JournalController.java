package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.JournalTrade;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeCommand;
import com.ozkaslibasar.financeproject.domain.model.JournalTradePage;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStats;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeStatus;
import com.ozkaslibasar.financeproject.domain.model.JournalTradeType;
import com.ozkaslibasar.financeproject.domain.service.JournalTradeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Tag(name = "Journal", description = "Trading journal management")
@RestController
@RequestMapping("/api/v1/journal/trades")
@RequiredArgsConstructor
public class JournalController {

    private static final String DEFAULT_USER = "default";

    private final JournalTradeService journalTradeService;

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
        JournalTradePage result = journalTradeService.list(DEFAULT_USER, page, size);
        return new PagedResponse<>(result.content(), result.totalElements(), result.totalPages(), result.number());
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
        JournalTradeStats stats = journalTradeService.stats(DEFAULT_USER);
        return new JournalStats(
                stats.totalTrades(),
                stats.openTrades(),
                stats.closedTrades(),
                stats.winRate(),
                stats.avgReturn(),
                stats.bestTrade(),
                stats.worstTrade());
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
        return handleBadRequest(() -> journalTradeService.add(toCommand(request)));
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
        try {
            return handleBadRequest(() -> journalTradeService.update(id, toCommand(request)));
        } catch (NoSuchElementException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
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
        try {
            journalTradeService.delete(id, DEFAULT_USER);
        } catch (NoSuchElementException ex) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, ex.getMessage(), ex);
        }
    }

    private JournalTradeCommand toCommand(JournalTradeRequest request) {
        return new JournalTradeCommand(
                DEFAULT_USER,
                request.symbol(),
                request.company(),
                request.type(),
                request.quantity(),
                request.purchasePrice(),
                request.currentPrice(),
                request.openedAt(),
                request.closedAt(),
                request.status(),
                request.commission(),
                request.portfolioId(),
                request.transactionId(),
                request.strategy(),
                request.notes(),
                request.tags());
    }

    private JournalTrade handleBadRequest(JournalCommand command) {
        try {
            return command.execute();
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    private interface JournalCommand {
        JournalTrade execute();
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
            Long portfolioId,
            Long transactionId,
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
