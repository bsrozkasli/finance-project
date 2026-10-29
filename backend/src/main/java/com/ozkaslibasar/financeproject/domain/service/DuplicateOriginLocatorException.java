package com.ozkaslibasar.financeproject.domain.service;

/** A ledger event with the same (source, origin locator) already exists, active or voided. */
public class DuplicateOriginLocatorException extends RuntimeException {

    public DuplicateOriginLocatorException(String originLocator) {
        super("A ledger event already exists for origin " + originLocator);
    }
}
