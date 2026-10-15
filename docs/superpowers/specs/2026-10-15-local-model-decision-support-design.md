# Local Model Decision-Support Design

**Status:** Draft — awaiting owner review

**Date:** 2026-10-15

**Scope:** Locally trained and locally served models that strengthen existing decision-support epics, plus a separate learning track. Phase 1 is specified for planning; later phases are gated roadmap entries that each need their own spec revision before planning.

## 1. Intent

The owner has two goals, held jointly:

1. **Strengthen decision support.** Make the evidence behind the product's existing decisions more trustworthy and more informative.
2. **Learn to train models.** Build, validate, and serve at least one model end to end, locally.

The models run on the owner's laptop and process data the system already receives. They never become the decision authority: the deterministic core decides; models supply versioned evidence, evidence-quality signals, or narrative checks.

What the owner said versus what this design assumes:

| Said by the owner | Assumed by this design |
|---|---|
| Train a small model that runs locally and analyzes incoming data | Product-path models run on CPU; the GPU is used only for offline training |
| Goals 1 and 2 together | Two tracks with a shared lifecycle; learning-track output never enters the product |
| Train on an external dataset (e.g. Hugging Face), test on our data | Training uses public datasets; provider data is used only for evaluation and inference |
| Unsure who will see the output | The strictest data-rights assumption applies until the owner decides (§7, D-1) |
| All four needs are wanted | Needs are ordered by dependency, not dropped (§3) |

## 2. How These Decisions Were Reached

A three-expert panel (Quant/Financial-ML Researcher, Platform & MLOps Architect, Product/Risk/Compliance Skeptic) produced independent positions, then rebutted each other and voted on nine candidates. The vote record is in §11. Every "do" and "do not" item below was unanimous unless §11 says otherwise.

## 3. Needs, Epics, and Model Contribution

Each need already exists in the product roadmap. Model work attaches to an epic; it does not create a parallel product.

| Need | Investor question | Epic (phase) | Model contribution | Model needed? |
|---|---|---|---|---|
| N1 Trusted data | "Is this number correct, fresh, and not made up?" | EPIC-001 Trusted Market Evidence (V1, first) | C0 fabricated-default removal; C1 data-quality scanner | Mostly statistics and rules |
| N6 Trusted AI explanation | "Can I trust the AI's explanation?" | EPIC-006 AI Decision Explanation | C4 evidence-link checker | Rules first |
| N2/N3 Discovery and research | "What should I look at; what context matters?" | EPIC-005, EPIC-003 | C3 news event types for research context | Partly |
| N4 Risk and sizing | "How risky is this addition; how much?" | EPIC-004 Investment Quality & Portfolio Fit | C2 forward volatility/drawdown estimate | Statistical estimator |
| N5 Monitoring | "Did something material break my thesis?" | EPIC-007 Material Change Monitoring | C3 news event-type classifier | **Yes — the clearest model need** |
| N7 Personal fit (post-V1) | "Which eligible candidate suits me?" | EPIC-008 | C7 pairwise ranker | Yes, post-V1 only |
| N10 Learning | Owner skill | — | C6 sandbox; C3 training work | Yes |

Dependency order follows the epics: EPIC-001 → 002 → 003 → 004 → (005, 006, 007). Trusted evidence precedes every model that consumes it.

## 4. Guardrails

These bind every phase. A phase that cannot meet one stops and returns to the owner.

1. **Deterministic core.** No model output sets or changes a Decision label, weight, Evidence Strength, or hard limit (PRD §5.4, §6.3, PRD-FR-030).
2. **No fabricated values.** A missing input produces an explicit unavailable or insufficient state, never a neutral, default, or guessed value (PRD-FR-007, PRD-NFR-005, `AGENTS.md`). New model work meets this from the start. Legacy fabricated defaults are first labeled by C0a and removed by C0b (§5, P1.1); no model may train on, be evaluated against, or consume a legacy field whose status is not `available`.
3. **No predictive claims.** No price-direction or return prediction, no `Buy/Hold/Sell`, no predictive confidence percentage (PRD §3.4).
4. **Strict data-rights assumption (until D-1).** No model is trained on Yahoo, Tiingo, or Finnhub data. Provider data may be used for evaluation and inference only, for the owner's local use. Training uses public datasets whose licenses are verified and recorded in the model card.
5. **Offline training only.** No training on a request path and no training from live provider calls. Training reads frozen, hashed snapshots.
6. **Artifacts outside git.** Weights, datasets, snapshots, and labeled sets are gitignored; each artifact has a model card with dataset hashes, license, code SHA, and metrics.
7. **CPU serving.** Product-path inference runs on CPU (ONNX Runtime or NumPy). No CUDA dependency enters `data-service`.
8. **Explicit degradation and kill switch.** A disabled, missing, corrupt, or mismatched model yields `unavailable` with a reason; each model has its own kill switch (PRD-NFR-010).
9. **Replay identity.** A model result carries `model_id`, `model_version`, `dataset_snapshot_id`, `feature_set_version`, and `training_code_sha` (PRD-FR-027).
10. **Learning isolation.** Nothing under `ml/sandbox/` is imported by `data-service`, `backend`, or `frontend`; a test enforces this.

## 5. Scope by Phase

### Phase 1 — Plan next

#### P1.1 C0 — Explicit state instead of fabricated defaults (EPIC-001)

Confirmed fabrication sites:

| Site | Current behavior | Why it is fabrication |
|---|---|---|
| `data-service/app/services/sentiment_service.py` (~L44-47, L131-137) | No news or parse failure returns `score=0.0, label="NEUTRAL"` | "No data" displayed as "neutral" |
| `data-service/app/services/enhanced_sentiment_service.py` (L79, L100, L130, L140) | Failures or missing analyst data return `0.0, "NEUTRAL"` / `0.0, "Hold"` | Same |
| `data-service/app/services/composite_score_service.py` (L74-110) | Every unavailable sub-score defaults to 50; output includes `recommendation` "Strong Buy"…"Strong Sell" | Missing evidence counted as average; recommendation conflicts with PRD §3.4 |
| `data-service/app/agents/portfolio_manager.py` (L37-46) | Unparseable LLM text becomes `BUY`/`SELL` at confidence 70 by keyword, else `HOLD` at 50 | Decision and confidence invented from free text |

Known consumers (contract-sensitive): `DataServiceAgentAnalysisAdapter`, `DataServiceResearchAdapter`, `AgentAnalysisController`, `AgentAnalysisCacheService`, `AgentAnalysisHistoryAdapter` (persists `decision`/`confidence`), `SmartReport`, `AgentSentimentSnapshot` (already accepts `null` sentiment score), and frontend `useAgentAnalysis.ts`, `useSmartReport.ts`, `AiReportsView.tsx`, `StockDetailModal.tsx`.

C0 is split to respect "preserve endpoint paths and DTO fields unless every consumer changes together":

- **C0a (Phase 1, additive, no consumer break).** Each affected response gains an explicit availability field per section — `status` ∈ {`available`, `unavailable`, `insufficient`, `unparseable`} plus `unavailable_reason: str | None` — computed from the existing failure branches. Existing numeric and label fields keep their current values and types. Composite responses list which components were unavailable. Agent analysis marks a keyword-parsed decision as `unparseable`. Tests prove that each failure branch sets the status and that success paths report `available`.
- **C0b (gated on an OQ-5 disposition, not Phase 1 implementation).** Coordinated Spring/React change: numeric fields become nullable and stop carrying defaults, keyword-parsed decisions stop emitting `BUY`/`SELL`, and the composite `recommendation` string is retired or renamed per PRD §3.4. Phase 1 produces the compatibility matrix (source field → each consumer → disposition) as input to that decision.

#### P1.2 ADR-0007 — Local model lifecycle (Proposed)

Records guardrails 4-10 as architecture: offline training in a top-level `ml/` package with its own dependency file and virtual environment; the snapshot format (Parquet plus `manifest.json` with symbols, date range, `adjusted` flag, feature-set version, and sha256 per file); the filesystem registry `ml/artifacts/<model_id>/<version>/` with `model_card.json`; CPU inference inside `data-service` when a model is approved for serving; no fourth runtime; `.gitignore` entries for `ml/artifacts/`, `ml/datasets/`, `ml/snapshots/`, `*.onnx`, `*.gguf`, `*.parquet`, `*.joblib`.

#### P1.3 C1 — Offline price-history data-quality scanner (EPIC-001)

- **Form:** CLI `ml/dq/scan.py`; never on a request path; no product integration in Phase 1.
- **Input:** a snapshot exported from Postgres `price_history` by a documented read-only SQL export (`\copy` under a read-only role), converted to the P1.2 snapshot format. No new backend endpoint and no data-service persistence.
- **Fault classes:** unadjusted split or reverse split, missing sessions, stale repeated bars, zero or negative prices, OHLC inconsistency (`low > high`, close outside range), extreme return outliers, volume anomalies.
- **Method:** robust z-score/MAD on log returns and volume, deterministic rule checks, split-ratio detection. Thresholds live in a versioned `thresholds.json`. No trained artifact in Phase 1.
- **Output:** a versioned JSON report (finding per symbol/date, fault class, measured value, threshold, scan version, snapshot id) and a human-readable summary.
- **Success:** recall ≥ 95% on an injected-fault fixture suite; < 1% flagged symbol-years on clean fixtures; on the owner's real snapshot, a reviewed count of true and false findings is recorded. The real-snapshot review decides whether C1 integrates into EPIC-001 freshness/conflict states (§7, D-3).
- **Cross-provider conflict checks** are deferred: `price_history` stores no provider column (`backend/src/main/resources/db/migration/V1__initial_schema.sql`), so Phase 1 checks single-series integrity only.

#### P1.4 S1 — Spike: does a pretrained financial text model work on our news?

- **Question:** without any training, how well does a pretrained financial text model classify our news headlines by event type and tone?
- **Probe:** collect 300-500 recent headlines from the existing Finnhub news path into a gitignored local file; the owner labels them with the schema below; run one or two pretrained Hugging Face financial text models zero-shot on CPU; report macro-F1 and a confusion matrix per label.
- **Label schema:** event type ∈ {earnings, guidance, M&A, litigation/regulatory, analyst action, product/operations, capital return/financing, macro/sector, other}; tone ∈ {negative, neutral, positive}; `material` ∈ {yes, no}.
- **Output:** a recommendation only — fine-tune needed, not needed, or approach not viable. Spike code is throwaway and is not imported by the product.
- **Owner cost:** about 1-2 hours of labeling.
- **Prerequisite:** verify and record the licenses of the candidate models before use.

#### P1.5 C6 — Learning sandbox, lesson 1

- `ml/sandbox/` scaffold, its own dependency file, and an import-guard test (guardrail 10).
- Lesson 1: simulate GARCH(1,1) series with known parameters; fit EWMA and GARCH; evaluate with rolling-origin walk-forward and QLIKE; confirm parameter recovery. This rehearses C2 on synthetic data only.

### Phase 2 — Gated; requires a spec revision before planning

| Item | Gate |
|---|---|
| C3 News event-type classifier: fine-tune a ~100M-parameter model on a license-verified public dataset with Hugging Face `transformers`, evaluate on the frozen S1 labeled set, export to ONNX, shadow-run inside `data-service` behind a kill switch | S1 recommends fine-tuning or confirms zero-shot is adequate; licenses recorded; P1.2 accepted |
| C1 integration into EPIC-001 freshness/conflict states | D-3 decided from the real-snapshot review |
| C6 lessons 2-3: FRED regime classifier with leakage controls; small text classifier on public data | Lesson 1 complete |

### Phase 3 and later — Gated

| Item | Gate |
|---|---|
| C2 Forward volatility/drawdown estimate (EWMA → GARCH/HAR) for Portfolio Fit | OQ-4 risk policy; adjusted-close storage migration; frozen walk-forward report beats EWMA on QLIKE with Diebold-Mariano p < 0.05 and passes Kupiec/Christoffersen coverage by regime; ≥ 4 weeks shadow |
| C4 Narrative evidence-link checker (rules first) | EPIC-006 evidence-link contract exists |
| C7 Pairwise personal ranker | EPIC-008 gates: consent, ≥ 20 explicit decisions over 8 weeks, shadow mode, deletion support (PRD-FR-044-049, 067-070) |

## 6. Out of Scope — Will Not Do

| Item | Reason |
|---|---|
| Price-direction or return prediction; `Buy/Hold/Sell`; predictive confidence % | PRD §3.4, PRD-FR-038 |
| A model changing labels, weights, Evidence Strength, or limits | PRD §5.4, PRD-FR-030 |
| LLM fine-tuning | PRD §3.4 |
| Local LLM as an Azure narrative fallback (C5) | PRD-FR-039 requires no narrative on failure; weaker grounding; new runtime |
| Filling missing data with a model | PRD-FR-007, PRD-FR-010 |
| Training on Azure outputs (distillation) | Unvalidated, partly fabricated labels; PRD-FR-036 |
| Training on provider data before D-1 | PRD-FR-072, PRD-NFR-008 |
| Risk-tolerance inference from clicks or holdings | PRD §3.4, PRD-FR-045 |
| Weights or datasets in git or Redis; GPU/CUDA in `data-service` | Repository hygiene; ADR-0003 |
| Provider-failure forecasting for cache scheduling | Panel majority: resolver health checks already cover it |
| Reusing the legacy `agent_analysis_history.confidence` column for model scores | Legacy contract (OQ-5) |

## 7. Open Decisions

| ID | Decision | Owner | Blocks |
|---|---|---|---|
| D-1 | Usage scope: owner-only local use, or other viewers later. Relaxes guardrail 4 only if owner-only. | Owner | Training on provider data; any external display |
| D-2 | C0b disposition per field (nullable, rename, retire) | Owner / OQ-5 | C0b implementation |
| D-3 | C1 output semantics: findings only as candidates for deterministic rules, or versioned thresholds feeding conflict/freshness states directly (panel split) | Owner, after the real-snapshot review | C1 integration |
| D-4 | Shadow duration for internal-only diagnostics (panel split: 4 weeks vs none) | Owner | C1 integration |
| D-5 | Owner time for S1 labeling (about 1-2 hours) | Owner | S1 |

## 8. Phase 1 Success Criteria

- Every fabrication site in P1.1 reports an explicit status on its failure branch; no existing field changes type or value; all current consumer tests stay green.
- ADR-0007 exists as `Proposed`, with its README row.
- C1 meets the recall and false-flag targets on fixtures and produces a reviewed report on the owner's real snapshot.
- S1 produces a written recommendation with macro-F1 per label on the owner-labeled set.
- Sandbox lesson 1 recovers the simulated GARCH parameters and reports walk-forward QLIKE; the import-guard test passes.
- No provider is called in any automated test; no artifact or dataset is tracked by git.

## 9. Verification Approach

- **Data-service (C0a):** pytest per failure branch using the existing `ScriptedProvider` doubles; contract tests confirm unchanged field types.
- **Backend and frontend:** existing suites run unchanged to prove C0a is additive.
- **C1:** an injected-fault fixture generator with a fixed seed; a replay test proving the same snapshot and scan version produce a byte-identical report.
- **Sandbox:** deterministic seeds; the import-guard test scans `data-service/`, `backend/`, and `frontend/` for references to `ml/sandbox`.
- **S1:** spike output is a report, not a test suite.

## 10. Risks

| Risk | Mitigation |
|---|---|
| No point-in-time data; adjusted closes are not stored | Phase 1 avoids return-based supervised learning; C2 is gated on the adjusted-close migration |
| Domain shift between public text datasets and Finnhub headlines | S1 measures it before any training investment |
| Dataset or model licenses forbid the intended use | License verification is a prerequisite and is recorded in the model card |
| Small or survivorship-biased universe | C1 is per-series; cross-sectional models are out of Phase 1 |
| Researcher degrees of freedom with a single developer | Metrics and the frozen evaluation set are fixed in writing before results are seen |
| Opportunity cost against Ready gap-map rows | Phase 1 is small; C0 also advances EPIC-001 directly |

## 11. Panel Vote Record

| # | Candidate | Quant | Architect | Skeptic | Outcome |
|---|---|---|---|---|---|
| C0 | Remove fabricated defaults | Now | Now | Now | Phase 1 |
| C1 | Data-quality scanner | Now | Now (statistics first) | Now (internal) | Phase 1 |
| C2 | Forward volatility/drawdown | Later | Later | Later (OQ-4) | Phase 3 |
| C3 | Local news event-type encoder | Later | Later | Later (OQ-2) | S1 in Phase 1; C3 in Phase 2, trained on public data |
| C4 | Narrative evidence-link checker | Later | Later | Later | Phase 3 |
| C5 | Local LLM narrative fallback | Don't | Don't | Don't | Out of scope |
| C6 | Learning sandbox | Later / optional | Now (guarded) | Now | Phase 1 lesson 1 |
| C7 | Pairwise personal ranker | Later | Later | Later | Post-V1 |
| C8 | Platform foundation | Lite now | Split | Lite later | ADR-0007 and snapshot format now; ONNX serving with C3 |

The owner's later proposal to train on external Hugging Face datasets moved C3 forward: training on public data removes the provider-data training blocker while evaluation on owner data measures real-world fit.

## 12. References

- `AGENTS.md`, `SPEC.md`
- `docs/product/PRD.md` §3.4, §5.4, §5.5, §6.3, §11, §12.1; PRD-FR-007, 010, 027, 028, 030, 036-039, 044-049, 067-072; PRD-NFR-005, 008, 010
- `docs/product/epics/EPIC-001` through `EPIC-008`
- `docs/adr/0001` through `0006`
- `docs/superpowers/plans/2026-10-13-data-service-boundary-hardening.md`
