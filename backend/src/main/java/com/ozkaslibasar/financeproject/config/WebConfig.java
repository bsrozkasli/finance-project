package com.ozkaslibasar.financeproject.config;

import org.springframework.context.annotation.Bean;
import org.slf4j.MDC;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

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
     */
    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            String requestId = MDC.get(RequestCorrelationFilter.REQUEST_ID_MDC_KEY);
            if (requestId != null && !requestId.isBlank()) {
                request.getHeaders().set(RequestCorrelationFilter.REQUEST_ID_HEADER, requestId);
            }
            return execution.execute(request, body);
        });
        return restTemplate;
    }
}
