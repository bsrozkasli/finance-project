package com.ozkaslibasar.financeproject.domain.model;

import java.util.Objects;
import java.util.Optional;

/**
 * The newest known price for a symbol together with how it was obtained, so a caller can tell a
 * price confirmed by a provider refresh apart from a stored price that no refresh could confirm.
 *
 * <p>The price is present exactly for {@link Origin#FRESH}, {@link Origin#STORED_REFRESH_FAILED} and
 * {@link Origin#STORED_REFRESH_EMPTY}. "Failed" means the provider call threw; "empty" means it returned
 * nothing, or nothing for the requested symbol.
 */
public record PriceLookup(Optional<PriceHistory> price, Origin origin) {

    public enum Origin {
        FRESH,
        STORED_REFRESH_FAILED,
        STORED_REFRESH_EMPTY,
        NONE_REFRESH_FAILED,
        NONE_REFRESH_EMPTY
    }

    public PriceLookup {
        Objects.requireNonNull(price, "price must not be null");
        Objects.requireNonNull(origin, "origin must not be null");
        boolean expectsPrice = origin == Origin.FRESH
                || origin == Origin.STORED_REFRESH_FAILED
                || origin == Origin.STORED_REFRESH_EMPTY;
        if (expectsPrice != price.isPresent()) {
            throw new IllegalArgumentException("price must be present if and only if the origin carries one");
        }
    }
}
