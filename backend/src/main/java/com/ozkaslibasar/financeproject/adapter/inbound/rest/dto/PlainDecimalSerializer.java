package com.ozkaslibasar.financeproject.adapter.inbound.rest.dto;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;
import java.math.BigDecimal;

/**
 * Writes a decimal without trailing zeros and without exponent notation, so the same value serializes identically
 * whatever scale it was derived or stored with.
 */
public class PlainDecimalSerializer extends JsonSerializer<BigDecimal> {

    @Override
    public void serialize(BigDecimal value, JsonGenerator generator, SerializerProvider provider) throws IOException {
        BigDecimal canonical = value.signum() == 0 ? BigDecimal.ZERO : value.stripTrailingZeros();
        generator.writeNumber(canonical.toPlainString());
    }
}
