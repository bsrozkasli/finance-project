# EPIC-003 End-to-End Asset Research Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Serve coherent, snapshot-bound stock and ETF research with governed benchmarks and PEG interpretation.

**Architecture:** Spring joins immutable EPIC-001 evidence and versioned FastAPI analytic results; FastAPI owns pure stock/ETF formulas. Spring freezes benchmark selection and prevents unapproved metric influence in public results.

**Tech Stack:** Java 21, Spring Boot, FastAPI/Pydantic, PostgreSQL/Flyway, JUnit 5, pytest.
**Focused tests:** Task 1 AssetResearchServiceTest; Task 2 BenchmarkSelectionServiceTest; Task 3 PegResearchContractTest plus data-service PEG fixtures.

**Plan Set:** 3 of 10 in 2026-10-13-backend-epic-delivery-plan-set.md.
**Execution status (2026-10-15):** Blocked. EPIC-001 identity/snapshot plus the OQ-2/3/4/5/7 closure records, licensed-series proof, and referenced product contract are absent.
**Depends On:** EPIC-001 snapshot/identity; OQ-2/3/4/5 and OQ-7 measurement decisions.
**Produces:** Snapshot-linked research response, benchmark selection record, governed Target-Horizon PEG presentation.
**Spec:** docs/product/epics/EPIC-003-end-to-end-asset-research.md; docs/product/PRD.md §9.3.

## Locked Decisions

- ETF research excludes stock-only ratios; provider/trailing PEG never substitutes for Target-Horizon PEG.
- Stock primary benchmark is S&P 500 total return; sector secondary and ETF declared index follow approved rights/mapping.
- PEG scoring stays disabled until matching OQ-4 policy versions exist.

## Global Constraints

- Preserve existing Spring API consumers via OQ-5; use only frozen snapshot values.
- FastAPI analytic functions remain read-only; Spring owns result orchestration and retained mapping.
- Never infer missing estimates, peers, benchmark rights, or provider values.

## Review Focus

- Mixed live and frozen section values cannot enter one retained research result (Task 1).
- ETF API output cannot expose stock PEG (Task 1/3).
- Price-only or post-outcome-remapped benchmarks fail selection (Task 2).
- PEG 18/32-month, 2%/50%, three-estimate and ten-peer boundaries suppress inappropriate scoring (Task 3).
- Rights loss or stale mapping produces an explicit missing/substitute reason (Task 2).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/AssetResearchService.java | Create | Snapshot-bound assembly |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/service/BenchmarkSelectionService.java | Create | Approved frozen mapping |
| backend/src/main/java/com/ozkaslibasar/financeproject/domain/model/ | Create research/benchmark/PEG result records | Versioned contracts |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/outbound/client/dataservice/DataServiceResearchAdapter.java | Modify | Versioned analytic handoff |
| backend/src/main/java/com/ozkaslibasar/financeproject/adapter/inbound/rest/ | Modify only OQ-5-approved research routes/DTOs | Public response |
| backend/src/test/java/com/ozkaslibasar/financeproject/domain/service/ | Create focused tests | Formula-independent orchestration fixtures |

## Task 1: Assemble status-aware stock/ETF research

**Files:** Create AssetResearchService.java and AssetResearchServiceTest.java; modify DataServiceResearchAdapter.java and OQ-5-approved REST DTO/controller.

**Interfaces:** Consumes EPIC-001 snapshot ID, eligible instrument type, section statuses and versioned FastAPI metrics; produces one research result referencing the same snapshot in every section.

**Acceptance Evidence:** Stock/ETF sections expose source/freshness/missingness; partial failure keeps valid sections; ETF has no stock-only field.

- [ ] Write failing mixed-snapshot, partial-provider, and ETF omission tests.
- [ ] Run focused backend tests and verify the contract gap fails.
- [ ] Implement snapshot join and typed FastAPI response mapping; coordinate pure formula fixtures in data-service.
- [ ] Run backend Maven and data-service pytest suites plus affected API/UI contract checks.
- [ ] Commit scoped backend files; data-service changes receive their own atomic commit.

## Task 2: Freeze licensed benchmark selection

**Files:** Create BenchmarkSelectionService.java and test, benchmark domain/port records and backend persistence adapter; create next unused Flyway migration if selection is stored separately.

**Interfaces:** Consumes snapshot date, stock sector or ETF declared index, OQ-2 rights and OQ-4 mapping version; produces immutable benchmark IDs, timestamps, rights state and substitute reason for EPIC-004.

**Acceptance Evidence:** Stock total-return primary/sector secondary; ETF declared index unless rights forbid it, then only approved substitute with weaker Evidence Strength.

- [ ] Write failing price-only, missing mapping, rights-loss, and post-outcome remap tests.
- [ ] Run focused tests and confirm benchmark contract absence.
- [ ] Implement selection and persistence without editing prior snapshots.
- [ ] Run focused/full backend suite and cross-runtime benchmark contract fixtures.
- [ ] Commit scoped Task 2 files with feat(backend) scope.

## Task 3: Gate Target-Horizon PEG and research timing

**Files:** Create backend PEG interpretation DTO/mapping and contract tests; coordinate data-service/app/services/valuation_service.py and its pytest fixtures; update frontend contract only via OQ-5.

**Interfaces:** Consumes versioned FastAPI calculation record and OQ-4 policy; produces Not Meaningful, High Uncertainty, eligible informational/scored state, or explicit unavailable reason. No ETF PEG.

**Acceptance Evidence:** Hand-calculated exact-period and boundary fixtures pass; nine peers suppress percentile, ten permit it; attractive PEG alone never grants Add.

- [ ] Write failing cross-runtime PEG boundary and ETF-absence tests from independent expected values.
- [ ] Run focused backend/pytest checks and capture the gap.
- [ ] Implement mapping and policy gate; FastAPI implements approved calculation with full input provenance.
- [ ] Run backend, pytest, frontend contract/E2E and OQ-7 first-result measurement checks.
- [ ] Commit each runtime's scoped code/tests atomically.

## Plan Exit Criteria

- [ ] PRD-FR-016–023/056–064 and NFR-011 have owned passing fixtures.
- [ ] OQ-2/3/4/5/7 records and licensed series are linked; absent gates retain Blocked status.
- [ ] EPIC-004 receives frozen research/benchmark/PEG versions.

## Handoff to EPIC-004

Provide snapshot ID, asset-specific metric versions and benchmark-selection ID. Portfolio Fit and labels are EPIC-004 responsibilities; research alone produces no action.

## Self-Review

Coverage: Tasks 1–3 map every EPIC-003 requirement. Check stock/ETF separation, frozen dates, policy versions and OQ-5 consumers before execution; do not replace approved formulas with provider PEG.
