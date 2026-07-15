package com.ozkaslibasar.financeproject.config;

import org.junit.jupiter.api.Test;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

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

    private static final class TestCorsRegistry extends CorsRegistry {
        Map<String, CorsConfiguration> configurations() {
            return getCorsConfigurations();
        }
    }
}
