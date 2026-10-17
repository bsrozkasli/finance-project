package com.ozkaslibasar.financeproject.domain.port.outbound;

import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;

import java.time.Instant;
import java.util.Optional;

/**
 * Source of instrument identity as known at an evaluation instant. OQ-2 names the licensed point-in-time
 * master; until one is wired, no adapter exists and eligibility cannot be established.
 */
public interface SecurityMasterPort {

    /** Identity for the symbol as of the instant, or empty when the source cannot establish one. */
    Optional<InstrumentIdentity> findAsOf(String symbol, Instant evaluationInstant);
}
