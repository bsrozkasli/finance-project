package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import com.ozkaslibasar.financeproject.domain.model.ProviderFetch;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.client.HttpStatusCodeException;

/**
 * Maps the result of a data-service call to a {@link ProviderFetch} outcome (decision D-2.3).
 * The mapping reads the HTTP status code and the exception type only, never message text, and
 * the messages are fixed sentences so raw provider text never reaches a snapshot section.
 */
@Slf4j
final class DataServiceOutcomes {

    static final String INSUFFICIENT = "Insufficient history";
    static final String RATE_LIMITED = "Provider rate limited";
    static final String FAILED = "Provider request failed";

    private DataServiceOutcomes() {
    }

    /**
     * 404 is EMPTY, 422 INSUFFICIENT_DATA, 429 RATE_LIMITED. Every other status, an I/O error or timeout
     * (ResourceAccessException), an unreadable body (RestClientException) and any other exception is FAILED;
     * a 4xx FAILED is a client error and not a provider fault, every other FAILED is.
     */
    static <T> ProviderFetch<T> fromException(RuntimeException e, String what, String symbol) {
        if (e instanceof HttpStatusCodeException statusException) {
            HttpStatusCode status = statusException.getStatusCode();
            log.warn("Data-service {} call for symbol={} returned HTTP {}", what, symbol, status.value());
            return switch (status.value()) {
                case 404 -> ProviderFetch.empty(ProviderFetch.NO_DATA_MESSAGE);
                case 422 -> ProviderFetch.insufficientData(INSUFFICIENT);
                case 429 -> ProviderFetch.rateLimited(RATE_LIMITED);
                // A 4xx is about this request (bad symbol, forbidden): FAILED, but not a provider fault.
                default -> status.is4xxClientError()
                        ? ProviderFetch.failedClientError(FAILED)
                        : ProviderFetch.failed(FAILED);
            };
        }
        log.warn("Data-service {} call for symbol={} failed ({})", what, symbol, e.getClass().getSimpleName());
        return ProviderFetch.failed(FAILED);
    }
}
