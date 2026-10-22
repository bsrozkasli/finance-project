# Capability Gap Map

## Method

This map compares the target requirements in `PRD.md` with the audited
`CURRENT_STATE_BASELINE.md` and its declared `CAP-CUR-*` evidence. A current
locator proves only the bounded behavior in the baseline, not fulfillment of
the target requirement. `None` means no applicable current capability was
verified. Each requirement has one primary row, gap class, and epic owner.
`Approved` in the PRD is target scope; `Ready`, `Blocked`, and `Deferred` here
describe delivery readiness. A blocked row cannot become an implementation
story until its dependency has an approved, versioned closure artifact.

Gap classes are exactly `None`, `Verification`, `Documentation`, `Behavior`,
`Data`, `Architecture`, `Compliance`, or `Deferred`. `None` would require
E3 proof of the complete target contract; no row currently qualifies.
`Verification` means current behavior needs a stronger test/contract proof;
`Documentation` means an implementation-facing policy/contract is missing;
the other classes name the primary missing capability. Rows may have secondary
risks, but only one primary class.

The epic owners below are planned identifiers. Their detailed artifacts are
created in Plans 5 and 6. `EPIC-000` owns baseline verification; `EPIC-001`
through `EPIC-010` follow the approved product capability sequence. Ownership
does not waive any OQ or release gate.

## Gap Map

Each primary row uses this schema: requirement, one target capability, current
evidence or `None`, one gap class, exact gap, one epic owner, dependency,
risk/conflict, acceptance evidence, and readiness.

### Trusted evidence — CAP-TGT-001

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-001` | CAP-TGT-001 | CAP-CUR-BE-004, CAP-CUR-XR-005 | Data | Current symbol ingestion does not prove NYSE/Nasdaq common-equity eligibility. | EPIC-001 | OQ-2 security master; `yfinance` source selected, point-in-time proof pending | DOC-CONFLICT-006 | Point-in-time eligible/ineligible security fixtures. | Blocked |
| `PRD-FR-002` | CAP-TGT-001 | CAP-CUR-BE-004, CAP-CUR-XR-005 | Data | Current asset type does not prove ETF transparency, leverage, inverse status, or daily NAV. | EPIC-001 | OQ-2 ETF data rights and classification proof pending | DOC-CONFLICT-006 | ETF eligibility and exclusion fixtures. | Blocked |
| `PRD-FR-003` | CAP-TGT-001 | CAP-CUR-BE-004 | Behavior | Unresolved symbols are `UNRESOLVED`, not `STOCK`, in new and migrated rows (OQ-5 closed for this contract on 2026-10-22, V7). Stock/ETF eligibility still lacks a point-in-time classification source. | EPIC-001 | OQ-2 point-in-time proof | DOC-CONFLICT-006 | No unresolved ticker defaults to STOCK; compatibility tests. | Blocked |
| `PRD-FR-004` | CAP-TGT-001 | None | Behavior | No verified three-horizon identity contract spans evaluation and decision. | EPIC-001 | OQ-3 evidence policy | None | Horizon contract fixtures reject blended or out-of-range values. | Blocked |
| `PRD-FR-005` | CAP-TGT-001 | CAP-CUR-BE-008, CAP-CUR-XR-008 | Architecture | Current persisted snapshots do not establish immutable research evidence versions. | EPIC-001 | OQ-3 schema; migration | DOC-CONFLICT-005 | Snapshot revision and persistence/replay fixtures. | Blocked |
| `PRD-FR-006` | CAP-TGT-001 | CAP-CUR-BE-002, CAP-CUR-XR-008 | Data | Timestamps exist, but decision-critical field provenance, normalization, conflict, and missingness are incomplete. | EPIC-001 | OQ-3 field schema | DOC-CONFLICT-008 | DTO/persistence fixtures require all field metadata. | Blocked |
| `PRD-FR-007` | CAP-TGT-001 | CAP-CUR-DS-003, CAP-CUR-FE-005 | Behavior | Empty/nullable failures are not uniformly distinguishable from valid current evidence. | EPIC-001 | OQ-3 status contract | DOC-CONFLICT-008 | Provider failure preserves real fields and explicit absence. | Blocked |
| `PRD-FR-008` | CAP-TGT-001 | None | Documentation | Versioned stock/ETF weighted coverage and critical-conflict policies are not approved or implemented. | EPIC-001 | OQ-3 approval | DOC-CONFLICT-008 | Weighted threshold and low-weight mutation fixtures. | Blocked |
| `PRD-FR-009` | CAP-TGT-001 | CAP-CUR-DS-003, CAP-CUR-XR-008 | Behavior | Current endpoint statuses do not provide the seven-state section contract throughout API/UI. | EPIC-001 | OQ-3 status policy | DOC-CONFLICT-008 | Seven-state API/UI contract fixtures. | Blocked |
| `PRD-FR-010` | CAP-TGT-001 | CAP-CUR-DS-002, CAP-CUR-XR-008 | Verification | Provider fallback exists but all target partial/failure/no-fabrication paths lack one cross-runtime proof. | EPIC-001 | Stubbed provider chain | DOC-CONFLICT-001 | Wire-level partial/failure fixtures across runtimes. | Ready |
| `PRD-FR-072` | CAP-TGT-001 | None | Compliance | No versioned use-specific data-rights approval is bound to rendered evidence. | EPIC-001 | OQ-2 legal/provider approval | DOC-CONFLICT-010 | Rights-scope, expiry, revocation, delay-label fixtures. | Blocked |
| `PRD-NFR-001` | CAP-TGT-001 | CAP-CUR-BE-002, CAP-CUR-FE-005 | Data | Displayed evidence lacks proven complete source/freshness coverage. | EPIC-001 | OQ-3 schema; OQ-7 measurement | DOC-CONFLICT-008 | 100% critical and at least 95% field coverage on approved sample. | Blocked |
| `PRD-NFR-002` | CAP-TGT-001 | CAP-CUR-BE-008 | Architecture | JPA persistence exists, but immutable revisioned research snapshots do not. | EPIC-001 | Snapshot schema; migration | None | Revision creates new ID and preserves earlier snapshot. | Blocked |
| `PRD-NFR-005` | CAP-TGT-001 | CAP-CUR-DS-003, CAP-CUR-FE-005 | Behavior | Current optional/empty paths do not prove deterministic-core independence for every provider/LLM/personal-model failure. | EPIC-001 | OQ-3 minimum evidence | DOC-CONFLICT-001, DOC-CONFLICT-008 | Failure matrix preserves deterministic result and no fabricated fields. | Blocked |
| `PRD-NFR-008` | CAP-TGT-001 | None | Compliance | No licensed-use entitlement matrix currently gates external use. | EPIC-001 | OQ-2 approval | DOC-CONFLICT-010 | Display/cache/derived/backtest/model/redistribution rights tests. | Blocked |
| `PRD-NFR-016` | CAP-TGT-001 | CAP-CUR-BE-009, CAP-CUR-DS-008 | Behavior | Health/metrics exist, but snapshot, replay, suppression, cost, alert, and policy telemetry is incomplete. | EPIC-001 | OQ-3 telemetry schema | None | Stubbed telemetry fixtures with privacy/secret assertions. | Blocked |
| `PRD-NFR-019` | CAP-TGT-001 | CAP-CUR-BE-006, CAP-CUR-XR-008 | Compliance | Default-user local-demo routes lack accountable isolated external access control. | EPIC-001 | OQ-1 classification; OQ-8 cohort gate | DOC-CONFLICT-004 | Authn/authz and unauthenticated-denial tests before invites. | Blocked |
| `PRD-NFR-020` | CAP-TGT-001 | CAP-CUR-BE-009 | Compliance | Configured secret handling does not prove encryption, managed secrets, or audited admin access. | EPIC-001 | OQ-8 isolated-deployment gate | DOC-CONFLICT-004 | TLS/storage/secret/admin-audit evidence. | Blocked |
| `PRD-NFR-022` | CAP-TGT-001 | CAP-CUR-BE-009 | Compliance | Observability does not establish incident owner, escalation, and history-safe rollback. | EPIC-001 | OQ-8 incident plan | None | Rehearsed incident and rollback record. | Blocked |
| `PRD-NFR-023` | CAP-TGT-001 | CAP-CUR-BE-010, CAP-CUR-FE-007 | Verification | Unit/build checks do not cover external access, secrets, vulnerability, and restore exercises. | EPIC-001 | OQ-8 security gate | DOC-CONFLICT-004 | Security and restore checks pass before invitations. | Blocked |

### Ledger portfolio — CAP-TGT-002

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-011` | CAP-TGT-002 | CAP-CUR-BE-006, CAP-CUR-XR-004 | Verification | Manual transactions exist, but target source lineage and restart contract need complete proof. | EPIC-002 | Portfolio contract fixtures | None | Persist/restart fixtures trace each manual event. | Ready |
| `PRD-FR-012` | CAP-TGT-002 | CAP-CUR-BE-006 | Behavior | No verified staged CSV validation, deduplication, and reconciliation workflow. | EPIC-002 | CSV schema; OQ-5 migration | None | Invalid/conflicting rows remain staged; accepted lineage persists. | Blocked |
| `PRD-FR-013` | CAP-TGT-002 | CAP-CUR-BE-006 | Behavior | Current ledger evidence does not prove idempotent CSV re-import. | EPIC-002 | PRD-FR-012 staging | None | Repeat import leaves ledger/holdings unchanged. | Blocked |
| `PRD-FR-014` | CAP-TGT-002 | CAP-CUR-BE-006, CAP-CUR-BE-008 | Verification | Ledger-derived holdings exist, but immutable full-state replay/exposure proof is incomplete. | EPIC-002 | Ledger fixture policy | None | Restart/replay reproduces holdings, basis, realized activity, exposures. | Ready |
| `PRD-FR-015` | CAP-TGT-002 | CAP-CUR-XR-004 | Architecture | Current portfolio responses do not bind a stable version to every Fit/Decision Result. | EPIC-002 | Snapshot and state IDs | None | Decision replay resolves the exact Portfolio State version. | Blocked |
| `PRD-NFR-021` | CAP-TGT-002 | CAP-CUR-BE-008 | Compliance | Persistence exists without verified encrypted backup, four-hour RPO, or 24-hour RTO. | EPIC-002 | OQ-8 recovery approval | DOC-CONFLICT-005 | Timed encrypted backup/restore exercise meets approved bounds. | Blocked |

### Asset research — CAP-TGT-003

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-016` | CAP-TGT-003 | CAP-CUR-BE-005, CAP-CUR-FE-005, CAP-CUR-XR-007 | Behavior | Research sections exist but do not share one immutable, status-aware stock/ETF workflow. | EPIC-003 | OQ-3 snapshot policy | DOC-CONFLICT-008 | Section-by-section provenance/empty-state UI fixtures. | Blocked |
| `PRD-FR-017` | CAP-TGT-003 | CAP-CUR-DS-005, CAP-CUR-XR-007 | Data | Current stock analytics do not prove the full independent formula/period model. | EPIC-003 | OQ-4 metric policy | DOC-CONFLICT-001 | Independent stock metric fixtures with missingness. | Blocked |
| `PRD-FR-018` | CAP-TGT-003 | CAP-CUR-BE-004, CAP-CUR-DS-005 | Data | Current research does not establish ETF-specific NAV/holdings/tracking evaluation. | EPIC-003 | OQ-2 ETF rights; OQ-4 model | DOC-CONFLICT-006 | ETF metrics pass independent fixtures with stock ratios absent. | Blocked |
| `PRD-FR-019` | CAP-TGT-003 | CAP-CUR-XR-007 | Data | No verified S&P 500 total-return primary benchmark selection contract. | EPIC-003 | OQ-2 benchmark rights | None | Total-return index fixtures reject price-only benchmark. | Blocked |
| `PRD-FR-020` | CAP-TGT-003 | CAP-CUR-XR-007 | Behavior | Current nullable provider PEG is not the target-date, exact-period calculation. | EPIC-003 | OQ-4 normalized EPS | DOC-CONFLICT-003 | Hand-calculated target-date PEG and provenance fixtures. | Blocked |
| `PRD-FR-021` | CAP-TGT-003 | CAP-CUR-XR-007 | Behavior | Provider PEG has no target `Not Meaningful` gates. | EPIC-003 | OQ-4 PEG policy | DOC-CONFLICT-003 | EPS/growth/count/missing boundary fixtures. | Blocked |
| `PRD-FR-022` | CAP-TGT-003 | CAP-CUR-XR-007 | Behavior | Current score lacks growth/dispersion high-uncertainty exclusion. | EPIC-003 | OQ-4 PEG policy | DOC-CONFLICT-003 | Growth/dispersion boundary fixtures suppress scoring. | Blocked |
| `PRD-FR-023` | CAP-TGT-003 | CAP-CUR-XR-007 | Behavior | Current simple PEG grade does not prove no universal cutoff or PEG-only Add. | EPIC-003 | OQ-4 decision policy | DOC-CONFLICT-003 | Attractive PEG alone never yields Add. | Blocked |
| `PRD-FR-056` | CAP-TGT-003 | None | Data | No verified GICS sector total-return secondary benchmark and mapping gate. | EPIC-003 | OQ-2 sector rights; OQ-4 mapping | None | Sector mapping and absent/conflict fixtures. | Blocked |
| `PRD-FR-057` | CAP-TGT-003 | None | Data | No declared-index ETF benchmark with governed rights substitute. | EPIC-003 | OQ-2 index rights; OQ-4 mapping | None | Declared/substitute/missing-category fixtures. | Blocked |
| `PRD-FR-058` | CAP-TGT-003 | None | Architecture | Benchmark choice is not frozen in snapshot and outcome replay records. | EPIC-003 | OQ-2 rights; OQ-4 benchmark policy | DOC-CONFLICT-003 | Attempted post-outcome remap fails in point-in-time fixtures. | Blocked |
| `PRD-FR-059` | CAP-TGT-003 | None | Data | No approved comparable-peer set or ten-peer scoring minimum. | EPIC-003 | OQ-4 peer policy | DOC-CONFLICT-003 | Nine peers suppress percentile; ten permit it. | Blocked |
| `PRD-FR-060` | CAP-TGT-003 | CAP-CUR-DS-005 | Behavior | Current valuation model does not prove ETF PEG exclusion. | EPIC-003 | OQ-4 stock/ETF separation | DOC-CONFLICT-003 | ETF API/UI never shows stock PEG. | Blocked |
| `PRD-FR-061` | CAP-TGT-003 | CAP-CUR-XR-007 | Behavior | Nullable provider PEG is not separated from authoritative Target-Horizon PEG. | EPIC-003 | OQ-4 display policy; OQ-5 DTO migration | DOC-CONFLICT-003 | Dual-value/stale/conflict API/UI fixtures. | Blocked |
| `PRD-FR-062` | CAP-TGT-003 | None | Data | Peer/lifecycle interpretation and revision/dispersion context are absent. | EPIC-003 | OQ-4 peer policy | DOC-CONFLICT-003 | Peer-context display or explicit unavailable reason. | Blocked |
| `PRD-FR-063` | CAP-TGT-003 | CAP-CUR-XR-007 | Behavior | Current weighted PEG grade lacks subordinate quality gates. | EPIC-003 | OQ-4 quality policy | DOC-CONFLICT-003 | Failed quality gate cannot be overturned by PEG. | Blocked |
| `PRD-FR-064` | CAP-TGT-003 | CAP-CUR-XR-007 | Compliance | Current PEG scoring is not conditioned on approved normalized-EPS/peer policy versions. | EPIC-003 | OQ-4 approval | DOC-CONFLICT-003 | No PEG scoring with missing/mismatched policy. | Blocked |
| `PRD-NFR-011` | CAP-TGT-003 | CAP-CUR-FE-007, CAP-CUR-XR-009 | Verification | No passing end-to-end first-result timing evidence; browser smoke currently fails. | EPIC-003 | OQ-7 measurement; E2E repair | DOC-CONFLICT-008 | Approved sample records first meaningful result under gate. | Blocked |

### Decision and Portfolio Fit — CAP-TGT-004

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-024` | CAP-TGT-004 | CAP-CUR-DS-005 | Behavior | Research scores exist but standalone Investment Quality independence is unverified. | EPIC-004 | OQ-4 quality policy | DOC-CONFLICT-003 | Same snapshot/horizon gives identical quality across portfolios. | Blocked |
| `PRD-FR-025` | CAP-TGT-004 | CAP-CUR-XR-004 | Behavior | Current portfolio analytics lack approved marginal concentration/correlation/drawdown/hard-cap Fit policy. | EPIC-004 | OQ-4 Fit policy | DOC-CONFLICT-009 | Boundary fixtures expose each effect and block unsafe Add. | Blocked |
| `PRD-FR-026` | CAP-TGT-004 | CAP-CUR-BE-006 | Behavior | Default-user portfolio routes do not establish versioned explicit User Policy. | EPIC-004 | OQ-1 profile schema; OQ-4 risk rules | DOC-CONFLICT-004 | Missing/inconsistent inputs suppress affected output. | Blocked |
| `PRD-FR-027` | CAP-TGT-004 | CAP-CUR-XR-003 | Architecture | Current agent decision/confidence DTO lacks complete deterministic replay identifiers. | EPIC-004 | OQ-3/4 policy; OQ-5 migration | DOC-CONFLICT-009 | Complete key reconstructs identical structured result. | Blocked |
| `PRD-FR-028` | CAP-TGT-004 | CAP-CUR-XR-003 | Behavior | Current agent vocabulary does not enforce ownership-specific Add/Hold/Reduce/Avoid/Watch semantics. | EPIC-004 | OQ-3/4 policy; OQ-5 migration | DOC-CONFLICT-009 | Owned/unowned decision table rejects invalid labels. | Blocked |
| `PRD-FR-029` | CAP-TGT-004 | CAP-CUR-XR-003 | Behavior | Current output lacks complete Watch suppression of outlook, action Fit, and weight. | EPIC-004 | OQ-3 minimum evidence; OQ-4 policy | DOC-CONFLICT-008, DOC-CONFLICT-009 | Mandatory failure yields non-directional Watch with gaps. | Blocked |
| `PRD-FR-030` | CAP-TGT-004 | CAP-CUR-DS-006, CAP-CUR-XR-003 | Architecture | Current agent analysis does not prove an independent immutable deterministic result with optional narrative. | EPIC-004 | Decision Result contract | DOC-CONFLICT-009 | Result hash unchanged by AI failure/regeneration. | Blocked |
| `PRD-FR-031` | CAP-TGT-004 | CAP-CUR-BE-007, CAP-CUR-XR-003 | Behavior | Agent history exists but does not retain full thesis/counter-thesis/invalidation/replay Decision Card. | EPIC-004 | Snapshot/state/policy versions | DOC-CONFLICT-009 | Card reconstructs after provider and policy changes. | Blocked |
| `PRD-FR-055` | CAP-TGT-004 | None | Compliance | No counsel-approved jurisdiction/output gate controls external policy-conditioned labels/weights. | EPIC-004 | OQ-1 approval | DOC-CONFLICT-004, DOC-CONFLICT-009 | Wrong/expired approval suppresses labels and weights. | Blocked |
| `PRD-FR-065` | CAP-TGT-004 | CAP-CUR-XR-003 | Behavior | Current agent response lacks structured horizon outlooks, valuation zone, risk flags, and supported weight. | EPIC-004 | OQ-3/4 policies; OQ-5 migration | DOC-CONFLICT-009 | Contract fixtures require every deterministic field. | Blocked |
| `PRD-FR-066` | CAP-TGT-004 | None | Data | No versioned quantitative invalidation threshold is bound to a retained result. | EPIC-004 | OQ-4 threshold policy | None | Replay reconstructs threshold and reevaluation trigger. | Blocked |
| `PRD-FR-071` | CAP-TGT-004 | None | Compliance | Legal/disclosure approval versions are not bound to gated output and replay. | EPIC-004 | OQ-1 approval | DOC-CONFLICT-004 | Jurisdiction/version/expiry/revocation fixtures. | Blocked |
| `PRD-NFR-003` | CAP-TGT-004 | CAP-CUR-XR-003 | Architecture | Current agent history/cache cannot replay an authoritative structured Decision Result. | EPIC-004 | OQ-3/4 policy; snapshot/state IDs | DOC-CONFLICT-009 | Full key yields byte-equivalent structured result. | Blocked |
| `PRD-NFR-004` | CAP-TGT-004 | CAP-CUR-DS-005, CAP-CUR-XR-004 | Behavior | Analytics exist but authoritative quality/Fit/decision versioning is absent. | EPIC-004 | OQ-4 financial policy | DOC-CONFLICT-003 | Independent versioned formula fixtures pass. | Blocked |
| `PRD-NFR-009` | CAP-TGT-004 | None | Compliance | External labels/weights are not conditioned on current legal approval state. | EPIC-004 | OQ-1 approval | DOC-CONFLICT-004 | Deterministic and learned outputs both fail closed. | Blocked |
| `PRD-NFR-014` | CAP-TGT-004 | CAP-CUR-BE-010, CAP-CUR-DS-009 | Verification | Passing suites do not prove all authoritative financial formulas/units/periods independently. | EPIC-004 | OQ-4 formula policies | DOC-CONFLICT-003 | Independent expected-value fixtures cover boundaries. | Blocked |
| `PRD-NFR-015` | CAP-TGT-004 | CAP-CUR-FE-002, CAP-CUR-XR-009 | Documentation | Current direct Gemini and legacy agent contracts lack a per-consumer migration decision. | EPIC-000 | OQ-5 compatibility matrix | DOC-CONFLICT-002, DOC-CONFLICT-009 | Preserve/version/migrate/retire choice and contract fixtures. | Blocked |
| `PRD-NFR-017` | CAP-TGT-004 | CAP-CUR-BE-010, CAP-CUR-FE-007 | Verification | Existing suites include skipped backend persistence and failing browser smoke; no complete target release gate. | EPIC-000 | OQ-8 release gate; E2E repair | DOC-CONFLICT-008 | All applicable suites pass without fabricated/replay/privacy failures. | Blocked |
| `PRD-NFR-018` | CAP-TGT-004 | None | Verification | No frozen benchmark point-in-time outcome validation across bias/cost/regime cases. | EPIC-004 | OQ-4 benchmark policy | DOC-CONFLICT-003 | Walk-forward/out-of-sample outcome fixtures by asset/horizon. | Blocked |

### Explainable discovery — CAP-TGT-005

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-032` | CAP-TGT-005 | CAP-CUR-BE-004, CAP-CUR-XR-005 | Behavior | Watchlist/asset flows are not a versioned deterministic universe screen. | EPIC-005 | OQ-2 security master; OQ-3 evidence | DOC-CONFLICT-006 | Screen replays without LLM. | Blocked |
| `PRD-FR-033` | CAP-TGT-005 | CAP-CUR-XR-005 | Behavior | Current watchlist research does not explain each returned screen match with status. | EPIC-005 | Screen rule version | None | Every returned candidate has rule/evidence reason. | Blocked |
| `PRD-FR-034` | CAP-TGT-005 | CAP-CUR-BE-006, CAP-CUR-XR-005 | Behavior | Watchlists exist but shortlist origin, screen version, and deeper research link are unverified. | EPIC-005 | Screen contract; persistence | None | Restart preserves annotated shortlist and origin version. | Blocked |
| `PRD-FR-035` | CAP-TGT-005 | CAP-CUR-XR-003, CAP-CUR-XR-005 | Behavior | Agent analysis is callable per ticker but explicit shortlist-triggered cost gate is absent. | EPIC-005 | Screen/shortlist workflow | None | Every expensive AI run traces to user selection. | Blocked |

### AI explanation — CAP-TGT-006

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-036` | CAP-TGT-006 | CAP-CUR-DS-006, CAP-CUR-XR-003 | Verification | Prepared metrics cross the agent boundary, but target snapshot-reference contract needs proof. | EPIC-006 | Evidence snapshot schema | DOC-CONFLICT-001 | Agent input contract rejects raw provider fetches. | Blocked |
| `PRD-FR-037` | CAP-TGT-006 | CAP-CUR-XR-003, CAP-CUR-XR-007 | Behavior | Current report/agent narratives lack fully sourced optional attachment with counter-thesis context. | EPIC-006 | Decision Result; OQ-5 route ownership | DOC-CONFLICT-002 | Every factual claim resolves to snapshot evidence. | Blocked |
| `PRD-FR-038` | CAP-TGT-006 | CAP-CUR-DS-006, CAP-CUR-XR-003 | Verification | Current sequential agent path does not prove all target no-authority boundaries. | EPIC-006 | Deterministic result contract | DOC-CONFLICT-009 | Adversarial agent output cannot alter facts, labels, or limits. | Blocked |
| `PRD-FR-039` | CAP-TGT-006 | CAP-CUR-DS-006, CAP-CUR-XR-003 | Verification | Current optional failure behavior lacks target Decision Result independence proof. | EPIC-006 | Deterministic result; stubbed LLM | DOC-CONFLICT-009 | Timeout/refusal/outage leave structured result unchanged. | Blocked |
| `PRD-NFR-013` | CAP-TGT-006 | CAP-CUR-BE-009, CAP-CUR-DS-008 | Data | Existing metrics do not prove per-activated/retained-user AI and licensed-data costs. | EPIC-006 | OQ-6 budget; OQ-7 cohort denominator | None | Cost ledger and approved monthly budget gate. | Blocked |

### Monitoring — CAP-TGT-007

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-040` | CAP-TGT-007 | CAP-CUR-BE-009, CAP-CUR-XR-008 | Behavior | Scheduled jobs exist, but evidence-diff daily summaries for decisions/holdings/shortlists do not. | EPIC-007 | Snapshot/event versions | None | Prior/new evidence appears within approved 24-hour window. | Blocked |
| `PRD-FR-041` | CAP-TGT-007 | CAP-CUR-BE-009, CAP-CUR-XR-008 | Behavior | Current notification/radar paths do not enforce the bounded high-priority event classes. | EPIC-007 | Provider confirmation; event policy | DOC-CONFLICT-008 | Ordinary/unverified/stale events cannot be high severity. | Blocked |
| `PRD-FR-042` | CAP-TGT-007 | CAP-CUR-BE-006 | Behavior | Notification persistence lacks proved asset/event/evidence-version deduplication. | EPIC-007 | Event identity | None | Duplicate rate below 2%; event history retained. | Blocked |
| `PRD-FR-043` | CAP-TGT-007 | CAP-CUR-BE-009 | Behavior | Current alerting does not prove independent generation/delivery kill switches with history preservation. | EPIC-007 | Alert feature flags | None | Disable each stage without research or history loss. | Blocked |
| `PRD-NFR-010` | CAP-TGT-007 | CAP-CUR-BE-009, CAP-CUR-DS-008 | Behavior | Existing configuration does not prove independent flags for AI, learning, alerts, and each provider. | EPIC-007 | Flag ownership policy | None | Toggle matrix preserves deterministic core/history. | Blocked |
| `PRD-NFR-012` | CAP-TGT-007 | CAP-CUR-BE-009 | Verification | No executed 24-hour evidence-change delivery scenario. | EPIC-007 | OQ-7 event start; OQ-8 window | None | Timed ingestion-to-summary/alert test. | Blocked |

### Personal investment policy — CAP-TGT-008

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-044` | CAP-TGT-008 | None | Deferred | No consented point-in-time Decision Event set exists. | EPIC-008 | Post-V1 stage; consent schema | None | Training event includes all shown/rejected alternatives. | Deferred |
| `PRD-FR-045` | CAP-TGT-008 | None | Deferred | No bounded pairwise/policy learning with passive/self-label exclusion exists. | EPIC-008 | Post-V1 stage; PRD-FR-044 | None | Training fixtures reject passive, synthetic, and cross-user labels. | Deferred |
| `PRD-FR-046` | CAP-TGT-008 | None | Deferred | No history, maturity, shadow-mode, or approval eligibility gate exists. | EPIC-008 | Post-V1 stage; OQ-7 measurement | None | Threshold and shadow-mode fixtures fail closed. | Deferred |
| `PRD-FR-047` | CAP-TGT-008 | None | Deferred | No versioned adjustment proposal or bounded transition policy exists. | EPIC-008 | Post-V1 stage; OQ-3/4 policies | DOC-CONFLICT-009 | Property tests reject unlisted transitions/cap increases. | Deferred |
| `PRD-FR-048` | CAP-TGT-008 | None | Deferred | No user access/export contract for learning state exists. | EPIC-008 | Post-V1 stage; personal data schema | None | Export reconciles active records without cross-user data. | Deferred |
| `PRD-FR-049` | CAP-TGT-008 | None | Deferred | No learned-influence rollback to explicit policy exists. | EPIC-008 | Post-V1 stage; deterministic policy | None | Timeout/drift/withdrawal/deletion return explicit-policy result. | Deferred |
| `PRD-FR-067` | CAP-TGT-008 | None | Deferred | No correction/reset versioning for policy/model state exists. | EPIC-008 | Post-V1 stage; immutable history | None | Corrected version preserves retained prior replay. | Deferred |
| `PRD-FR-068` | CAP-TGT-008 | None | Deferred | No revocable learning-consent boundary exists. | EPIC-008 | Post-V1 stage; consent register | None | Withdrawal stops learning and retains core research. | Deferred |
| `PRD-FR-069` | CAP-TGT-008 | None | Deferred | No cross-store deletion of personal model/decision artifacts exists. | EPIC-008 | Post-V1 stage; storage inventory | None | Store-by-store deletion and non-identifying receipt tests. | Deferred |
| `PRD-FR-070` | CAP-TGT-008 | None | Deferred | No backup expiry/approved legal-hold deletion lifecycle exists. | EPIC-008 | Post-V1 stage; legal retention approval | None | 30-day expiry or approved hold/duty-end fixtures. | Deferred |
| `PRD-NFR-006` | CAP-TGT-008 | None | Deferred | No verified active/derived personal-data rights service exists. | EPIC-008 | Post-V1 stage; PRD-FR-048/067-070 | None | Privacy suite covers access, correction, export, withdrawal, deletion. | Deferred |

### Read-only broker reconciliation — CAP-TGT-009

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-050` | CAP-TGT-009 | CAP-CUR-XR-004 | Deferred | No broker import/reconciliation connector is evidenced. | EPIC-009 | Post-V1 broker rights and ledger policy | None | External rows stage and conflicts require explicit resolution. | Deferred |
| `PRD-FR-051` | CAP-TGT-009 | None | Deferred | No broker permission boundary is verified for read-only integration. | EPIC-009 | Post-V1 broker design | None | No order-write scope, endpoint, or credential permission. | Deferred |

### SaaS identity and operations — CAP-TGT-010

| Requirement | Target | Current | Gap class | Gap | Epic | Dependency | Risk/conflict | Acceptance | Readiness |
|---|---|---|---|---|---|---|---|---|---|---|
| `PRD-FR-052` | CAP-TGT-010 | CAP-CUR-BE-006, CAP-CUR-XR-008 | Deferred | Default-user scope does not establish production tenant ownership/isolation. | EPIC-010 | Post-V1 identity design | DOC-CONFLICT-004 | Cross-tenant storage/cache/job/export isolation fixtures. | Deferred |
| `PRD-FR-053` | CAP-TGT-010 | None | Deferred | No shared subscription, entitlement, support, or paid-cost operation exists. | EPIC-010 | Post-V1 commercial approval; OQ-6 | None | Paid activation blocked until commercial suite passes. | Deferred |
| `PRD-FR-054` | CAP-TGT-010 | CAP-CUR-BE-008 | Deferred | No migration from isolated ownership to tenant-scoped records is verified. | EPIC-010 | Post-V1 identity and consent mapping | DOC-CONFLICT-004 | Migration fixtures preserve provenance, consent, replay IDs. | Deferred |
| `PRD-NFR-007` | CAP-TGT-010 | CAP-CUR-BE-006 | Deferred | Current default-user routes lack cross-user isolation across stores and operations. | EPIC-010 | Post-V1 tenant model | DOC-CONFLICT-004 | Storage/cache/job/log/support/export isolation suite. | Deferred |

## Traceability

- Primary requirement rows are defined only in the `Gap Map` section above.
  The validator compares those first-column IDs with every `PRD-FR-*` and
  `PRD-NFR-*` declaration in `PRD.md`, rejecting omissions and duplicates.
- Each row's target and epic identify one product capability and one planned
  delivery owner. `EPIC-000` owns the current-contract and release-verification
  gates in `PRD-NFR-015` and `PRD-NFR-017`; its Plan 5 stories must preserve
  the row's requirement ID rather than create a competing current claim.
- A `Blocked` row requires the named OQ closure artifact or predecessor before
  story acceptance. A `Deferred` row remains outside the V1 story backlog.
- Current evidence levels and limitations remain in the baseline and
  `evidence/` records. The map does not promote E2 source inspection to E3 or
  treat the previous backend/frontend test runs as target-contract proof.
- `DOC-CONFLICT-001`/`008` protect provider and degradation semantics;
  `DOC-CONFLICT-002`/`009` protect browser/agent DTO compatibility;
  `DOC-CONFLICT-003` protects PEG semantics; `DOC-CONFLICT-004`/`005` protect
  identity/persistence interpretation; `DOC-CONFLICT-006` protects universe
  classification. Historical `DOC-CONFLICT-007`/`010` do not authorize
  implementation from archived prose.
- Disposition: Conflict statuses remain as declared in
  `evidence/legacy-document-conflicts.md`; any contract change requires an
  OQ-5 preserve, version, coordinated migration, or retire decision.

## Limitations

- The legal classification, licensed data entitlements, stock/ETF evidence
  weights, normalized-EPS and peer policies, Portfolio Fit/weight-cap rules,
  migration plan, metric dictionary, budgets, and external cohort gates are
  still pending their named approvals. Their rows remain blocked or deferred.
- The Plan 2 frontend E2E failures and backend Testcontainers skips are carried
  into verification/readiness rows. Passing unit tests do not close them.
- Proposed sample floors and recovery objectives in the PRD are planning
  defaults pending OQ-7/8 approval, not observed production performance.
