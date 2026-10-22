# C1 — Offline Price-History Data-Quality Scanner

## 1. What C1 is

An offline command-line scan of a frozen `price_history` snapshot. It never runs on a
request path and has no product integration in Phase 1. See spec §5 P1.3 and
`docs/adr/0007-local-model-lifecycle.md`. Thresholds are pre-registered in
`thresholds.json` before any real snapshot is scanned.

## 2. One-time role setup

From the repository root, with Postgres running:

```powershell
Get-Content ml/dq/create_readonly_role.sql | docker exec -i finance_postgres psql -U finance_user -d financedb -v ON_ERROR_STOP=1
docker exec finance_postgres psql -U ml_readonly -d financedb -tAc "SHOW default_transaction_read_only"
docker exec finance_postgres psql -U ml_readonly -d financedb -c "DELETE FROM price_history WHERE false"
```

Expected: `CREATE ROLE`, `ALTER ROLE`, `GRANT`, `GRANT`; then `on`; then an `ERROR`
(read-only transaction or permission denied). If `DB_USERNAME`/`DB_NAME` differ from the
Compose defaults, substitute them. If `psql` asks for a password, stop: the container is not
using local-socket trust, and the owner must decide how to authenticate the role.

## 3. Export

From the repository root:

```powershell
New-Item -ItemType Directory -Force ml/datasets/exports | Out-Null
$stamp = Get-Date -Format yyyyMMdd
Get-Content ml/dq/export_price_history.sql | docker exec -i finance_postgres psql -U ml_readonly -d financedb -v ON_ERROR_STOP=1 -q | Out-File -Encoding utf8 "ml/datasets/exports/price_history-$stamp.csv"
Get-Content "ml/datasets/exports/price_history-$stamp.csv" -TotalCount 2
```

Expected: header `symbol,timestamp,open,high,low,close,volume`, then a row such as
`AAPL,2026-10-14T04:00:00Z,…`. (`Out-File -Encoding utf8` writes a BOM in Windows PowerShell
5.1; `read_price_export` accepts it.)

## 4. Snapshot

From `ml/`:

```powershell
.\.venv\Scripts\python.exe -m lifecycle.price_export --csv datasets/exports/price_history-<stamp>.csv
```

## 5. Scan

From `ml/`:

```powershell
.\.venv\Scripts\python.exe -m dq.scan --snapshot snapshots/<snapshot_id>
```

## 6. Review

Fill `verdict` in `review-sheet.csv` with `true`, `false`, or `unsure`, then:

```powershell
.\.venv\Scripts\python.exe -m dq.review_summary <sheet>
```

Only the aggregate table (counts and precision per class) may be committed.

## 7. Fault classes

| Class | Definition |
|---|---|
| `non_positive_price` | min(open, high, low, close) ≤ 0 |
| `ohlc_inconsistency` | low > high, open > high, open < low, close > high, or close < low |
| `duplicate_session` | more than one row maps to a `session_date` |
| `stale_bars` | ≥ 5 consecutive sessions with identical OHLCV |
| `missing_sessions` | ≥ 3 business days absent between consecutive sessions |
| `unadjusted_split` | close ratio near 1/f that persists over 5 sessions |
| `unadjusted_reverse_split` | close ratio near f that persists over 5 sessions |
| `return_outlier` | reverting spike: two opposite-sign returns, each robust z ≥ 8 |
| `volume_anomaly` | robust z of `log1p(volume)` ≥ 8, or negative volume |

## 8. Known blind spots

- A single missing session (no exchange calendar, so it cannot be told from a holiday).
- Splits within 5 sessions of a series edge.
- Cross-provider conflicts (`price_history` has no provider column).
- Intraday rows are mapped to the next session date (PF-3).
