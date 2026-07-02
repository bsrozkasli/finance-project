package com.ozkaslibasar.financeproject.adapter.outbound.client.finnhub.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class FinnhubInsiderTransactionsDto {

    private List<Transaction> data;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Transaction {
        private String name;
        private BigDecimal share;
        private BigDecimal change;

        @JsonProperty("transactionPrice")
        private BigDecimal transactionPrice;

        @JsonProperty("transactionDate")
        private String transactionDate;

        @JsonProperty("filingDate")
        private String filingDate;

        @JsonProperty("transactionCode")
        private String transactionCode;
    }
}
