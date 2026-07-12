package com.ozkaslibasar.financeproject.domain.model;

import java.util.List;

public record JournalTradePage(
        List<JournalTrade> content,
        int totalElements,
        int totalPages,
        int number) {
}
