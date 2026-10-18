# ml — Offline Model Workspace

## Purpose

Offline, local-only model work for two owner goals: evidence-quality tooling for
the platform and a personal quantitative-learning sandbox. See
`docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md` and
`docs/adr/0007-local-model-lifecycle.md`. `ml/` is not a runtime and nothing in
`data-service/`, `backend/`, or `frontend/` imports it.

## Rules

- D1: lives in `ml/` with its own `requirements.txt`, lock file, and `.venv`; no server, port, or Compose service.
- D2: no runtime imports from `ml/`; served inference code is a reviewed copy in `data-service`.
- D3: training and evaluation read only frozen snapshots (`snapshots/<snapshot_id>/`).
- D4: artifacts at `artifacts/<model_id>/<version>/` with `model_card.json`; immutable.
- D5: model card schema is defined in the ADR.
- D6: served results carry model id, version, snapshot id, feature-set version, and code SHA.
- D7: CPU only; per-model kill switch `ML_<MODEL_ID>_ENABLED`, default `false`.
- D8: no training on Yahoo, Tiingo, or Finnhub data until decision D-1.
- D9: never commit anything under `datasets/`, `snapshots/`, `reports/`, `artifacts/`, or any `.venv*`; a test enforces it.
- D10: `sandbox/` is never imported by a runtime; a test enforces it.

## Setup

```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip freeze | Set-Content -Encoding utf8 requirements.lock.txt
```

## Layout

| Path | Contents | Tracked |
|---|---|---|
| `lifecycle/` | hashing and snapshot format | yes |
| `dq/` | price-history data-quality scanner | yes |
| `sandbox/` | learning lessons | yes |
| `spikes/` | throwaway experiments | yes |
| `.venv/`, `.venv-*/`, `artifacts/`, `datasets/`, `snapshots/`, `reports/` | local data and environments | no |

## Running

From `ml/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m <package>.<module>
```
