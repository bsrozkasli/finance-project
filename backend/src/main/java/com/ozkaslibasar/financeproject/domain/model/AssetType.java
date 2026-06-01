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
    INDEX
}
