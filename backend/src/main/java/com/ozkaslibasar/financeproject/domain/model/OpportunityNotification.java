package com.ozkaslibasar.financeproject.domain.model;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class OpportunityNotification {
    private final Long id;
    private final String symbol;
    private final Integer score;
    private final String message;
    private final LocalDateTime createdAt;
    private final boolean isRead;
}
