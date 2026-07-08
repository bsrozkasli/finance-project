package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** EXPECTED_SOURCE_DEFAULT: derived_from_spec */
class AssetTest {

    @Test
    void should_constructAsset_when_allFieldsValid() {
        Asset asset = new Asset("AAPL", "Apple Inc.", AssetType.STOCK);

        assertThat(asset.symbol()).isEqualTo("AAPL");
        assertThat(asset.name()).isEqualTo("Apple Inc.");
        assertThat(asset.type()).isEqualTo(AssetType.STOCK);
    }

    @Test
    void should_throwNullPointerException_when_symbolIsNull() {
        assertThatThrownBy(() -> new Asset(null, "Apple Inc.", AssetType.STOCK))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("symbol");
    }

    @Test
    void should_throwNullPointerException_when_nameIsNull() {
        assertThatThrownBy(() -> new Asset("AAPL", null, AssetType.STOCK))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("name");
    }

    @Test
    void should_throwNullPointerException_when_typeIsNull() {
        assertThatThrownBy(() -> new Asset("AAPL", "Apple Inc.", null))
                .isInstanceOf(NullPointerException.class)
                .hasMessageContaining("type");
    }

    @Test
    void should_throwIllegalArgumentException_when_symbolIsBlank() {
        assertThatThrownBy(() -> new Asset("   ", "Apple Inc.", AssetType.STOCK))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("blank");
    }

    @Test
    void should_uppercaseSymbol_when_constructing() {
        Asset asset = new Asset("aapl", "Apple Inc.", AssetType.STOCK);

        assertThat(asset.symbol()).isEqualTo("AAPL");
    }

    @Test
    void should_createAssetWithDifferentTypes() {
        Asset stock = new Asset("AAPL", "Apple Inc.", AssetType.STOCK);
        Asset etf = new Asset("QQQ", "Invesco QQQ", AssetType.ETF);
        Asset crypto = new Asset("BTC", "Bitcoin", AssetType.CRYPTO);

        assertThat(stock.type()).isEqualTo(AssetType.STOCK);
        assertThat(etf.type()).isEqualTo(AssetType.ETF);
        assertThat(crypto.type()).isEqualTo(AssetType.CRYPTO);
    }
}

