package com.ozkaslibasar.financeproject.domain.model;

/** Why an evidence field has no value. A field that carries a value has no missing reason. */
public enum EvidenceMissingness {
    NOT_PROVIDED,
    PROVIDER_FAILED,
    NOT_APPLICABLE
}
