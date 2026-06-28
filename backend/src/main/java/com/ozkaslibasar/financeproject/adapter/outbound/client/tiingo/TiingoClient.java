package com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo;

import com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo.dto.TiingoEodDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.tiingo.dto.TiingoNewsDto;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

/**
 * Resilience4j-hardened HTTP client for the Tiingo REST API.
 *
 * <p>All public methods are protected by the full Resilience4j policy suite
 * declared under the {@code tiingoApi} instance in {@code application.yml}:</p>
 *
 * <ul>
 *   <li>{@code @RateLimiter} — 50 requests/60s (well within 500 req/day free tier)</li>
 *   <li>{@code @Retry} — exponential backoff on HTTP 429 / transient errors</li>
 *   <li>{@code @CircuitBreaker} — trips after 60% failure rate over 5-call window</li>
 *   <li>{@code @Bulkhead} — limits concurrent calls to 3</li>
 * </ul>
 *
 * <p>Use this client exclusively for EOD price fallback and news enrichment.
 * Primary data sources are yfinance (data-service) and Finnhub.</p>
 */
@Component
@Slf4j
public class TiingoClient {

    private static final String BASE_URL = "https://api.tiingo.com";

    private final RestTemplate restTemplate;

    @Value("${tiingo.api-key:}")
    private String apiKey;

    public TiingoClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Fetches End-of-Day (EOD) price data for the given symbol.
     * Used as a fallback when yfinance data is unavailable.
     *
     * @param symbol ticker (e.g. {@code "AAPL"})
     * @return list of EOD price records; empty on failure or missing key
     */
    @RateLimiter(name = "tiingoApi")
    @Retry(name = "tiingoApi")
    @CircuitBreaker(name = "tiingoApi")
    @Bulkhead(name = "tiingoApi")
    public List<TiingoEodDto> getEodPrices(String symbol) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("TiingoClient: TIINGO_API_KEY not set, skipping EOD fetch for {}", symbol);
            return Collections.emptyList();
        }
        try {
            String encoded = URLEncoder.encode(symbol.toLowerCase(), StandardCharsets.UTF_8);
            String url = BASE_URL + "/tiingo/daily/" + encoded + "/prices";
            log.debug("TiingoClient: GET eod prices for {}", symbol);
            List<TiingoEodDto> result = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    authHeader(),
                    new ParameterizedTypeReference<List<TiingoEodDto>>() {}
            ).getBody();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("TiingoClient.getEodPrices failed for {}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fetches the latest 10 news articles related to the given symbol.
     * Used as a secondary news source (Finnhub is primary).
     *
     * @param symbol ticker
     * @return list of news items; empty on failure or missing key
     */
    @RateLimiter(name = "tiingoApi")
    @Retry(name = "tiingoApi")
    @CircuitBreaker(name = "tiingoApi")
    @Bulkhead(name = "tiingoApi")
    public List<TiingoNewsDto> getNews(String symbol) {
        if (apiKey == null || apiKey.isBlank()) {
            log.debug("TiingoClient: TIINGO_API_KEY not set, skipping news fetch for {}", symbol);
            return Collections.emptyList();
        }
        try {
            String encoded = URLEncoder.encode(symbol.toLowerCase(), StandardCharsets.UTF_8);
            String url = BASE_URL + "/tiingo/news?tickers=" + encoded + "&limit=10&sortBy=publishedDate";
            log.debug("TiingoClient: GET news for {}", symbol);
            List<TiingoNewsDto> result = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    authHeader(),
                    new ParameterizedTypeReference<List<TiingoNewsDto>>() {}
            ).getBody();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("TiingoClient.getNews failed for {}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    // ── private helpers ─────────────────────────────────────────────────────────

    private HttpEntity<Void> authHeader() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Token " + apiKey);
        return new HttpEntity<>(headers);
    }
}
