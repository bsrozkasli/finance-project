package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Batch asset creation request")
public class AssetBatchRequestDto {
    @Schema(description = "Ticker symbols to add", example = "[\"AAPL\",\"MSFT\"]")
    private List<String> symbols;
}