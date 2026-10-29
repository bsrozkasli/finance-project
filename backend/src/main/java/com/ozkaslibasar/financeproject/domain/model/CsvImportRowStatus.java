package com.ozkaslibasar.financeproject.domain.model;

public enum CsvImportRowStatus {
    /** Parsed and valid; not yet in the ledger. */
    VALID,
    /** Failed parsing or model validation; never enters the ledger. */
    INVALID,
    /** Its locator already identifies a ledger event (active or voided). */
    DUPLICATE,
    /** Inserted into the ledger. */
    ACCEPTED,
    /** Valid as a row but refused by the ledger, for example a sell above the holding. */
    REJECTED
}
