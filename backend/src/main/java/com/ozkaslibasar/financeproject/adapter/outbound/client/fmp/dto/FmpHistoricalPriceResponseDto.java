package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto;

import lombok.Data;
import java.util.List;

@Data
public class FmpHistoricalPriceResponseDto {
    private String symbol;
    private List<FmpHistoricalPriceDto> historical;
}
