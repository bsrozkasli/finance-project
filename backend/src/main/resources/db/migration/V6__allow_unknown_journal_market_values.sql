ALTER TABLE journal_trades
    ALTER COLUMN current_price DROP NOT NULL,
    ALTER COLUMN market_value DROP NOT NULL,
    ALTER COLUMN pnl DROP NOT NULL,
    ALTER COLUMN return_pct DROP NOT NULL;
