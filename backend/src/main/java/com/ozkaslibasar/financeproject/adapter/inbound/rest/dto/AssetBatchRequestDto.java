package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AssetBatchRequestDto {
    private List<String> symbols;
}
