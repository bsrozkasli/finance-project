package com.ozkaslibasar.financeproject.adapter.outbound.client.dataservice;

import lombok.Data;

/**
 * DTO for a single OHLCV candlestick returned by the FastAPI data-service.
 *
 * <p>Maps the JSON payload from {@code GET /api/v1/prices/{symbol}?interval=…&range=…}</p>
 */
@Data
public class DataServicePriceDto {

    /** ISO-8601 UTC timestamp (e.g. {@code "2024-01-15T09:30:00Z"}). */
    private String timestamp;

    private Double open;
    private Double high;
    private Double low;
    private Double close;

    /** Integer volume; may be {@code null} for some instruments. */
    private Long volume;
}
