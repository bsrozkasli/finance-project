# Legacy Document Conflicts

## Conflict Records

These records separate historical or proposed documentation from the verified
brownfield implementation. A disposition is a documentation decision for the
current baseline; it is not an implementation change.

### DOC-CONFLICT-001 — Resolver boundary versus direct analytics providers

- Summary: The current data-service entry-point comment and provider interface imply a resolver-owned market-data boundary, while several analytics services and the technical router call yfinance directly.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; source inspection and stub-based tests; no provider calls.
- Claim A: `data-service/main.py` and `IMarketDataProvider` describe resolver-backed market data and provider-neutral access.
- Claim B: `analysis.py`, `fundamental_analysis_service.py`, `factor_analysis_service.py`, `risk_analytics_service.py`, `valuation_service.py`, `portfolio_service.py`, and `portfolio_analytics_service.py` import or call yfinance directly.
- Stronger Evidence: Current source call sites are stronger than the broad module comment because they identify the executed path. The discrepancy is independently recorded in `CAP-CUR-DS-004` and `CAP-CUR-XR-002`.
- Evidence Locator: `data-service/main.py:1-7`; `data-service/app/providers/base.py:1-14,118-130`; direct call sites under `data-service/app/` found with `rg -n -i "yfinance|Ticker\(|download\("`.
- Verification: `data-service/.venv/Scripts/python.exe -m pytest` passed 50 tests; direct call-site inventory was reproduced without live provider access.
- Limitations: The audit does not decide whether direct yfinance is an intentional exception or an incomplete migration.
- Affected Artifact: `docs/product/evidence/data-service.md`, `docs/product/evidence/cross-runtime.md`, future provider architecture decision.
- Disposition: Correct Later

### DOC-CONFLICT-002 — Direct Gemini browser route versus Spring API boundary

- Summary: The frontend contains a direct `/api/gemini/portfolio-report` request, while current architecture and the primary client contract place normal application flows behind Spring `/api/v1`.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; React and Spring source inspection; no browser service outside the repository was contacted.
- Claim A: `AiReportsView.tsx` sends a relative browser request to `/api/gemini/portfolio-report`.
- Claim B: The shared Axios client uses `http://localhost:8080/api/v1`, and the inspected Spring controllers expose `/api/v1/reports/smart/{symbol}` and `/api/v1/chat/ask`, not `/api/gemini/portfolio-report`.
- Stronger Evidence: The current source inventory proves Claim A and the absence of a matching Spring mapping; the existence of an untracked development proxy or external route is unproven.
- Evidence Locator: `frontend/src/components/AiReportsView.tsx:142-160`; `frontend/src/api/client.ts:1-5`; Spring mappings under `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/`; `docs/spec/current-system/architecture.md` and `contracts.md`.
- Verification: Repository-wide searches for `gemini|portfolio-report` and Spring mapping annotations; the frontend evidence record is `CAP-CUR-FE-004`.
- Limitations: No owner or response DTO for the direct route was found, so compatibility cannot be inferred from the source repository.
- Affected Artifact: `docs/product/evidence/frontend.md`, `docs/product/evidence/cross-runtime.md`, future report API contract.
- Disposition: Unresolved

### DOC-CONFLICT-003 — Target-gated PEG policy versus current nullable provider PEG

- Summary: The product target requires eligibility, normalized-EPS, peer, freshness, and quality gates for subordinate PEG interpretation, while the current valuation implementation reads provider `pegRatio` directly and uses it as one weighted score input.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; FastAPI valuation source and product/current-system documents; no market data fetched.
- Claim A: `docs/product/PRD.md` `PRD-FR-023` blocks ETF PEG, universal `PEG < 1`, PEG-only `Add`, and ungated interpretation.
- Claim B: `data-service/app/services/valuation_service.py` reads `pegRatio`, applies the current benchmark tuple `(0.5, 1.0, 1.5, 2.5)`, includes PEG in the valuation grade when present, and leaves it null when absent; no peer comparison is populated by the observed service.
- Stronger Evidence: Current implementation is the stronger evidence for present behavior; the PRD is the target contract and must not be reported as implemented.
- Evidence Locator: `docs/product/PRD.md:520-560`; `data-service/app/services/valuation_service.py`; `data-service/app/models/valuation.py`; `docs/spec/current-system/domain-and-data.md` PEG section; `CAP-CUR-XR-007`.
- Verification: Source inspection and valuation/research tests; no live provider or decision result was generated.
- Limitations: The audit does not approve a normalized-EPS formula, peer universe, or migration design.
- Affected Artifact: `docs/product/PRD.md`, `docs/product/evidence/cross-runtime.md`, future valuation and decision-policy stories.
- Disposition: Correct Later

### DOC-CONFLICT-004 — Proposed JWT authentication versus local-demo current scope

- Summary: The archived authentication specification proposes JWT and per-user isolation, but it explicitly labels the current system local-demo with no authentication and the verified operations contract says production authentication is not implemented.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; archived and current operations documents; no auth-enabled runtime was started.
- Claim A: `archive/legacy-docs-2026-09-29/docs/AUTH_SPEC.md` defines a future JWT/Spring Security design and related endpoints.
- Claim B: The same document marks itself `Proposed` and says the current system is local-demo with no auth; `docs/spec/current-system/operations.md` says production authentication is not implemented.
- Stronger Evidence: The status and current operations contract are stronger than the proposed endpoint table. No current controller/security implementation was found.
- Evidence Locator: `archive/legacy-docs-2026-09-29/docs/AUTH_SPEC.md:1-16`; `docs/spec/current-system/operations.md` security/configuration sections; backend controller and security-source inventory.
- Verification: Read-only document and source inspection; no credentials, tokens, or live auth calls used.
- Limitations: This disposition does not reject the future auth design; it only prevents it from being described as current behavior.
- Affected Artifact: `docs/product/evidence/cross-runtime.md`, `docs/spec/current-system/operations.md`, future auth epic.
- Disposition: Historical

### DOC-CONFLICT-005 — MongoDB inventory versus verified persistence ownership

- Summary: Archived inventory/configuration material mentions MongoDB and a data-service base URL, while the current system has PostgreSQL/JPA/Flyway as the observed product persistence path and only reserves MongoDB without a verified durable repository.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; repository configuration, migrations, adapters, and archived inventory inspected; no database was connected.
- Claim A: Archived `test-results/inventory.md` and historical configuration list MongoDB-related settings/container references.
- Claim B: `docs/spec/current-system/operations.md` marks MongoDB `27017` as configured/reserved with no durable product repository verified; Spring JPA repositories and Flyway migrations are the observed persistence implementation.
- Stronger Evidence: Current repository adapters, migrations, and the verified operations contract outweigh an archived inventory of intended or available infrastructure.
- Evidence Locator: `archive/legacy-docs-2026-09-29/test-results/inventory.md:150-170,280-300`; `docs/spec/current-system/operations.md:10-21,45-60`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/persistence/`; `backend/src/main/resources/db/migration/`.
- Verification: Source/config inventory and backend test suite; no Mongo or PostgreSQL production state inferred.
- Limitations: A running but unused Mongo container could exist outside the repository; this audit found no product repository path for it.
- Affected Artifact: `docs/product/evidence/cross-runtime.md`, `docs/spec/current-system/operations.md`, deployment documentation.
- Disposition: Historical

### DOC-CONFLICT-006 — Target eligible universe versus permissive current asset resolution

- Summary: The product target restricts V1 ETF research to transparent, non-leveraged, non-inverse U.S. equity ETFs, while current asset batch ingestion accepts normalized symbols and can persist an explicit `UNAVAILABLE` asset with a default `STOCK` type when metadata cannot be resolved.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Spring asset/domain source and PRD; no external symbol lookup.
- Claim A: `PRD-FR-002` and related PRD scope require a restricted U.S. stock/eligible-ETF universe with fail-closed ETF eligibility.
- Claim B: `AssetController.addAssetBatch` persists per-symbol results, including explicit unavailable status; `AssetResolutionService` falls back to `AssetType.STOCK` with symbol-as-name and `UNAVAILABLE` when provider/mapping data is absent. `AssetType` also includes ETF, CRYPTO, FOREX, and INDEX.
- Stronger Evidence: Current Java behavior establishes the brownfield capability; PRD requirements remain target intent and are not current enforcement.
- Evidence Locator: `docs/product/PRD.md:151-171,520-523`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AssetController.java:104-127`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AssetResolutionService.java:13-65`; `backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/AssetType.java`.
- Verification: `AssetResolutionServiceTest` and `AssetControllerTest` cover current fallback/persistence behavior; no live symbol provider was used.
- Limitations: The audit does not define the future eligibility source, exchange universe, or ETF classification policy.
- Affected Artifact: `docs/product/PRD.md`, `docs/product/evidence/backend.md`, future asset-universe stories.
- Disposition: Correct Later

### DOC-CONFLICT-007 — Roadmap/proposal claims versus implemented behavior

- Summary: Archived frontend and system-refactor roadmaps describe planned UI, auth, provider, and architecture work as a sequence of future phases. The current source and verified current-system documents contain only a subset of those plans, with explicit unresolved limitations and different route/ownership details.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; archived roadmap documents and current source/spec inspected.
- Claim A: `FRONTEND_ROADMAP.md` and `docs/SYSTEM_REFACTOR_ROADMAP.md` describe roadmap phases, UI decisions, and refactors that were proposed at the archived source commit.
- Claim B: `docs/LEGACY_ARCHIVE_MANIFEST.md` identifies those files as physically archived/retired, while current route, API, provider, and persistence evidence is defined by source and `docs/spec/current-system/*`.
- Stronger Evidence: The archive manifest and current source are stronger for current capability; roadmap prose is historical planning evidence only.
- Evidence Locator: `archive/legacy-docs-2026-09-29/FRONTEND_ROADMAP.md`; `archive/legacy-docs-2026-09-29/docs/SYSTEM_REFACTOR_ROADMAP.md`; `docs/LEGACY_ARCHIVE_MANIFEST.md`; `docs/product/evidence/backend.md`, `data-service.md`, and `frontend.md`.
- Verification: Read-only archive inventory and cross-runtime source audit; no roadmap item was marked implemented by inference.
- Limitations: A roadmap may contain useful rationale that is not restated in the current docs; this record does not delete or rewrite archived history.
- Affected Artifact: `docs/LEGACY_ARCHIVE_MANIFEST.md`, `docs/product/evidence/cross-runtime.md`, future planning artifacts.
- Disposition: Historical

### DOC-CONFLICT-008 — Explicit degradation contract versus successful empty responses

- Summary: Current contracts require provider failure and missing evidence to remain explicit, but some backend research/news/asset paths return HTTP 200 with empty/nullable collections or persist `UNAVAILABLE` records rather than a uniform structured status.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; Spring controllers/adapters, FastAPI routes, and current contracts inspected; no provider call.
- Claim A: `docs/spec/current-system/operations.md` and `contracts.md` require unavailable, insufficient, empty, partial, stale, or failed evidence to remain distinguishable according to the endpoint contract.
- Claim B: Current controllers and adapters sometimes map downstream failure to empty/nullable response fields or HTTP-success collections; `AssetController` explicitly persists `UNAVAILABLE`, while data-service resolver exhaustion returns an empty list.
- Stronger Evidence: Both claims are current: the documents define the intended contract and source inspection proves endpoint-specific variation. Neither supports silently treating every empty 200 as fresh success.
- Evidence Locator: `docs/spec/current-system/operations.md` degradation section; `docs/spec/current-system/contracts.md` error/status sections; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/AssetController.java`; `FundamentalsController.java`; `NewsController.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceResearchAdapter.java`; `data-service/main.py:131-166`.
- Verification: Backend and data-service source inspection plus controller/adapter tests; no fabricated response was introduced.
- Limitations: The appropriate status shape is endpoint-specific and requires a contract decision before harmonization.
- Affected Artifact: `docs/spec/current-system/contracts.md`, `docs/product/evidence/cross-runtime.md`, future API compatibility work.
- Disposition: Correct Later

### DOC-CONFLICT-009 — Current agent labels versus target Decision Result semantics

- Summary: Current Spring/data-service agent responses expose `decision` and `confidence` fields, while the target PRD defines a versioned Decision Result with `Add`, `Hold`, `Reduce`, `Avoid`, and `Watch` semantics and explicitly excludes predictive confidence percentages or legacy Buy/Hold/Sell as the new contract.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; current DTO/source and PRD inspected; no LLM call.
- Claim A: Current agent DTOs and frontend types carry `decision`, `confidence`, `from_cache`, and narrative-style output.
- Claim B: `PRD-FR-027`, `PRD-FR-028`, and product scope define a structured, replayable Decision Result with target labels and no predictive confidence contract.
- Stronger Evidence: Current DTO/source establishes present behavior; PRD is target behavior and must remain marked as not implemented until a compatible contract is built.
- Evidence Locator: `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/dto/AgentAnalysisResponseDto.java`; `backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceAgentAnalysisAdapter.java`; `frontend/src/api/types.ts`; `docs/product/PRD.md:180-187,560-564`; `CAP-CUR-XR-003`.
- Verification: Source and type inventory plus agent/controller tests; no generated agent response was used as proof.
- Limitations: This conflict does not choose a migration mapping from legacy labels to target labels.
- Affected Artifact: `docs/product/PRD.md`, `docs/product/evidence/cross-runtime.md`, future decision-contract stories.
- Disposition: Correct Later

### DOC-CONFLICT-010 — Historical provider-only research claims versus current mixed paths

- Summary: Archived research/data-fetching tables describe route-level provider behavior and cache TTLs as if the paths were uniform, while current Spring reports combine persisted/backend/provider evidence and current data-service research mixes resolver-backed and direct-yfinance services.
- Evidence Level: E2
- Commit: `1a5e3b5`
- Reviewer: Codex
- Review Date: 2026-10-01
- Environment: Windows PowerShell; archived `DATA_FETCHING_REPORT.md`, current source, and evidence artifacts inspected.
- Claim A: The archived report assigns yfinance, FRED/FMP, Finnhub, caches, and route-level provider ownership for each endpoint.
- Claim B: Current evidence shows DB-first price refresh, Spring report composition, data-service resolver routes, direct-yfinance analytics, and endpoint-specific degradation instead of one uniform runtime path.
- Stronger Evidence: Current source and the three runtime evidence artifacts are stronger for present behavior; the archived table remains useful only as historical design/inventory context.
- Evidence Locator: `archive/legacy-docs-2026-09-29/docs/DATA_FETCHING_REPORT.md:33-77`; `docs/product/evidence/backend.md`; `docs/product/evidence/data-service.md`; `docs/product/evidence/frontend.md`; `CAP-CUR-XR-001` through `CAP-CUR-XR-007`.
- Verification: Read-only cross-runtime trace and runtime test results recorded in the three evidence artifacts.
- Limitations: Historical descriptions may still match some routes; each route must be rechecked before reusing a specific TTL or provider claim.
- Affected Artifact: `docs/product/evidence/cross-runtime.md`, future canonical API/provider documentation.
- Disposition: Historical

## Limitations

- Conflict dispositions identify how the baseline should be interpreted; they do not authorize runtime, schema, authentication, provider, or product-policy changes.
- `Unresolved` records remain explicit because the repository does not identify an owner or enough contract evidence to select a safe correction.
- Archived documents remain physically preserved under `archive/legacy-docs-2026-09-29` and are not rewritten by this audit.
