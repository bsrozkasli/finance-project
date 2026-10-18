# Data-Service Boundary Hardening Plan Set

**Goal:** Close the data-service-only gaps recorded by the brownfield audit: prove resolver degradation, remove dead configuration, honor `PROVIDER_CHAIN`, expose cache-hit metrics, route all price history through `MarketDataResolver`, and make analysis/research failures explicit.

**Architecture:** Six dependency-ordered plans, each with its own verification and atomic commits. Plan 1 is test-only and becomes the safety net for every later plan. Plans 4 and 5 implement the provider-boundary decision recorded as ADR-0006; Plan 4 stops at an approval gate before any call-site migration. No plan edits backend, frontend, CI workflow, Compose, or Prometheus files.

**Tech Stack:** Python 3.13 local (`data-service/.venv`), FastAPI, pydantic v2, pandas 3, yfinance 1.4.1, prometheus-client, pytest 9 with `asyncio_mode=auto`, Markdown.

**Spec:** `SPEC.md` with `docs/spec/current-system/architecture.md`, `contracts.md`, `operations.md`; evidence in `docs/product/evidence/data-service.md` (`CAP-CUR-DS-001`–`009`) and `docs/product/evidence/legacy-document-conflicts.md` (`DOC-CONFLICT-001`, `005`, `008`).

**Template:** `docs/superpowers/templates/implementation-plan-template.md`

## Plan Set Status

| Field | Value |
|---|---|
| Plan set | Data-Service Boundary Hardening |
| Total plans | 6 |
| Overall status | Not started — awaiting maintainer review of this plan set |
| Current executable plan | Plan 1 after the execution preconditions below pass |
| Runtime scope | `data-service/` only, plus the data-service rows of `docs/spec/current-system/*.md`, `SPEC.md` open questions, and `docs/adr/` |
| Product discussion language | Turkish |
| Product artifact language | English |

## Execution Preconditions

These must hold before Plan 1 Task 1 starts. Record the evidence in the first PR description.

1. **Documentation base exists in history.** `docs/spec/current-system/*.md`, `docs/agent/verification.md`, and the restructured `SPEC.md` are currently uncommitted on `docs/evidence-driven-product-design`. Plans 2, 3, 5, and 6 edit them. Start the execution branch only after that branch is merged into `main`:

   ```powershell
   git switch main
   git pull --ff-only
   git switch -c feat/data-service-boundary-hardening
   git ls-files docs/spec/current-system/operations.md
   ```

   Expected: the last command prints the path. If it prints nothing, stop — the documentation base is not merged.

2. **Working local interpreter.** `data-service/.venv/pyvenv.cfg` points to `C:\Users\basar\anaconda3\python.exe`, which no longer exists, so the venv cannot start. Rebuild it with the versions the audit used:

   ```powershell
   Set-Location data-service
   Get-ChildItem .venv\Lib\site-packages -Directory -Filter *.dist-info |
     ForEach-Object { $_.Name -replace '\.dist-info$','' -replace '-(?=[^-]+$)','==' } |
     Set-Content -Encoding utf8 ..\.venv-constraints.txt
   Remove-Item -Recurse -Force .venv
   & "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt -c ..\.venv-constraints.txt
   Remove-Item ..\.venv-constraints.txt
   .\.venv\Scripts\python.exe -c "import yfinance, pandas; print(yfinance.__version__, pandas.__version__)"
   .\.venv\Scripts\python.exe -m pytest
   ```

   Expected: `1.4.1 3.0.3`, then a green suite. Record the pass count as the baseline (the audit recorded `50 passed`). `.venv` and the constraints file are git-ignored/temporary and are never committed. If pip cannot satisfy a constraint, drop only that line, note it in the PR, and continue.

## Dependency Graph

```text
Plan 1: Resolver degradation characterization (test-only)
  ├─> Plan 2: Configuration hygiene and PROVIDER_CHAIN
  ├─> Plan 3: Cache observability
  └─> Plan 4: Resolver price-history capability + ADR-0006   [approval gate]
        └─> Plan 5: Price-history call-site migration
              └─> Plan 6: Analysis and research failure semantics
```

Plans 2, 3, and 4 depend only on Plan 1 and may run in any order. Plan 5 needs Plan 4's accepted ADR and helpers. Plan 6 edits files Plan 5 rewrites, so it runs last.

## Child Plans

| Plan | File | Outcome | Status |
|---:|---|---|---|
| 1 | [`2026-10-13-data-service-01-resolver-characterization.md`](2026-10-13-data-service-01-resolver-characterization.md) | Shared provider doubles; fallback, blacklist, recovery, exhaustion, and wire-level degradation tests | Not started |
| 2 | [`2026-10-13-data-service-02-config-and-provider-chain.md`](2026-10-13-data-service-02-config-and-provider-chain.md) | Unused MongoDB settings removed; `PROVIDER_CHAIN` controls registration order | Not started |
| 3 | [`2026-10-13-data-service-03-cache-observability.md`](2026-10-13-data-service-03-cache-observability.md) | Macro/calendar cache hit, miss, and Redis-error counters | Not started |
| 4 | [`2026-10-13-data-service-04-resolver-price-capability.md`](2026-10-13-data-service-04-resolver-price-capability.md) | ADR-0006; `adjusted` OHLCV contract; Tiingo daily-only guard; price-history helpers | Not started |
| 5 | [`2026-10-13-data-service-05-price-history-migration.md`](2026-10-13-data-service-05-price-history-migration.md) | Technical, pattern, risk, factor-momentum, and portfolio price history served by the resolver | Not started |
| 6 | [`2026-10-13-data-service-06-failure-semantics.md`](2026-10-13-data-service-06-failure-semantics.md) | Research 422/503/500 mapping; `/full` and `/patterns` defects fixed | Not started |

## Plan Set Locked Decisions

- Work stays inside `data-service/` plus the data-service rows of current-system docs, `SPEC.md`, and `docs/adr/`. Backend adapters are read only to prove compatibility; they are never edited.
- Every HTTP path, query parameter, and response field stays unchanged. Status-code changes happen only where every backend consumer was verified to treat the old and new codes identically (Plan 6).
- No test calls a live provider, Redis, or Azure OpenAI. Provider boundaries are replaced with the `ScriptedProvider` double from Plan 1 or with module-attribute monkeypatches.
- Audit evidence files under `docs/product/evidence/` are commit-pinned records and are not rewritten; current-system docs and `SPEC.md` are updated instead.
- One commit per task, Conventional Commits, scope `data-service` (or `spec`/`adr` for documentation-only tasks).

## Out of Scope (owned elsewhere)

| Item | Why excluded | Owner |
|---|---|---|
| Python 3.11 vs 3.12 CI mismatch | Lives in `.github/workflows/`, not the data-service package | Future `chore/ci-python-version` change; `SPEC.md` open question |
| Migrating `.info` and financial-statement reads (fundamental, factor value/growth/quality/institutional, valuation) | Needs a provider-protocol extension; ADR-0006 records it as an exception | Follow-up ADR + plan after Plan 5 |
| Deleting unreachable `portfolio_analytics_service.py` | No route uses it; deletion is a separate decision | Maintainer decision recorded in ADR-0006 |
| Seven-state per-section status DTOs (`PRD-FR-007`/`009`) | Blocked on `OQ-3` | `EPIC-001` |
| Decision Result contract for agent output | Blocked on `DOC-CONFLICT-009` | `EPIC-004`/`EPIC-006` |
| Cross-runtime wire fixtures for `PRD-FR-010` | Needs backend and frontend tests | `EPIC-001`; Plan 1 delivers the data-service half |

## Plan Set Exit Criteria

- [ ] All six plans meet their own exit criteria.
- [ ] `.\.venv\Scripts\python.exe -m pytest` from `data-service/` passes with fresh output recorded in the PR.
- [ ] `rg -n "^import yfinance" data-service/app` lists exactly `providers/yahoo_provider.py` and the ADR-0006 exception files: `services/fundamental_analysis_service.py`, `services/factor_analysis_service.py`, `services/valuation_service.py`, `services/portfolio_analytics_service.py`.
- [ ] Unrelated working-tree changes remain unstaged and unmodified.
