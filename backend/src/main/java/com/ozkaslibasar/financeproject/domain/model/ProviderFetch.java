package com.ozkaslibasar.financeproject.domain.model;

import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Function;

/**
 * Result of one provider call that keeps "no data exists" apart from "the call failed".
 *
 * <p>The outcome has its own enum (not {@link WatchlistResearchStatus}) because the section status also
 * carries STALE and PENDING_REFRESH, which a single fetch can never produce; the use case maps one to
 * the other. Data is present if and only if the outcome is {@link Outcome#OK}. The message is a short
 * fixed sentence, never raw provider text.
 */
public record ProviderFetch<T>(Outcome outcome, T data, String message) {

    public enum Outcome {
        OK,
        EMPTY,
        FAILED,
        RATE_LIMITED,
        INSUFFICIENT_DATA
    }

    public ProviderFetch {
        Objects.requireNonNull(outcome, "outcome must not be null");
        if ((outcome == Outcome.OK) != (data != null)) {
            throw new IllegalArgumentException("data must be present if and only if the outcome is OK");
        }
    }

    public static <T> ProviderFetch<T> ok(T data) {
        return new ProviderFetch<>(Outcome.OK, Objects.requireNonNull(data, "data must not be null"), null);
    }

    public static <T> ProviderFetch<T> empty(String message) {
        return new ProviderFetch<>(Outcome.EMPTY, null, message);
    }

    public static <T> ProviderFetch<T> failed(String message) {
        return new ProviderFetch<>(Outcome.FAILED, null, message);
    }

    public static <T> ProviderFetch<T> rateLimited(String message) {
        return new ProviderFetch<>(Outcome.RATE_LIMITED, null, message);
    }

    public static <T> ProviderFetch<T> insufficientData(String message) {
        return new ProviderFetch<>(Outcome.INSUFFICIENT_DATA, null, message);
    }

    /** OK for a present value, EMPTY otherwise. Used where a legacy Optional method cannot tell failure from absence. */
    public static <T> ProviderFetch<T> ofOptional(Optional<T> value, String emptyMessage) {
        return value == null || value.isEmpty() ? empty(emptyMessage) : ok(value.get());
    }

    /** OK for a non-empty list, EMPTY otherwise. */
    public static <T> ProviderFetch<List<T>> ofList(List<T> value, String emptyMessage) {
        return value == null || value.isEmpty() ? empty(emptyMessage) : ok(value);
    }

    public boolean ok() {
        return outcome == Outcome.OK;
    }

    /** Maps the data of an OK result; any other outcome keeps its outcome and message. */
    public <R> ProviderFetch<R> map(Function<? super T, ? extends R> mapper) {
        if (outcome == Outcome.OK) {
            return ok(mapper.apply(data));
        }
        return new ProviderFetch<>(outcome, null, message);
    }
}
