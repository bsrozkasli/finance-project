# S1 — Zero-Shot News Classification Spike (throwaway)

Pre-registered protocol: [`PREREGISTRATION.md`](PREREGISTRATION.md). Nothing here is
imported by any runtime or by `ml/lifecycle`, `ml/dq`, or `ml/sandbox`, and the default
`ml` test run does not collect it.

All commands run from `ml/` with the spike's own venv (`ml/.venv-s1`, CPU-only torch):

```powershell
.\.venv-s1\Scripts\python.exe -m pytest spikes/s1_news_zero_shot -q
```

## Steps

| # | Step | Command | Owner time |
|---|---|---|---|
| 2 | Pin revisions and record licenses | `python -m spikes.s1_news_zero_shot.verify_models` | license decision |
| 3 | Collect headlines (backend running on :8080) | `python -m spikes.s1_news_zero_shot.collect_headlines --symbols <watchlist>` | — |
| 3 | Label `datasets/s1/labels.csv` | spreadsheet, UTF-8 CSV | 1–2 hours |
| 3 | Relabel the 50-row sample ≥ 3 days later | `relabels.csv` | about 10 minutes |
| 4 | Zero-shot predictions on CPU | `python -m spikes.s1_news_zero_shot.run_zero_shot` | — |
| 5 | Score and recommend | `python -m spikes.s1_news_zero_shot.evaluate` | — |

Local data (never committed): `datasets/s1/`, `reports/s1/`, the Hugging Face cache.

Throwaway: delete this directory once C3 is planned or the approach is rejected.
