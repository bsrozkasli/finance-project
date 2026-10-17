# Local Model Decision-Support Phase 1 Plan Set

**Goal:** Deliver Phase 1 of the local model decision-support design: explicit availability states on the four fabrication sites (C0a), the local model lifecycle ADR and `ml/` foundation (ADR-0007), an offline price-history data-quality scanner (C1), a zero-shot news classification spike (S1), and learning sandbox lesson 1 (C6).

**Architecture:** Five dependency-ordered plans with their own verification and atomic commits. Plan 1 touches only `data-service/` production code plus backend test-only compatibility proof and documentation. Plans 2–5 create a new top-level `ml/` directory that is never imported by `data-service`, `backend`, or `frontend`, has its own virtual environment, and keeps every dataset, snapshot, report on owner data, and artifact out of git. No plan adds a runtime, endpoint, migration, or model to a request path.

**Tech Stack:** Python 3.13 local (`data-service/.venv`, new `ml/.venv`, throwaway `ml/.venv-s1`), FastAPI, pydantic v2, pytest 9 (`asyncio_mode=auto`), httpx `MockTransport`, numpy, pandas 3, pyarrow, scipy; Spring Boot test slice with `MockRestServiceServer`; Hugging Face `transformers` on CPU (S1 only); PostgreSQL 16 `psql \copy`; Markdown.

**Spec:** `docs/superpowers/specs/2026-10-15-local-model-decision-support-design.md` (§4 guardrails, §5 Phase 1, §7 open decisions, §8 success criteria, §9 verification).

**Template:** `docs/superpowers/templates/implementation-plan-template.md`

## Plan Set Status

| Field | Value |
|---|---|
| Plan set | Local Model Decision-Support Phase 1 |
| Total plans | 5 |
| Overall status | Plans 1, 2, 5 complete (2026-10-17); Plan 3 Tasks 1–6 complete, Task 7 awaits owner; Plan 4 not started |
| Current executable plan | Plan 3 Task 7 (owner gate: read-only role on the real database and verdict review) and Plan 4 (Tasks 3–5 wait for owner labels) |
| Runtime scope | `data-service/` (Plan 1), `backend/src/test/` only (Plan 1), new `ml/` (Plans 2–5), `docs/adr/`, `docs/spec/current-system/contracts.md`, `docs/product/evidence/`, `.gitignore` |
| Product discussion language | Turkish |
| Product artifact language | English |

## Planning Findings

Facts discovered while writing these plans. They are not in the spec and change what the owner may want to decide.

### PF-1 — Composite score reads attributes that its inputs do not have

`data-service/app/services/composite_score_service.py:79-108` reads `factor_res.quality_score`, `factor_res.growth_score`, `factor_res.momentum_score`, `factor_res.low_volatility_score`, `val_res.valuation_grade`, and `earn_res.earnings_score` with `hasattr`. The real response models keep those values one level deeper:

| Read by composite | Real location | Model |
|---|---|---|
| `factor_res.quality_score` (and growth, momentum, low volatility) | `factor_res.scores.quality_score` | `FactorAnalysisResponse` (`app/models/factors.py`) |
| `val_res.valuation_grade` | `val_res.metrics.valuation_grade` | `ValuationResponse` (`app/models/valuation.py`) |
| `earn_res.earnings_score` | `earn_res.metrics.earnings_score` | `EarningsAnalysisResponse` (`app/models/earnings.py`) |

Verified on 2026-10-15 with `FactorAnalysisResponse.model_fields` etc.: none of the top-level names exist. Consequence: in production seven of eight breakdown fields are always the neutral default `50`; only `sentiment_score` varies. `overall_score` is therefore always between 47.5 and 52.5, the grade is always `C`, and the recommendation is always `"Reduce"`. Spring `SmartReport` and the React smart-report views display those values.

Plan 1 does **not** fix the paths, because the spec requires C0a to keep every existing value (§8). Plan 1 makes the defect visible on the wire (`breakdown_availability[...].unavailable_reason = "<component>_not_mapped"`) and records it in the C0b compatibility matrix. The fix is open decision **D-6** below.

### PF-2 — `useAgentAnalysis` has no component consumer

`frontend/src/hooks/useAgentAnalysis.ts` is referenced only by tests; no `.tsx` component imports it (verified with `rg -l useAgentAnalysis frontend/src --glob '*.tsx'`). The agent `decision`/`confidence` reach users only through the Spring endpoint and the persisted `agent_analysis_history` table. Recorded in the compatibility matrix (Plan 1 Task 7).

### PF-3 — `price_history` mixes intervals and does not record adjustment

`PriceIngestionService.ingestForSymbol(symbol, interval, range)` persists bars of any interval into `price_history`, whose only uniqueness is `(asset_id, price_timestamp)`, and no column records interval, provider, or adjustment. Plan 3 therefore adds a `duplicate_session` finding class, writes `"adjusted": null` (unknown) into exported snapshot manifests, and treats split detection as the way unadjusted history becomes visible.

## Open Decisions Added by Planning

| ID | Decision | Owner | Blocks |
|---|---|---|---|
| D-6 | Fix PF-1 now as a separate `fix(data-service)` change (values of `breakdown`, `overall_score`, `grade`, `recommendation` change; types do not), or fold it into C0b | Owner | Nothing in Phase 1; C0b disposition of composite fields |

Spec decisions still apply: D-1 (usage scope), D-2 (C0b disposition), D-3 (C1 semantics, after Plan 3 Task 7), D-4 (shadow duration), D-5 (owner labeling time, blocks Plan 4 Task 3).

## Execution Preconditions

These must hold before Plan 1 Task 1 or Plan 2 Task 1 starts. Record the evidence in the first PR description.

1. **Base branch contains the documentation restructure and the data-service hardening.** On 2026-10-15 `docs/spec/current-system/*.md`, `docs/agent/verification.md`, and `docs/superpowers/templates/` exist only in the working tree of `docs/local-model-decision-support`, and the data-service hardening commits (`9eb61f5`…`d475beb`) are not on `main`. Plan 1 edits `contracts.md` and relies on `tests/conftest.py` `ScriptedProvider` from the hardening set. Start execution only after both are merged:

   ```powershell
   git switch main
   git pull --ff-only
   git merge-base --is-ancestor d475beb HEAD; if ($?) { "hardening merged" } else { "STOP: hardening not merged" }
   git ls-files docs/spec/current-system/contracts.md docs/agent/verification.md
   git switch -c feat/local-model-phase-1
   ```

   Expected: `hardening merged`, then both paths printed. If either check fails, stop.

2. **Working data-service interpreter.**

   ```powershell
   Set-Location data-service
   .\.venv\Scripts\python.exe -m pytest -q
   Set-Location ..
   ```

   Expected: green. The planning baseline on 2026-10-15 was `128 passed, 1 xfailed`. Record the actual count; every later "full suite" step expects that count plus the tests the plan adds, and still `1 xfailed`.

3. **Python 3.13 available for `ml/`.** `& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" --version` prints `Python 3.13.x`.

## Dependency Graph

```text
Plan 1: C0a explicit section availability (data-service)      ── independent of ml/
Plan 2: ADR-0007 + ml/ foundation (venv, gitignore, snapshot format)
  ├─> Plan 3: C1 offline price-history data-quality scanner      [owner gate: real snapshot review, Task 7]
  ├─> Plan 4: S1 zero-shot news spike                            [owner gates: D-5 labeling, license check]
  └─> Plan 5: C6 sandbox lesson 1 + import guard
```

Plan 1 and Plan 2 may run in parallel. Plans 3, 4, and 5 need Plan 2's `ml/.venv`, `ml/pytest.ini`, and `.gitignore` entries; they may run in any order after it. Plan 4 Tasks 3–5 wait for the owner's labels.

## Child Plans

| Plan | File | Outcome | Status |
|---:|---|---|---|
| 1 | [`2026-10-15-local-model-01-c0a-explicit-section-status.md`](2026-10-15-local-model-01-c0a-explicit-section-status.md) | `SectionAvailability` on sentiment, enhanced sentiment, composite, and agent responses; backend tolerance tests; C0b compatibility matrix | Complete (2026-10-15, 161 passed, 1 xfailed) |
| 2 | [`2026-10-15-local-model-02-adr-0007-ml-foundation.md`](2026-10-15-local-model-02-adr-0007-ml-foundation.md) | ADR-0007 `Proposed`; `ml/` venv and layout; gitignore guard test; content-addressed snapshot writer/loader | Complete (2026-10-17, `ml` 26 passed; commits `ea665dc`, `17c1f58`, `e0def1a`) |
| 3 | [`2026-10-15-local-model-03-c1-price-dq-scanner.md`](2026-10-15-local-model-03-c1-price-dq-scanner.md) | Read-only export runbook; nine fault-class scanner; fixture suite meeting recall ≥ 95% and false flags < 1%; replayable report; reviewed real-snapshot record | Tasks 1–6 complete (2026-10-17, `ml` 64 passed; recall 1.00 per class, false-flag rate 0.006); Task 7 awaits owner |
| 4 | [`2026-10-15-local-model-04-s1-news-zero-shot-spike.md`](2026-10-15-local-model-04-s1-news-zero-shot-spike.md) | Pre-registered protocol; license record; owner-labeled set; zero-shot macro-F1 and confusion matrices; written recommendation | Not started |
| 5 | [`2026-10-15-local-model-05-c6-sandbox-lesson-1.md`](2026-10-15-local-model-05-c6-sandbox-lesson-1.md) | Sandbox scaffold and import guard; GARCH(1,1) simulation, EWMA and GARCH fits, walk-forward QLIKE, parameter recovery | Complete (2026-10-17, `ml` 39 passed after Plan 2) |

## Plan Set Locked Decisions

- **Spec guardrails are binding** (spec §4, items 1–10). A task that cannot meet one stops and returns to the owner.
- **C0a is additive.** No existing field changes name, type, or value; no error response becomes a success response; no success response becomes an error. New fields are required in the pydantic models so a code path cannot silently omit them.
- **`ml/` is a sibling directory, not a fourth runtime.** It has its own `requirements.txt` and `.venv`, runs only from the command line, and nothing under `data-service/`, `backend/`, or `frontend/` references it.
- **Nothing trained enters the product in Phase 1.** C1 uses statistics and rules; S1 and the sandbox produce reports only.
- **Owner data stays local.** Snapshots, exports, labeled headlines, predictions, and reports computed on owner data live under gitignored `ml/snapshots/`, `ml/datasets/`, `ml/reports/`. Only aggregate counts and metrics may be committed, under `docs/product/evidence/`.
- **No live provider in any automated test.** Data-service tests replace Finnhub and Azure OpenAI with `httpx.MockTransport` or module-attribute doubles; `ml/` tests use generated fixtures only. The S1 headline collector is a manual tool against the locally running backend and has no automated test that performs I/O.
- **Pre-registration.** Plan 3 thresholds and Plan 4 metrics and decision rules are committed before any result on owner data is computed (spec §10, "researcher degrees of freedom").
- **One commit per task**, Conventional Commits. Scopes: `data-service`, `backend` (test-only), `spec`, `adr`, `ml` (new scope for `ml/`; record it in the PR description).

## Global Constraints

- "Never fabricate market data, metadata, news, analysis, research, or AI output." (`AGENTS.md`)
- "Preserve endpoint paths and DTO fields unless every consumer changes together." (`AGENTS.md`)
- "Never call live financial providers from automated tests; use boundary stubs." (`AGENTS.md`)
- "Never commit or expose secrets, provider credentials, `.env`, build output, dependency directories, or generated junk." (`AGENTS.md`)
- "Keep data-service analytics read-only unless a persistence architecture is explicitly approved." (`AGENTS.md`)
- "No model output sets or changes a Decision label, weight, Evidence Strength, or hard limit." (spec §4.1)
- "No model is trained on Yahoo, Tiingo, or Finnhub data." (spec §4.4)
- "Nothing under `ml/sandbox/` is imported by `data-service`, `backend`, or `frontend`; a test enforces this." (spec §4.10)
- Preserve unrelated working-tree changes and exclude them from scoped commits.

## Out of Scope (owned elsewhere)

| Item | Why excluded | Owner |
|---|---|---|
| C0b (nullable numerics, retiring keyword `BUY`/`SELL`, renaming `recommendation`) | Coordinated Spring/React change gated on D-2/OQ-5 | Future spec revision; Plan 1 Task 7 supplies the matrix |
| PF-1 attribute-path fix | Changes values; spec §8 forbids it inside C0a | D-6 |
| Non-dict LLM JSON in `SentimentService` (`parsed.get` on a list raises `AttributeError` → 500) | Turning it into a 200 would expose a fabricated `0.0` to consumers that ignore `availability` | C0b; recorded in Plan 1 handoff |
| Phase 2 (C3 classifier, C1 integration, sandbox lessons 2–3) and Phase 3 (C2, C4, C7) | Gated; each needs a spec revision | Spec §5 |
| Cross-provider conflict checks | `price_history` stores no provider column | Spec §5 P1.3 |
| Python 3.11/3.12 CI mismatch; adding `ml/` to CI | Lives in `.github/workflows/` | Future `chore/ci-*` change |

## Plan Set Exit Criteria

- [ ] All five plans meet their own exit criteria.
- [ ] Spec §8 success criteria each map to fresh evidence in the PR descriptions:
  - [ ] fabrication-site statuses — Plan 1 Tasks 2–5
  - [ ] ADR-0007 `Proposed` with README row — Plan 2 Task 1
  - [ ] C1 recall and false-flag targets plus reviewed real-snapshot record — Plan 3 Tasks 6–7
  - [ ] S1 written recommendation with macro-F1 per label — Plan 4 Task 5
  - [ ] sandbox parameter recovery, walk-forward QLIKE, import guard — Plan 5
  - [ ] no provider called in automated tests; no artifact or dataset tracked — Plan 2 Task 2 guard test plus `git ls-files ml | rg -n "\.(parquet|onnx|gguf|joblib|csv)$"` printing nothing
- [ ] `data-service`: `.\.venv\Scripts\python.exe -m pytest -q` green; `backend`: `.\mvnw.cmd test` green; `frontend`: `npm run lint`, `npm run test:coverage`, `npm run build` green; `ml`: `.\.venv\Scripts\python.exe -m pytest -q` green.
- [ ] Unrelated working-tree changes remain unstaged and unmodified.
