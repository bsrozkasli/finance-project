package com.ozkaslibasar.financeproject.domain.model;

import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public class OpportunityNotification {
    private final Long id;
    private final String symbol;
    private final Integer score;
    private final String message;
    private final LocalDateTime createdAt;
    private final boolean isRead;

    public Long getId() {
        return id;
    }

    public String getSymbol() {
        return symbol;
    }

    public Integer getScore() {
        return score;
    }

    public String getMessage() {
        return message;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public boolean isRead() {
        return isRead;
    }
}
