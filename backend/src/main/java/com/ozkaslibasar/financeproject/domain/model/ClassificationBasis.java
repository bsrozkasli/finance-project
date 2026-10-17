package com.ozkaslibasar.financeproject.domain.model;

/** What a classification can prove about the instrument's type. */
public enum ClassificationBasis {

    /** A point-in-time security master states the classification in force at the evaluation instant. */
    POINT_IN_TIME_MASTER,

    /** A provider observation made at retrieval time; it says nothing about earlier instants. */
    CURRENT_OBSERVATION
}
