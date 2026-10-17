# Legacy Documentation Archive Manifest

## Archive Metadata

- Archive date: `2026-09-29`
- Canonicalization update: `2026-10-01`
- Physical archive root: `archive/legacy-docs-2026-09-29`
- Last source commit containing the original physical archive set: `77fec5f`
- Last source commit containing the retired active guides: `3e1b63b`
- Recovery: copy a physically archived file back to its repository-relative path,
  or read a retired source with `git show <source-commit>:<relative-path>`.

The archive retains historical claims without mixing them with active contracts.
Files under `data-service/external/TradingAgents` are outside this documentation
archive and were not moved or modified by the canonicalization work.

## Physically Archived Files

### Legacy product, planning, and generated documents

- `FINANCIAL_ANALYSIS_FORMULAS.md`
- `FRONTEND_ROADMAP.md`
- `requirements.md`
- `frontend/README.md`
- `docs/AGENT_ANALYSIS_ARCHITECTURE.md`
- `docs/AUTH_SPEC.md`
- `docs/DATA_FETCHING_REPORT.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/STITCH_UI_GUIDE.md`
- `docs/SYSTEM_REFACTOR_ROADMAP.md`

### Historical Markdown test reports

- `test-results/ambiguous-company-report-controller.md`
- `test-results/ambiguous-fundamentals-controller.md`
- `test-results/ambiguous-market-data.md`
- `test-results/ambiguous-news-controller.md`
- `test-results/ambiguous-portfolio-ledger-service.md`
- `test-results/ambiguous-portfolio-position-controller.md`
- `test-results/ambiguous-price-controller.md`
- `test-results/ambiguous-price-refresh-service.md`
- `test-results/ambiguous-remaining-controllers.md`
- `test-results/ambiguous-report-controller.md`
- `test-results/ambiguous-risk-metrics-calculator.md`
- `test-results/bug-fix-final-verification.md`
- `test-results/bug-fix-phase5-report.md`
- `test-results/bug-fix-phase6-report.md`
- `test-results/inventory.md`
- `test-results/summary-stage0.md`
- `test-results/summary-stage1.md`
- `test-results/test-inventory-company-report-controller.md`
- `test-results/test-inventory-fundamentals-controller.md`
- `test-results/test-inventory-market-data.md`
- `test-results/test-inventory-news-controller.md`
- `test-results/test-inventory-portfolio-ledger-service.md`
- `test-results/test-inventory-portfolio-position-controller.md`
- `test-results/test-inventory-price-controller.md`
- `test-results/test-inventory-price-refresh-service.md`
- `test-results/test-inventory-remaining-controllers.md`
- `test-results/test-inventory-report-controller.md`
- `test-results/test-inventory-risk-metrics-calculator.md`

## Retired Guides After Canonicalization

These tracked guides were superseded on `2026-10-01`. Their load-bearing current
content now has one owner under `AGENTS.md`, `SPEC.md`,
`docs/spec/current-system/`, or `docs/agent/verification.md`. The original files
remain recoverable from commit `3e1b63b`.

| Retired path | Canonical successor |
|---|---|
| `docs/AGENT_WORKFLOW.md` | `AGENTS.md`, `docs/agent/verification.md` |
| `docs/BACKEND_RULES.md` | `AGENTS.md`, `docs/spec/current-system/architecture.md` |
| `docs/CODING_STANDARDS.md` | `AGENTS.md`, runtime manifests/tooling |
| `docs/DATA_SERVICE_RULES.md` | `AGENTS.md`, `docs/spec/current-system/architecture.md` |
| `docs/ERROR_CATALOG.md` | `docs/spec/current-system/contracts.md` |
| `docs/ERROR_FIX_PROTOCOL.md` | `docs/agent/verification.md` |
| `docs/FRONTEND_API.md` | `docs/spec/current-system/contracts.md` |
| `docs/FRONTEND_RULES.md` | `AGENTS.md`, `docs/spec/current-system/architecture.md` |
| `docs/KNOWN_ISSUES.md` | Current open questions in `SPEC.md` and verification caveats |
| `docs/OBSERVABILITY.md` | `docs/spec/current-system/operations.md` |
| `docs/PROVIDER_GUIDE.md` | `docs/spec/current-system/operations.md` |
| `docs/TESTING_PROTOCOL.md` | `docs/agent/verification.md` |
| `docs/architecture.md` | `docs/spec/current-system/architecture.md` |

## Preserved Active Documentation

- `AGENTS.md`, `SPEC.md`, `README.md`, and `CONTRIBUTING.md`
- `.github/BRANCH_PROTECTION.md`
- `docs/README.md` and this manifest
- `docs/spec/current-system/` and `docs/agent/verification.md`
- `docs/adr/`
- `docs/product/`
- `docs/superpowers/specs/`, `docs/superpowers/plans/`, and templates
- Non-Markdown bug records and machine-readable test results
