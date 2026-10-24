package com.ozkaslibasar.financeproject.domain.model;

/** Why an evidence field has no value; NONE means the field carries one. */
public enum EvidenceMissingness {
    NONE,
    NOT_PROVIDED,
    PROVIDER_FAILED,
    NOT_APPLICABLE
}
