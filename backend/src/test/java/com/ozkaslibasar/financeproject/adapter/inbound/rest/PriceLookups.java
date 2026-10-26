package com.ozkaslibasar.financeproject.adapter.inbound.rest;

import com.ozkaslibasar.financeproject.domain.model.PriceHistory;
import com.ozkaslibasar.financeproject.domain.model.PriceLookup;

import java.util.Optional;

/** Builds price lookups for controller tests (the price service is the mocked I/O boundary). */
final class PriceLookups {

    private PriceLookups() {
    }

    static PriceLookup fresh(PriceHistory price) {
        return new PriceLookup(Optional.of(price), PriceLookup.Origin.FRESH);
    }

    static PriceLookup stored(PriceHistory price, PriceLookup.Origin origin) {
        return new PriceLookup(Optional.of(price), origin);
    }

    static PriceLookup none(PriceLookup.Origin origin) {
        return new PriceLookup(Optional.empty(), origin);
    }
}
