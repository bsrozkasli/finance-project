package com.ozkaslibasar.financeproject.adapter.outbound.client.fmp.dto;

import lombok.Data;

@Data
public class FmpAssetProfileDto {
    private String symbol;
    private String companyName;
    private String exchangeShortName;
    private String industry;
    private boolean isEtf;
    private boolean isActivelyTrading;
}
