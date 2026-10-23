# C1 Real-Snapshot Data-Quality Review

## Audit Metadata

- **Review date:** 2026-10-23
- **Scope:** Internal, read-only scan of locally stored `price_history`; no provider request or product-path change.
- **Snapshot ID:** `price_history-e719d96805fa2bc5`
- **Scan version:** `dq-scan-1.0.0`
**Thresholds:** `dq-thresholds-v1` (SHA-256 prefix `a2ac86c4f635`)

## Evidence Records

### Export and replay evidence

- The `ml_readonly` database role reported `default_transaction_read_only=on`, read the table, and rejected a write attempt in a read-only transaction.
- The frozen snapshot contains 4,576 rows from 6 symbols, covering 24 symbol-years. One symbol-year was flagged; no symbol had insufficient history.
- A second scan into a separate ignored report directory produced a byte-identical `dq-report.json`: SHA-256 `f02298fb352b73a3307535aac8a9d22f8d7d058f2ec63198efa13f0b36a2a472` in both runs.
- Exports, snapshots, full reports, and the review sheet remain in Git-ignored `ml/` directories. This record contains counts only.

### Findings and owner review

| Fault class | Findings | Reviewed | True | False | Unsure | Precision |
|---|---:|---:|---:|---:|---:|---:|
| `non_positive_price` | 0 | 0 | 0 | 0 | 0 | n/a |
| `ohlc_inconsistency` | 0 | 0 | 0 | 0 | 0 | n/a |
| `duplicate_session` | 0 | 0 | 0 | 0 | 0 | n/a |
| `stale_bars` | 0 | 0 | 0 | 0 | 0 | n/a |
| `missing_sessions` | 0 | 0 | 0 | 0 | 0 | n/a |
| `unadjusted_split` | 0 | 0 | 0 | 0 | 0 | n/a |
| `unadjusted_reverse_split` | 0 | 0 | 0 | 0 | 0 | n/a |
| `return_outlier` | 0 | 0 | 0 | 0 | 0 | n/a |
| `volume_anomaly` | 1 | 1 | 0 | 0 | 1 | n/a |

The owner marked the only sampled finding `unsure` and stated: “Bağımsız kaynak bulamadım; unsure.” No true/false verdict was inferred from the flagged value. With zero decided findings, observed precision is undefined.

## Limitations

### Known blind spots

- A single missing session cannot be distinguished from a holiday without an exchange calendar.
- Splits within five sessions of a series edge can be missed.
- Cross-provider conflicts cannot be assessed because stored rows lack a provider column.
- Intraday rows map to the next session date; stored interval and adjustment are unknown.
- The synthetic US-like fixture calendar may not represent every instrument in the local data.

## Input to D-3 and D-4

| Fault class | Evidence available for a precision decision | Owner policy judgment |
|---|---|---|
| `non_positive_price` | No real finding in this snapshot | Not recorded |
| `ohlc_inconsistency` | No real finding in this snapshot | Not recorded |
| `duplicate_session` | No real finding in this snapshot | Not recorded |
| `stale_bars` | No real finding in this snapshot | Not recorded |
| `missing_sessions` | No real finding in this snapshot | Not recorded |
| `unadjusted_split` | No real finding in this snapshot | Not recorded |
| `unadjusted_reverse_split` | No real finding in this snapshot | Not recorded |
| `return_outlier` | No real finding in this snapshot | Not recorded |
| `volume_anomaly` | One owner-reviewed `unsure`; precision n/a | “Bağımsız kaynak bulamadım; unsure.” No promotion judgment recorded. |

**Inference from this evidence:** No fault class has measured real-snapshot precision here, so this record alone cannot authorize a deterministic freshness/conflict rule or a D-4 shadow duration. The named D-3/D-4 owners must make and record those policy decisions separately.
