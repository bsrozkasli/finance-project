# Bug Fix Phase 5 Report

Generated: 2026-07-08T17:32:17+03:00
Branch: fix-domain-correctness-phase2
Scope: backend bug-fix consolidation and provider-degradation verification

## Status

Phase 5 found no additional backend production-code defect that remained red in the current test suite. The remaining stale JSONL entries are preserved as original bug-discovery evidence, while the current verification commands below show the affected tests now pass.

## Fixed Bug Groups Verified

- Price data integrity: BE-PRICE-001
- Risk metrics correctness: BE-RISK-001
- Portfolio ledger chronological accounting: BE-LEDGER-001
- Stable REST error mapping and provider-dependency status handling: BE-PRICE-CTRL-001 through BE-PRICE-CTRL-007, BE-CTRL-001 through BE-CTRL-011, BE-POS-CTRL-004 through BE-POS-CTRL-014
- Portfolio position false-success and sync failure handling: BE-POS-CTRL-001 through BE-POS-CTRL-003
- Company report partial degradation: BE-COMPANY-REPORT-001 through BE-COMPANY-REPORT-003
- Fundamentals partial degradation: BE-FUND-CTRL-001 through BE-FUND-CTRL-005

## Verification Evidence

- `cd backend; .\mvnw.cmd "-Dtest=CompanyReportControllerTest,FundamentalsControllerTest" test`
  - Result: BUILD SUCCESS
  - Tests: 53 run, 0 failures, 0 errors, 3 skipped

- `cd backend; .\mvnw.cmd "-Dtest=PortfolioPositionControllerTest" test`
  - Result: BUILD SUCCESS
  - Tests: 47 run, 0 failures, 0 errors, 7 skipped

- `cd backend; .\mvnw.cmd test`
  - Result: BUILD SUCCESS
  - Tests: 409 run, 0 failures, 0 errors, 34 skipped

- `git diff --check -- backend/src/main/java backend/src/test/java`
  - Result: no whitespace errors
  - Note: Git reported CRLF conversion warnings on Windows; no diff-check failure.

## Notes

- No endpoint path or DTO field was intentionally renamed.
- No fake market data was introduced.
- Provider degradation uses empty lists, null optional sections, partial DTOs, or controlled 503 error responses depending on endpoint contract.
- Original `bugs-found-*.jsonl` files were not rewritten, to keep the red-test discovery evidence immutable.