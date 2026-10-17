-- Read-only export of price_history for the offline C1 scan (ADR-0007 D3, spec §5 P1.3).
-- Run as ml_readonly. Writes UTF-8 CSV with header to STDOUT; timestamps are UTC ISO-8601.
\copy (SELECT asset_id AS symbol, to_char(price_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS timestamp, open_price AS open, high_price AS high, low_price AS low, close_price AS close, volume FROM public.price_history ORDER BY asset_id, price_timestamp) TO STDOUT WITH (FORMAT csv, HEADER true)
