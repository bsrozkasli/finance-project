package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AssetResponseDto {
    private String symbol;
    private String name;
    private String type;
}
