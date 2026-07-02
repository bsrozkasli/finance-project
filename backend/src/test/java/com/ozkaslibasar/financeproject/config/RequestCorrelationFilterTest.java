package com.ozkaslibasar.financeproject.config;

import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;

class RequestCorrelationFilterTest {

    @Test
    void echoesIncomingRequestIdAndClearsMdcAfterRequest() throws Exception {
        RequestCorrelationFilter filter = new RequestCorrelationFilter();
        MockHttpServletRequest request = new MockHttpServletRequest(HttpMethod.GET.name(), "/api/v1/prices/AAPL/history");
        MockHttpServletResponse response = new MockHttpServletResponse();
        request.addHeader(RequestCorrelationFilter.REQUEST_ID_HEADER, "phase3-request");

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getHeader(RequestCorrelationFilter.REQUEST_ID_HEADER)).isEqualTo("phase3-request");
        assertThat(MDC.get(RequestCorrelationFilter.REQUEST_ID_MDC_KEY)).isNull();
    }

    @Test
    void restTemplatePropagatesRequestIdFromMdc() {
        RestTemplate restTemplate = new WebConfig().restTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        server.expect(requestTo("http://data-service.test/api/v1/prices/AAPL"))
                .andExpect(header(RequestCorrelationFilter.REQUEST_ID_HEADER, "phase3-outbound"))
                .andRespond(withStatus(HttpStatus.OK));

        MDC.put(RequestCorrelationFilter.REQUEST_ID_MDC_KEY, "phase3-outbound");
        try {
            restTemplate.getForEntity("http://data-service.test/api/v1/prices/AAPL", String.class);
        } finally {
            MDC.clear();
        }

        server.verify();
    }
}
