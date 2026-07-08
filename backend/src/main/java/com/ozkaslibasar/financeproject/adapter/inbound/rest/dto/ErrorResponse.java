package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import java.time.Instant;

/**
 * Stable error response body returned by {@link com.ozkaslibasar.financeproject.adapter.inbound.rest.GlobalExceptionHandler}
 * for all 4xx and 5xx responses.
 *
 * <p>Shape: {@code {"timestamp","status","error","message","path"}}
 */
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path
) {
    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(Instant.now(), status, error, message, path);
    }
}
