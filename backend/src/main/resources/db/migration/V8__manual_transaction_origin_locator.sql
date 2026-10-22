ALTER TABLE portfolio_transactions
    ADD COLUMN origin_locator VARCHAR(128);

-- Existing manual entries have only their persisted row identity as an origin.
-- This locator identifies that known row; it does not infer unavailable import evidence.
UPDATE portfolio_transactions
SET origin_locator = 'manual:legacy:' || id
WHERE source = 'MANUAL';

ALTER TABLE portfolio_transactions
    ADD CONSTRAINT ck_manual_transaction_origin_locator
    CHECK (source <> 'MANUAL' OR
           (origin_locator IS NOT NULL AND origin_locator LIKE 'manual:%'
            AND length(origin_locator) > length('manual:')));

CREATE UNIQUE INDEX uk_portfolio_transactions_source_origin
    ON portfolio_transactions(source, origin_locator);
