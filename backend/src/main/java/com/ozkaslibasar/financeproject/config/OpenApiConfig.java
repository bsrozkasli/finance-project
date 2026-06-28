package com.ozkaslibasar.financeproject.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for OpenAPI (Swagger) documentation.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Finance Project Backend API",
                version = "1.0.0",
                description = "OpenAPI 3.0 documentation for the Finance Project Spring Boot backend.",
                contact = @Contact(
                        name = "Finance Project Maintainers",
                        email = "maintainers@finance-project.local"
                ),
                license = @License(
                        name = "Proprietary",
                        url = "https://example.com/license"
                )
        )
)
@SecurityScheme(
        name = "BearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT"
)
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }
}
