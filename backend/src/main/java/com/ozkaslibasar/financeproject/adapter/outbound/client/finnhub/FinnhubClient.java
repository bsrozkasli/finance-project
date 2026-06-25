package com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub;

import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubMetricDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubNewsDto;
import com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubRecommendationDto;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import io.github.resilience4j.bulkhead.annotation.Bulkhead;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Resilience4j-hardened HTTP client for the Finnhub REST API.
 *
 * <p>All public methods are protected by the full suite of Resilience4j policies
 * declared under the {@code finnhubApi} instance in {@code application.yml}:</p>
 *
 * <ul>
 *   <li>{@code @RateLimiter} - 30 requests/second (free tier global limit)</li>
 *   <li>{@code @Retry} - exponential backoff on HTTP 429 / transient errors</li>
 *   <li>{@code @CircuitBreaker} - trips after 50% failure rate over a 10-call window</li>
 *   <li>{@code @Bulkhead} - limits concurrent calls to 10</li>
 * </ul>
 *
 * <p>Business adapters (e.g. {@link FinnhubSentimentAdapter}) must depend on
 * this client rather than calling the Finnhub API directly, so that all
 * resilience guarantees are applied uniformly.</p>
 */
@Component
@Slf4j
public class FinnhubClient implements SmartReportMarketDataPort {

    private static final String BASE_URL = "https://finnhub.io/api/v1";

    private final RestTemplate restTemplate;

    @Value("${finnhub.api-key:}")
    private String apiKey;

    public FinnhubClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Fetches analyst recommendation trends for the given symbol.
     *
     * @param symbol ticker (e.g. {@code "AAPL"})
     * @return list of recommendation periods; empty on failure
     */
    @RateLimiter(name = "finnhubApi")
    @Retry(name = "finnhubApi")
    @CircuitBreaker(name = "finnhubApi")
    @Bulkhead(name = "finnhubApi")
    public List<FinnhubRecommendationDto> getRecommendations(String symbol) {
        try {
            String encoded = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = BASE_URL + "/stock/recommendation?symbol=" + encoded + "&token=" + apiKey;
            log.debug("FinnhubClient: GET {}", url.replace(apiKey, "***"));
            List<FinnhubRecommendationDto> result = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<FinnhubRecommendationDto>>() {}
            ).getBody();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("FinnhubClient.getRecommendations failed for {}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fetches company news articles for the given symbol in the specified date range.
     *
     * @param symbol   ticker
     * @param fromDate ISO date string {@code "YYYY-MM-DD"}
     * @param toDate   ISO date string {@code "YYYY-MM-DD"}
     * @return list of news items; empty on failure
     */
    @RateLimiter(name = "finnhubApi")
    @Retry(name = "finnhubApi")
    @CircuitBreaker(name = "finnhubApi")
    @Bulkhead(name = "finnhubApi")
    public List<FinnhubNewsDto> getCompanyNews(String symbol, String fromDate, String toDate) {
        try {
            String encoded = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = BASE_URL + "/company-news?symbol=" + encoded
                    + "&from=" + fromDate + "&to=" + toDate + "&token=" + apiKey;
            log.debug("FinnhubClient: GET company-news for {}", symbol);
            List<FinnhubNewsDto> result = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<FinnhubNewsDto>>() {}
            ).getBody();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("FinnhubClient.getCompanyNews failed for {}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Fetches financial metrics for the given symbol (52-week high/low, beta, P/E, etc.).
     *
     * @param symbol ticker
     * @return metric DTO or {@code null} on failure
     */
    @RateLimiter(name = "finnhubApi")
    @Retry(name = "finnhubApi")
    @CircuitBreaker(name = "finnhubApi")
    @Bulkhead(name = "finnhubApi")
    public FinnhubMetricDto getMetrics(String symbol) {
        try {
            String encoded = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = BASE_URL + "/stock/metric?symbol=" + encoded + "&metric=all&token=" + apiKey;
            log.debug("FinnhubClient: GET metrics for {}", symbol);
            return restTemplate.getForObject(url, FinnhubMetricDto.class);
        } catch (Exception e) {
            log.error("FinnhubClient.getMetrics failed for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    @Override
    public Optional<CompanyMetrics> fetchCompanyMetrics(String symbol) {
        FinnhubMetricDto dto = getMetrics(symbol);
        if (dto == null || dto.getMetric() == null) {
            return Optional.empty();
        }
        FinnhubMetricDto.Metric metric = dto.getMetric();
        return Optional.of(new CompanyMetrics(
                metric.getPeTtm(),
                metric.getPbAnnual(),
                metric.getLongTermDebtEquityAnnual(),
                metric.getNetMarginAnnual(),
                metric.getRoeTtm()));
    }

    /**
     * Fetches analyst price targets for the given symbol.
     *
     * @param symbol ticker
     * @return price target DTO or {@code null} on failure
     */
    @RateLimiter(name = "finnhubApi")
    @Retry(name = "finnhubApi")
    @CircuitBreaker(name = "finnhubApi")
    @Bulkhead(name = "finnhubApi")
    public com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubPriceTargetDto getPriceTarget(String symbol) {
        try {
            String encoded = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = BASE_URL + "/stock/price-target?symbol=" + encoded + "&token=" + apiKey;
            log.debug("FinnhubClient: GET price target for {}", symbol);
            return restTemplate.getForObject(url, com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto.FinnhubPriceTargetDto.class);
        } catch (Exception e) {
            log.error("FinnhubClient.getPriceTarget failed for {}: {}", symbol, e.getMessage());
            return null;
        }
    }

    /**
     * Fetches peer companies (similar stocks) for the given symbol.
     *
     * @param symbol ticker
     * @return list of peer symbols; empty on failure
     */
    @RateLimiter(name = "finnhubApi")
    @Retry(name = "finnhubApi")
    @CircuitBreaker(name = "finnhubApi")
    @Bulkhead(name = "finnhubApi")
    public List<String> getPeers(String symbol) {
        try {
            String encoded = URLEncoder.encode(symbol, StandardCharsets.UTF_8);
            String url = BASE_URL + "/stock/peers?symbol=" + encoded + "&token=" + apiKey;
            log.debug("FinnhubClient: GET peers for {}", symbol);
            List<String> result = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<String>>() {}
            ).getBody();
            return result != null ? result : Collections.emptyList();
        } catch (Exception e) {
            log.error("FinnhubClient.getPeers failed for {}: {}", symbol, e.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<String> fetchPeers(String symbol) {
        return getPeers(symbol);
    }
}
