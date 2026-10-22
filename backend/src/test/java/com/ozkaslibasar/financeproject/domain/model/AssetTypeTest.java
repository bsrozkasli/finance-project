package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class AssetTypeTest {

    @ParameterizedTest
    @CsvSource({"EQUITY,STOCK", "equity,STOCK", " ETF ,ETF", "INDEX,INDEX", "CRYPTOCURRENCY,CRYPTO", "CURRENCY,FOREX",
            "MUTUALFUND,UNRESOLVED", "'',UNRESOLVED"})
    void mapsProviderQuoteTypesAndLeavesTheRestUnresolved(String quoteType, AssetType expected) {
        assertThat(AssetType.fromQuoteType(quoteType)).isEqualTo(expected);
    }

    @org.junit.jupiter.api.Test
    void nullQuoteTypeIsUnresolved() {
        assertThat(AssetType.fromQuoteType(null)).isEqualTo(AssetType.UNRESOLVED);
    }
}
