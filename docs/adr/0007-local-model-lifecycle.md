# ADR-0007: Local Model Lifecycle

Date: 2026-10-15
Status: Proposed
Deciders: Owner (pending)

## Context

The owner has two goals for local models (spec §1): evidence-quality tooling that
makes the platform's data and decisions more trustworthy, and a personal learning
sandbox for quantitative modelling. Neither is served by shipping a model into a
request path in Phase 1.

None of the three runtimes has an ML lifecycle today: there is no place for
offline training code, no dataset or artifact convention, no model card, and no
kill switch. Without one, experiments would leak into `data-service` or be
committed as binary blobs.

The spec guardrails (§4, items 4–10) require frozen hashed snapshots, offline
training only, gitignored data and weights, CPU-only product inference, per-model
kill switches with explicit degradation, replay identity, and an isolated
sandbox.

Data rights for provider data (Yahoo, Tiingo, Finnhub) are undecided (open
decision D-1). Until decided, provider data may be used for local evaluation and
inference but not for training.

## Decision

1. **D1 Location.** Offline model work lives in top-level `ml/` with its own
   `requirements.txt`, `requirements.lock.txt`, and `.venv`. It is not a runtime:
   no server, no port, no Compose service.
2. **D2 Isolation.** `data-service`, `backend`, and `frontend` never import from
   `ml/`. When a model is approved for serving, its inference code is copied into
   `data-service` as a reviewed module that depends only on NumPy or ONNX Runtime
   and loads a registry artifact by path.
3. **D3 Snapshots.** Training and evaluation read only frozen snapshots:
   `ml/snapshots/<snapshot_id>/manifest.json` plus Parquet files, format v1
   (columns, session-date rule per ADR-0006 D7, content-addressed id, per-file
   sha256, `adjusted` true/false/null).
4. **D4 Registry.** Artifacts live at `ml/artifacts/<model_id>/<version>/` with
   `model_card.json`. Versions are immutable once written.
5. **D5 Model card schema.** Required keys: `model_id`, `model_version`, `task`,
   `created_at`, `training_code_sha`, `dataset_snapshot_ids`,
   `feature_set_version`, `datasets` (`name`, `source_url`, `license`,
   `license_verified_at`, `sha256`), `base_model` (`id`, `revision`, `license`) or
   `null`, `metrics`, `evaluation_set_id`, `intended_use`, `out_of_scope_uses`,
   `kill_switch_env`. The schema is implemented with the first trained model
   (Phase 2); Phase 1 trains nothing.
6. **D6 Replay identity.** Every served model result carries `model_id`,
   `model_version`, `dataset_snapshot_id`, `feature_set_version`, and
   `training_code_sha` (spec §4.9, PRD-FR-027).
7. **D7 Serving.** CPU only (NumPy or ONNX Runtime) inside `data-service`; no CUDA
   dependency in any runtime. Each model has its own kill switch
   `ML_<MODEL_ID>_ENABLED` (default `false`); disabled, missing, corrupt, or
   mismatched artifacts yield `unavailable` with a reason (spec §4.8).
8. **D8 Data rights.** Until D-1 is decided, no model trains on Yahoo, Tiingo, or
   Finnhub data; provider data is used only for local evaluation and inference.
   Public training data requires a recorded, verified license.
9. **D9 Git hygiene.** `.gitignore` excludes `ml/.venv/`, `ml/.venv-*/`,
   `ml/artifacts/`, `ml/datasets/`, `ml/snapshots/`, `ml/reports/`, `*.onnx`,
   `*.gguf`, `*.parquet`, `*.joblib`; `ml/tests/test_repository_hygiene.py`
   enforces it.
10. **D10 Learning sandbox.** `ml/sandbox/` is never imported by any runtime; a
    test enforces this (spec §4.10). Sandbox output never enters the product.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Fourth Python runtime / model server | Conflicts with ADR-0002 (three runtimes); adds operational cost with no trained model to serve. |
| Train inside `data-service` | Couples training to the request path, risks CUDA dependencies, and violates read-only analytics. |
| MLflow or hosted registry | No trained artifact exists in Phase 1 and it adds a service; revisit with the first classifier (C3). |
| Weights in Redis or git | Redis is a cache with TTL semantics (ADR-0003); binaries in git violate repository hygiene. |

## Consequences

### Positive

- Reproducible evaluation: identical data gives an identical snapshot id.
- No product coupling; models cannot reach a request path without a reviewed copy.
- Explicit degradation path through per-model kill switches.

### Negative / trade-offs

- Inference code is duplicated when a model is served.
- A second virtual environment must be maintained.
- `ml/` is not yet part of CI.

## References

- `docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md`
- `AGENTS.md`
- ADR-0002, ADR-0003, ADR-0006
- PRD-FR-027, PRD-NFR-010
