package com.ozkaslibasar.financeproject.domain.model;

/**
 * Enumeration of supported financial asset categories.
 *
 * <p>Used to classify assets stored in the system and determine
 * applicable ingestion strategies.</p>
 */
public enum AssetType {

    /** Publicly listed company shares (e.g. AAPL, TSLA, THYAO.IS). */
    STOCK,

    /** Exchange-Traded Funds (e.g. SPY, QQQ). */
    ETF,

    /** Cryptocurrencies (e.g. BTC, ETH). */
    CRYPTO,

    /** Foreign Exchange currency pairs (e.g. EUR/USD). */
    FOREX,

    /** Market indices (e.g. S&P 500 / ^GSPC, BIST 100 / XU100.IS, DAX). */
    INDEX,

    /**
     * No provider or trusted mapping established the instrument type. Never eligible for stock
     * or ETF evaluation (EPIC-001 Task 1; docs/product/decisions/2026-10-15-instrument-identity-source-and-unresolved-type.md).
     */
    UNRESOLVED
}
