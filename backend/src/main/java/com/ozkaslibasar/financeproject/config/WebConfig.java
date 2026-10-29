package com.ozkaslibasar.financeproject.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.slf4j.MDC;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Duration;

/**
 * Global Web MVC configuration.
 *
 * <p>Allows the Vite dev server at {@code http://localhost:5173} or {@code http://127.0.0.1:5173} to communicate
 * with the Spring Boot backend during development. In production, CORS origins
 * should be overridden via environment-specific configuration.</p>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173", "http://127.0.0.1:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(false)
                .maxAge(3600);
    }

    /**
     * Shared {@link RestTemplate} used by the data-service client adapter.
     *
     * <p>Outbound connect and read timeouts are always bounded and configurable through
     * {@code data-service.http.connect-timeout} and {@code data-service.http.read-timeout}.
     * Timeouts surface as {@link org.springframework.web.client.ResourceAccessException}.</p>
     */
    @Bean
    public RestTemplate restTemplate(
            @Value("${data-service.http.connect-timeout:3s}") Duration connectTimeout,
            @Value("${data-service.http.read-timeout:60s}") Duration readTimeout) {
        requirePositive(connectTimeout, "data-service.http.connect-timeout");
        requirePositive(readTimeout, "data-service.http.read-timeout");
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);
        RestTemplate restTemplate = new RestTemplate(requestFactory);
        restTemplate.getInterceptors().add((request, body, execution) -> {
            String requestId = MDC.get(RequestCorrelationFilter.REQUEST_ID_MDC_KEY);
            if (requestId != null && !requestId.isBlank()) {
                request.getHeaders().set(RequestCorrelationFilter.REQUEST_ID_HEADER, requestId);
            }
            return execution.execute(request, body);
        });
        return restTemplate;
    }

    private static void requirePositive(Duration value, String property) {
        if (value == null || value.isZero() || value.isNegative()) {
            throw new IllegalArgumentException(property + " must be a positive duration but was " + value);
        }
    }
}
