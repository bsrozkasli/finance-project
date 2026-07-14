package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.domain.model.Watchlist;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Tag(name = "Watchlists", description = "Watchlist management")
@RestController
@RequestMapping("/api/v1/watchlists")
@RequiredArgsConstructor
public class WatchlistController {

    private static final String DEFAULT_USER = "default";

    private final WatchlistPort watchlistPort;

    @Operation(summary = "GET Watchlists endpoint", description = "Implements the GET operation for the Watchlists API described in SPEC.md sections 7 and 8.")
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
    public List<Watchlist> list() {
        return watchlistPort.findByUserId(DEFAULT_USER);
    }

    @GetMapping("/{id}/research-snapshot")
    public WatchlistResearchSnapshot researchSnapshot(
            @PathVariable long id,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(required = false) List<String> symbols,
            @RequestParam(defaultValue = "false") boolean refresh) {
        Watchlist watchlist = get(id);
        List<String> requestedSymbols = requestedSymbols(watchlist, symbols).stream()
                .skip(Math.max(offset, 0))
                .limit(Math.max(1, Math.min(limit, 50)))
                .toList();
        List<WatchlistResearchRow> rows = requestedSymbols.stream()
                .map(this::emptyResearchRow)
                .toList();
        return new WatchlistResearchSnapshot(
                watchlist.id(),
                watchlist.name(),
                watchlist.symbols().size(),
                Math.max(1, Math.min(limit, 50)),
                Math.max(offset, 0),
                requestedSymbols,
                rows,
                new WatchlistResearchPolicy(50, 0, 0, true, false),
                Instant.now());
    }

    @Operation(summary = "POST Watchlists endpoint", description = "Implements the POST operation for the Watchlists API described in SPEC.md sections 7 and 8.")
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
    public Watchlist create(@RequestBody CreateWatchlistRequest request) {
        try {
            return watchlistPort.save(new Watchlist(null, DEFAULT_USER, request.name(), List.of(), null, null));
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage(), ex);
        }
    }

    @Operation(summary = "POST Watchlists endpoint", description = "Implements the POST operation for the Watchlists API described in SPEC.md sections 7 and 8.")
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
    @PostMapping("/{id}/symbols")
    public Watchlist addSymbol(@PathVariable long id, @RequestBody SymbolRequest request) {
        Watchlist current = get(id);
        String symbol = normalizeSymbol(request.symbol());
        List<String> symbols = new ArrayList<>(current.symbols());
        if (!symbols.contains(symbol)) {
            symbols.add(symbol);
        }
        return watchlistPort.save(new Watchlist(current.id(), current.userId(), current.name(), symbols, null, null));
    }

    @Operation(summary = "DELETE Watchlists endpoint", description = "Implements the DELETE operation for the Watchlists API described in SPEC.md sections 7 and 8.")
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
    @DeleteMapping("/{id}/symbols/{symbol}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeSymbol(@PathVariable long id, @PathVariable String symbol) {
        Watchlist current = get(id);
        List<String> symbols = new ArrayList<>(current.symbols());
        symbols.remove(normalizeSymbol(symbol));
        watchlistPort.save(new Watchlist(current.id(), current.userId(), current.name(), symbols, null, null));
    }

    @Operation(summary = "DELETE Watchlists endpoint", description = "Implements the DELETE operation for the Watchlists API described in SPEC.md sections 7 and 8.")
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
        get(id);
        watchlistPort.deleteByIdAndUserId(id, DEFAULT_USER);
    }

    private List<String> requestedSymbols(Watchlist watchlist, List<String> symbols) {
        List<String> source = symbols == null || symbols.isEmpty() ? watchlist.symbols() : symbols;
        return source.stream()
                .filter(symbol -> symbol != null && !symbol.isBlank())
                .flatMap(symbol -> Arrays.stream(symbol.split(",")))
                .map(symbol -> symbol.trim().toUpperCase(Locale.ROOT))
                .filter(symbol -> !symbol.isBlank())
                .distinct()
                .toList();
    }

    private WatchlistResearchRow emptyResearchRow(String symbol) {
        WatchlistResearchSection empty = new WatchlistResearchSection(
                "EMPTY",
                "none",
                null,
                "Research snapshot providers are unavailable for this symbol.",
                Instant.now());
        return new WatchlistResearchRow(symbol, empty, empty, empty, empty, empty, "EMPTY");
    }

    private Watchlist get(long id) {
        return watchlistPort.findByIdAndUserId(id, DEFAULT_USER)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Watchlist not found: " + id));
    }

    private String normalizeSymbol(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "symbol is required");
        }
        return symbol.trim().toUpperCase();
    }

    public record WatchlistResearchSnapshot(
            Long watchlistId,
            String watchlistName,
            int totalSymbols,
            int limit,
            int offset,
            List<String> requestedSymbols,
            List<WatchlistResearchRow> rows,
            WatchlistResearchPolicy policy,
            Instant generatedAt) {
    }

    public record WatchlistResearchPolicy(
            int maxLimit,
            int providerConcurrencyLimit,
            int providerTimeoutMillis,
            boolean partialFailureEnabled,
            boolean staleWhileRevalidateEnabled) {
    }

    public record WatchlistResearchRow(
            String symbol,
            WatchlistResearchSection price,
            WatchlistResearchSection technical,
            WatchlistResearchSection fundamentals,
            WatchlistResearchSection earnings,
            WatchlistResearchSection institutional,
            String overallStatus) {
    }

    public record WatchlistResearchSection(
            String status,
            String source,
            Object data,
            String message,
            Instant observedAt) {
    }

    public record CreateWatchlistRequest(String name) {
    }

    public record SymbolRequest(String symbol) {
    }
}
