package com.ozkaslibasar.financeproject.domain.service;

/** A stored Portfolio State replayed to a different version than the one stored. */
public class PortfolioStateMismatchException extends RuntimeException {

    public PortfolioStateMismatchException(String message) {
        super(message);
    }

    public PortfolioStateMismatchException(String message, Throwable cause) {
        super(message, cause);
    }
}
