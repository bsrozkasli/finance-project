package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class PriceResponseDto {
    private String assetId;
    private BigDecimal open;
    private BigDecimal close;
    private BigDecimal high;
    private BigDecimal low;
    private BigDecimal volume;
    private Instant timestamp;
}
