package com.ozkaslibasar.financeproject.domain.model;

import java.util.Objects;
import java.util.Optional;

/** Outcome of an eligibility check, with the identity it was based on when one exists. */
public record EligibilityDecision(boolean eligible, EligibilityReason reason, Optional<InstrumentIdentity> identity) {
    public EligibilityDecision {
        Objects.requireNonNull(reason, "reason must not be null");
        Objects.requireNonNull(identity, "identity must not be null");
        if (eligible != (reason == EligibilityReason.ELIGIBLE)) {
            throw new IllegalArgumentException("eligible must be true exactly when the reason is ELIGIBLE");
        }
    }

    public static EligibilityDecision accepted(InstrumentIdentity identity) {
        return new EligibilityDecision(true, EligibilityReason.ELIGIBLE, Optional.of(identity));
    }

    public static EligibilityDecision rejected(EligibilityReason reason, Optional<InstrumentIdentity> identity) {
        return new EligibilityDecision(false, reason, identity);
    }
}
