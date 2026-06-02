package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class FmpHistoricalPriceDto {
    private String date;
    private BigDecimal open;
    private BigDecimal high;
    private BigDecimal low;
    private BigDecimal close;
    private BigDecimal volume;
}
