# C1 Real-Snapshot Review

**Status:** Evidence artifact. Plan 3 Task 7 (owner gate) was completed on 2026-10-23.

This record holds the aggregate result of running the offline C1 price-history
data-quality scanner on the owner's real `price_history` snapshot. It covers spec §5 P1.3
("on the owner's real snapshot, a reviewed count of true and false findings is recorded")
and is the input to open decisions D-3 and D-4. Per-symbol rows, dates, prices, and volumes
stay in the gitignored `ml/reports/` directory.

## Audit Metadata

- Review Date: 2026-10-23
- Snapshot: `price_history-e719d96805fa2bc5`, exported with the read-only `ml_readonly` role
  through `ml/dq/export_price_history.sql` (runbook `ml/dq/README.md` §2–4)
- Scan version: `dq-scan-1.0.0`
- Thresholds: `dq-thresholds-v1`, sha256 prefix `a2ac86c4f635`, last changed in `e9a2179`
  and unchanged at scan time
- Code: the `ml/` tree was identical to `main` at `1fc152b`
- Verdicts: set by the owner; the agent ran the export, the scan, the replay, and the summary

## Snapshot Size

| Measure | Count |
|---|---:|
| Symbols | 6 |
| Rows | 4576 |
| Symbol-years | 24 |
| Flagged symbol-years | 1 |
| Symbols with insufficient history (not judged) | 0 |

## Findings per Fault Class

| Fault class | Findings |
|---|---:|
| non_positive_price | 0 |
| ohlc_inconsistency | 0 |
| duplicate_session | 0 |
| stale_bars | 0 |
| missing_sessions | 0 |
| unadjusted_split | 0 |
| unadjusted_reverse_split | 0 |
| return_outlier | 0 |
| volume_anomaly | 1 |

## Owner Review

Output of `python -m dq.review_summary` on the filled review sheet:

| Fault class | Reviewed | True | False | Unsure | Precision (true / (true + false)) |
|---|---:|---:|---:|---:|---:|
| non_positive_price | 0 | 0 | 0 | 0 | n/a |
| ohlc_inconsistency | 0 | 0 | 0 | 0 | n/a |
| duplicate_session | 0 | 0 | 0 | 0 | n/a |
| stale_bars | 0 | 0 | 0 | 0 | n/a |
| missing_sessions | 0 | 0 | 0 | 0 | n/a |
| unadjusted_split | 0 | 0 | 0 | 0 | n/a |
| unadjusted_reverse_split | 0 | 0 | 0 | 0 | n/a |
| return_outlier | 0 | 0 | 0 | 0 | n/a |
| volume_anomaly | 1 | 0 | 0 | 1 | n/a |

The single `volume_anomaly` finding measured a robust z of 8.04 against the threshold of 8.0.
The owner marked it `unsure` because no independent source settled it. The session is one
that often carries index-rebalance volume, so the stored volume may be correct.

## Replay

The scan was run twice on the same snapshot into two report directories. Both
`dq-report.json` files had sha256 `F02298FB352B73A3307535AAC8A9D22F8D7D058F2EC63198EFA13F0B36A2A472`.
Real-data replay is byte-identical.

## Known Blind Spots

- The snapshot is small: 6 symbols and 24 symbol-years. Eight of nine classes produced no
  findings, so this review cannot estimate precision for any class.
- A single missing session cannot be told apart from a holiday, because there is no exchange
  calendar.
- Splits within five sessions of a series edge are not detected.
- Cross-provider conflicts are not checked, because `price_history` has no provider column.
- `price_history` records no interval or adjustment (PF-3). The snapshot manifest therefore
  records `adjusted` as `null`, and intraday rows map to the next session date.

## Input to D-3 and D-4

Owner judgment, 2026-10-23: **no decision yet.** There are too few findings to judge precision.
D-3 (C1 output semantics) and D-4 (shadow duration) stay open until a larger snapshot has been
scanned and reviewed. No fault class is cleared to feed deterministic freshness or conflict
rules.
