package com.ozkaslibasar.financeproject.domain.service;

/** A ledger change that would leave the remaining active events unreplayable (for example a sell above the holding). */
public class LedgerInconsistencyException extends RuntimeException {

    private final String symbol;

    public LedgerInconsistencyException(String symbol, String message) {
        super(message);
        this.symbol = symbol;
    }

    public LedgerInconsistencyException(String symbol, String message, Throwable cause) {
        super(message, cause);
        this.symbol = symbol;
    }

    /** The symbol whose position would become invalid, or {@code null} when not attributable to one symbol. */
    public String symbol() {
        return symbol;
    }
}
