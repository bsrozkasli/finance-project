package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import java.time.LocalDate;

/** Body of {@code POST /api/v1/portfolios/{portfolioId}/states}: {@code {"asOf": "YYYY-MM-DD"}}. */
public record CreatePortfolioStateRequest(LocalDate asOf) {
}
