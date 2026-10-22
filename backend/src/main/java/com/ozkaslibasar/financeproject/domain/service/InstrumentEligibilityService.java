package com.ozkaslibasar.financeproject.domain.service;

import com.ozkaslibasar.financeproject.domain.model.AssetType;
import com.ozkaslibasar.financeproject.domain.model.ClassificationBasis;
import com.ozkaslibasar.financeproject.domain.model.EligibilityDecision;
import com.ozkaslibasar.financeproject.domain.model.EligibilityReason;
import com.ozkaslibasar.financeproject.domain.model.InstrumentIdentity;
import com.ozkaslibasar.financeproject.domain.model.ListingStatus;
import com.ozkaslibasar.financeproject.domain.port.outbound.SecurityMasterPort;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;

/**
 * Decides whether an instrument is eligible for stock/ETF evaluation. Fails closed: anything the security
 * master cannot establish is ineligible, and an unresolved type is never treated as STOCK.
 */
public class InstrumentEligibilityService {

    private final SecurityMasterPort securityMasterPort;

    public InstrumentEligibilityService(SecurityMasterPort securityMasterPort) {
        this.securityMasterPort = Objects.requireNonNull(securityMasterPort, "securityMasterPort must not be null");
    }

    public EligibilityDecision evaluate(String rawSymbol, Instant evaluationInstant) {
        if (rawSymbol == null || rawSymbol.isBlank()) {
            throw new IllegalArgumentException("Symbol must not be blank");
        }
        Objects.requireNonNull(evaluationInstant, "evaluationInstant must not be null");
        String symbol = rawSymbol.trim().toUpperCase(Locale.ROOT);

        Optional<InstrumentIdentity> found = securityMasterPort.findAsOf(symbol, evaluationInstant)
                .filter(identity -> identity.symbol().equals(symbol));
        if (found.isEmpty()) {
            return EligibilityDecision.rejected(EligibilityReason.NO_IDENTITY, Optional.empty());
        }
        InstrumentIdentity identity = found.get();

        if (identity.assetType() == AssetType.UNRESOLVED) {
            return EligibilityDecision.rejected(EligibilityReason.UNRESOLVED_TYPE, found);
        }
        if (identity.assetType() != AssetType.STOCK && identity.assetType() != AssetType.ETF) {
            return EligibilityDecision.rejected(EligibilityReason.UNSUPPORTED_TYPE, found);
        }
        if (identity.basis() == ClassificationBasis.CURRENT_OBSERVATION
                && evaluationInstant.isBefore(identity.retrievedAt())) {
            return EligibilityDecision.rejected(EligibilityReason.HISTORICAL_CLASSIFICATION_UNPROVEN, found);
        }
        if (identity.listingStatus() != ListingStatus.ACTIVE) {
            return EligibilityDecision.rejected(EligibilityReason.NOT_ACTIVELY_LISTED, found);
        }
        return EligibilityDecision.accepted(identity);
    }
}
