package com.ozkaslibasar.financeproject.domain.model;

import java.time.LocalDateTime;
import java.util.List;

public record Watchlist(
        Long id,
        String userId,
        String name,
        List<String> symbols,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public Watchlist {
        if (userId == null || userId.isBlank()) {
            userId = "default";
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name must not be blank");
        }
        name = name.trim();
        if (symbols == null) {
            symbols = List.of();
        } else {
            symbols = symbols.stream()
                    .filter(symbol -> symbol != null && !symbol.isBlank())
                    .map(symbol -> symbol.trim().toUpperCase())
                    .distinct()
                    .toList();
        }
    }
}
