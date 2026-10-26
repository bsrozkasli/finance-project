package com.ozkaslibasar.financeproject.domain.model;

import java.util.Objects;

/**
 * How trustworthy a price shown to a user is. This is the single mapping from how a price lookup obtained
 * its price ({@link PriceLookup.Origin}) to the status presented by every consumer (watchlist price section,
 * trade journal), so the consumers cannot drift apart.
 */
public enum PriceStatus {
    /** Confirmed by a provider refresh. */
    OK,
    /** A stored price that no refresh could confirm. */
    STALE,
    /** No price at all, the provider call failed. */
    FAILED,
    /** No price at all, the provider returned nothing. */
    EMPTY;

    public static PriceStatus from(PriceLookup.Origin origin) {
        return switch (Objects.requireNonNull(origin, "origin must not be null")) {
            case FRESH -> OK;
            case STORED_REFRESH_FAILED, STORED_REFRESH_EMPTY -> STALE;
            case NONE_REFRESH_FAILED -> FAILED;
            case NONE_REFRESH_EMPTY -> EMPTY;
        };
    }
}
