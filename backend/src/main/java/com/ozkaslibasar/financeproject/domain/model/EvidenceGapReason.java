package com.ozkaslibasar.financeproject.domain.model;

/** Why a policy field does not count as current evidence. */
public enum EvidenceGapReason {
    /** Absent from the snapshot, or present only as an explicit missing marker. */
    MISSING,
    /** Flagged stale at ingestion, or observed outside the policy's freshness window. */
    STALE,
    /** Sources disagree and the conflict is unresolved. */
    CONFLICTED,
    /** No observation time, so its age cannot be established. */
    UNDATED,
    /** Observed after the evaluation instant, so it was not knowable then. */
    FUTURE_DATED,
    /** The instrument type is not established, so no policy applies. */
    UNRESOLVED_TYPE
}
