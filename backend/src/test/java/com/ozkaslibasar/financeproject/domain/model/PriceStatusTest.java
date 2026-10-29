package com.ozkaslibasar.financeproject.domain.model;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PriceStatusTest {

    @Test
    void mapsEveryLookupOriginToOneStatus() {
        assertThat(PriceStatus.from(PriceLookup.Origin.FRESH)).isEqualTo(PriceStatus.OK);
        assertThat(PriceStatus.from(PriceLookup.Origin.STORED_REFRESH_FAILED)).isEqualTo(PriceStatus.STALE);
        assertThat(PriceStatus.from(PriceLookup.Origin.STORED_REFRESH_EMPTY)).isEqualTo(PriceStatus.STALE);
        assertThat(PriceStatus.from(PriceLookup.Origin.NONE_REFRESH_FAILED)).isEqualTo(PriceStatus.FAILED);
        assertThat(PriceStatus.from(PriceLookup.Origin.NONE_REFRESH_EMPTY)).isEqualTo(PriceStatus.EMPTY);
    }
}
