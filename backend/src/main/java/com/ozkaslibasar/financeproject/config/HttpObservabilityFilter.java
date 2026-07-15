package com.ozkaslibasar.financeproject.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;
import java.util.Set;

/**
 * Adds stable application-level HTTP metrics and request completion logs.
 */
@Component
@ConditionalOnBean(MeterRegistry.class)
@Order(Ordered.LOWEST_PRECEDENCE)
@Slf4j
public class HttpObservabilityFilter extends OncePerRequestFilter {

    private static final Set<String> QUIET_PATH_PREFIXES = Set.of("/actuator/prometheus");

    private final MeterRegistry meterRegistry;

    public HttpObservabilityFilter(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Timer.Sample sample = Timer.start(meterRegistry);
        Throwable failure = null;
        try {
            filterChain.doFilter(request, response);
        } catch (Throwable ex) {
            failure = ex;
            throw ex;
        } finally {
            String route = routeLabel(request);
            String method = request.getMethod();
            String status = statusLabel(response, failure);
            String outcome = outcomeLabel(status, failure);

            Counter.builder("finance_http_server_requests_total")
                    .description("Total backend HTTP requests by route, method, status, and outcome")
                    .tag("method", method)
                    .tag("route", route)
                    .tag("status", status)
                    .tag("outcome", outcome)
                    .register(meterRegistry)
                    .increment();
            sample.stop(Timer.builder("finance_http_server_request_duration_seconds")
                    .description("Backend HTTP request latency")
                    .tag("method", method)
                    .tag("route", route)
                    .tag("status", status)
                    .tag("outcome", outcome)
                    .register(meterRegistry));

            if (!isQuietPath(request)) {
                log.info(
                        "event=http_request_complete service=backend method={} route={} status={} outcome={}",
                        method,
                        route,
                        status,
                        outcome);
            }
        }
    }

    private String routeLabel(HttpServletRequest request) {
        Object bestPattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (bestPattern instanceof String pattern && !pattern.isBlank()) {
            return pattern;
        }
        String servletPath = request.getServletPath();
        if (servletPath == null || servletPath.isBlank()) {
            servletPath = request.getRequestURI();
        }
        if (servletPath == null || servletPath.isBlank()) {
            return "unknown";
        }
        if (servletPath.startsWith("/actuator/")) {
            return "/actuator/{endpoint}";
        }
        return "unmatched";
    }

    private String statusLabel(HttpServletResponse response, Throwable failure) {
        if (failure != null && response.getStatus() < 400) {
            return "500";
        }
        return Integer.toString(response.getStatus());
    }

    private String outcomeLabel(String status, Throwable failure) {
        if (failure != null) {
            return "ERROR";
        }
        int statusCode = Integer.parseInt(status);
        if (statusCode >= 500) {
            return "SERVER_ERROR";
        }
        if (statusCode >= 400) {
            return "CLIENT_ERROR";
        }
        if (statusCode >= 300) {
            return "REDIRECTION";
        }
        return "SUCCESS";
    }

    private boolean isQuietPath(HttpServletRequest request) {
        String servletPath = request.getServletPath();
        return servletPath != null && QUIET_PATH_PREFIXES.stream().anyMatch(servletPath::startsWith);
    }
}
