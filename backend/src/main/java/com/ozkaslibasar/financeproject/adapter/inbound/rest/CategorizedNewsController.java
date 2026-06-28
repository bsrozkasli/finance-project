package com.ozkaslibasar.financeproject.adapter.inbound.rest;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.FinnhubClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubNewsDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo.TiingoClient;
import com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo.dto.TiingoNewsDto;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioPositionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.WatchlistPort;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Tag(name = "News", description = "Categorized and portfolio news")
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class CategorizedNewsController {

    private static final String DEFAULT_USER = "default";

    private final FinnhubClient finnhubClient;
    private final TiingoClient tiingoClient;
    private final PortfolioPositionPort portfolioPositionPort;
    private final WatchlistPort watchlistPort;

    @Operation(summary = "GET News endpoint", description = "Implements the GET operation for the News API described in SPEC.md sections 7 and 8.")
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
    public AllNewsResponse getAllNews(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String symbols) {
        List<CategorizedNewsItem> all = fetchNews(symbolsFromParam(symbols), normalizeCategory(category));
        int safeSize = Math.max(size, 1);
        int safePage = Math.max(page, 0);
        int from = Math.min(safePage * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        return new AllNewsResponse(all.subList(from, to), all.size());
    }

    @Operation(summary = "GET News endpoint", description = "Implements the GET operation for the News API described in SPEC.md sections 7 and 8.")
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
    @GetMapping("/portfolio")
    public List<CategorizedNewsItem> getPortfolioNews() {
        Set<String> symbols = new LinkedHashSet<>();
        portfolioPositionPort.findByUserId(DEFAULT_USER).forEach(position -> symbols.add(position.symbol()));
        return fetchNews(symbols, "PORTFOLIO");
    }

    private List<CategorizedNewsItem> fetchNews(Set<String> requestedSymbols, String category) {
        Set<String> symbols = requestedSymbols.isEmpty() ? defaultSymbols() : requestedSymbols;
        List<CategorizedNewsItem> news = new ArrayList<>();
        for (String symbol : symbols) {
            news.addAll(fetchFinnhub(symbol, category == null ? categoryForSymbol(symbol) : category));
            news.addAll(fetchTiingo(symbol, category == null ? categoryForSymbol(symbol) : category));
        }
        return news.stream()
                .sorted(Comparator.comparing(CategorizedNewsItem::datetime, Comparator.nullsLast(Long::compareTo)).reversed())
                .toList();
    }

    private Set<String> defaultSymbols() {
        Set<String> symbols = new LinkedHashSet<>();
        portfolioPositionPort.findByUserId(DEFAULT_USER).forEach(position -> symbols.add(position.symbol()));
        watchlistPort.findByUserId(DEFAULT_USER).forEach(watchlist -> symbols.addAll(watchlist.symbols()));
        return symbols;
    }

    private List<CategorizedNewsItem> fetchFinnhub(String symbol, String category) {
        LocalDate to = LocalDate.now();
        LocalDate from = to.minusDays(7);
        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;
        return finnhubClient.getCompanyNews(symbol, from.format(formatter), to.format(formatter)).stream()
                .map(item -> fromFinnhub(symbol, category, item))
                .toList();
    }

    private List<CategorizedNewsItem> fetchTiingo(String symbol, String category) {
        return tiingoClient.getNews(symbol).stream()
                .map(item -> fromTiingo(symbol, category, item))
                .toList();
    }

    private CategorizedNewsItem fromFinnhub(String symbol, String category, FinnhubNewsDto item) {
        String text = (nullToEmpty(item.getHeadline()) + " " + nullToEmpty(item.getSummary())).toLowerCase(Locale.ROOT);
        return new CategorizedNewsItem(
                stableId(item.getUrl()),
                category,
                item.getDatetime(),
                item.getHeadline(),
                item.getImage(),
                symbol,
                item.getSource(),
                item.getSummary(),
                item.getUrl(),
                sentiment(text),
                priority(text),
                List.of(symbol));
    }

    private CategorizedNewsItem fromTiingo(String symbol, String category, TiingoNewsDto item) {
        String text = (nullToEmpty(item.getTitle()) + " " + nullToEmpty(item.getDescription())).toLowerCase(Locale.ROOT);
        return new CategorizedNewsItem(
                item.getId() == null ? stableId(item.getUrl()) : item.getId(),
                category,
                epochSeconds(item.getPublishedDate()),
                item.getTitle(),
                null,
                symbol,
                item.getSource(),
                item.getDescription(),
                item.getUrl(),
                sentiment(text),
                priority(text),
                item.getTickers() == null || item.getTickers().isEmpty() ? List.of(symbol) : item.getTickers());
    }

    private Set<String> symbolsFromParam(String symbols) {
        if (symbols == null || symbols.isBlank()) {
            return Set.of();
        }
        Set<String> parsed = new LinkedHashSet<>();
        Arrays.stream(symbols.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .map(value -> value.toUpperCase(Locale.ROOT))
                .forEach(parsed::add);
        return parsed;
    }

    private String normalizeCategory(String category) {
        return category == null || category.isBlank() ? null : category.trim().toUpperCase(Locale.ROOT);
    }

    private String categoryForSymbol(String symbol) {
        boolean inPortfolio = portfolioPositionPort.findByUserId(DEFAULT_USER).stream()
                .anyMatch(position -> position.symbol().equalsIgnoreCase(symbol));
        return inPortfolio ? "PORTFOLIO" : "WATCHLIST";
    }

    private String sentiment(String text) {
        if (text.contains("beat") || text.contains("growth") || text.contains("upgrade") || text.contains("surge")) {
            return "BULLISH";
        }
        if (text.contains("miss") || text.contains("downgrade") || text.contains("fall") || text.contains("risk")) {
            return "BEARISH";
        }
        return "NEUTRAL";
    }

    private String priority(String text) {
        return text.contains("breaking") || text.contains("earnings") || text.contains("guidance") ? "HIGH" : "MEDIUM";
    }

    private Long epochSeconds(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value).getEpochSecond();
        } catch (Exception ignored) {
            return null;
        }
    }

    private Long stableId(String value) {
        return value == null ? null : Integer.toUnsignedLong(value.hashCode());
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    public record AllNewsResponse(List<CategorizedNewsItem> content, int totalElements) {
    }

    public record CategorizedNewsItem(
            Long id,
            String category,
            Long datetime,
            String headline,
            String image,
            String related,
            String source,
            String summary,
            String url,
            String sentiment,
            String priority,
            List<String> relatedSymbols) {
    }
}
