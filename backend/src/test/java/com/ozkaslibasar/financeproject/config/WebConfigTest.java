package com.ozkaslibasar.financeproject.config;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WebConfigTest {

    @Test
    void allowsLocalhostAndLoopbackViteOriginsForApiRoutes() {
        TestCorsRegistry registry = new TestCorsRegistry();

        new WebConfig().addCorsMappings(registry);

        CorsConfiguration configuration = registry.configurations().get("/api/**");
        assertThat(configuration).isNotNull();
        assertThat(configuration.getAllowedOrigins())
                .containsExactly("http://localhost:5173", "http://127.0.0.1:5173");
        assertThat(configuration.getAllowedMethods())
                .containsExactly("GET", "POST", "PUT", "DELETE", "OPTIONS");
    }

    @Test
    void restTemplateFailsWithResourceAccessExceptionWhenUpstreamExceedsReadTimeout() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/slow", exchange -> {
            try {
                Thread.sleep(1000);
                byte[] body = "late".getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
            } catch (Exception ignored) {
                // client closed the connection after timing out
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            RestTemplate rt = new WebConfig().restTemplate(Duration.ofSeconds(1), Duration.ofMillis(200));
            String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/slow";

            assertThatThrownBy(() -> rt.getForObject(url, String.class))
                    .isInstanceOf(ResourceAccessException.class)
                    .hasRootCauseInstanceOf(SocketTimeoutException.class);
        } finally {
            server.stop(0);
        }
    }

    @Test
    void restTemplateStillPropagatesRequestIdHeader() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/echo", exchange -> {
            String value = exchange.getRequestHeaders().getFirst(RequestCorrelationFilter.REQUEST_ID_HEADER);
            byte[] body = (value == null ? "" : value).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();
        MDC.put(RequestCorrelationFilter.REQUEST_ID_MDC_KEY, "req-1");
        try {
            RestTemplate rt = new WebConfig().restTemplate(Duration.ofSeconds(1), Duration.ofSeconds(5));
            String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/echo";

            assertThat(rt.getForObject(url, String.class)).isEqualTo("req-1");
        } finally {
            MDC.clear();
            server.stop(0);
        }
    }

    @Test
    void restTemplateRejectsNonPositiveTimeouts() {
        WebConfig config = new WebConfig();

        assertThatThrownBy(() -> config.restTemplate(Duration.ZERO, Duration.ofSeconds(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config.restTemplate(Duration.ofSeconds(1), Duration.ZERO))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config.restTemplate(Duration.ofSeconds(-1), Duration.ofSeconds(1)))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> config.restTemplate(Duration.ofSeconds(1), Duration.ofSeconds(-1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static final class TestCorsRegistry extends CorsRegistry {
        Map<String, CorsConfiguration> configurations() {
            return getCorsConfigurations();
        }
    }
}
