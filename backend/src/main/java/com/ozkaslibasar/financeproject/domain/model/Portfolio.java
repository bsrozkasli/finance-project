package com.ozkaslibasar.financeproject.domain.model;

import java.time.LocalDateTime;

public record Portfolio(
        Long id,
        String userId,
        String name,
        String baseCurrency,
        String description,
        boolean defaultPortfolio,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public Portfolio {
        if (userId == null || userId.isBlank()) {
            userId = "default";
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("portfolio name must not be blank");
        }
        name = name.trim();
        if (baseCurrency == null || baseCurrency.isBlank()) {
            baseCurrency = "USD";
        }
        baseCurrency = baseCurrency.trim().toUpperCase();
        if (baseCurrency.length() != 3) {
            throw new IllegalArgumentException("baseCurrency must be an ISO currency code");
        }
    }
}
