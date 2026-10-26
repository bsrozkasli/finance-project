package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.ozkaslibasar.financeproject.domain.model.PortfolioTransaction;
import org.springframework.boot.jackson.JsonMixin;

/**
 * Voiding is internal ledger lifecycle: voided events never appear in route responses, so the
 * transaction DTO keeps its published fields and omits {@code voidedAt}.
 */
@JsonMixin(PortfolioTransaction.class)
@JsonIgnoreProperties("voidedAt")
abstract class PortfolioTransactionJsonMixin {
}
