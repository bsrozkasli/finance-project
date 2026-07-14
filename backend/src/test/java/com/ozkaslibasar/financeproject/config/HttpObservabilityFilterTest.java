package com.ozkaslibasar.financeproject.config;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.servlet.HandlerMapping;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

class HttpObservabilityFilterTest {

    @Test
    void shouldRecordRequestCounterAndTimerWithRoutePattern() throws ServletException, IOException {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        HttpObservabilityFilter filter = new HttpObservabilityFilter(registry);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/prices/AAPL/latest");
        request.setAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/v1/prices/{symbol}/latest");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(200);

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(registry.counter(
                "finance_http_server_requests_total",
                "method", "GET",
                "route", "/api/v1/prices/{symbol}/latest",
                "status", "200",
                "outcome", "SUCCESS").count()).isEqualTo(1.0);
        assertThat(registry.timer(
                "finance_http_server_request_duration_seconds",
                "method", "GET",
                "route", "/api/v1/prices/{symbol}/latest",
                "status", "200",
                "outcome", "SUCCESS").count()).isEqualTo(1);
    }

    @Test
    void shouldCollapseUnknownApiPathsToUnmatched() throws ServletException, IOException {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        HttpObservabilityFilter filter = new HttpObservabilityFilter(registry);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/missing/AAPL");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(404);

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(registry.counter(
                "finance_http_server_requests_total",
                "method", "GET",
                "route", "unmatched",
                "status", "404",
                "outcome", "CLIENT_ERROR").count()).isEqualTo(1.0);
    }
}
