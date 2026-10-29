-- Inverse: ALTER TABLE portfolio_transactions DROP COLUMN voided_at;
-- A deleted ledger event is voided, not removed: the row, its (source, origin_locator) and its id stay.
ALTER TABLE portfolio_transactions
    ADD COLUMN voided_at TIMESTAMP WITH TIME ZONE NULL;
