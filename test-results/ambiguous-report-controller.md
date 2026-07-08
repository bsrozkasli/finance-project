# Ambiguous Behavior - report-controller

1. Public diagnostic endpoint policy
- `GET /api/v1/reports/test` is currently public and returns a plain string.
- It is unclear whether this endpoint should remain public in production or be restricted/removed later.

2. Text vs JSON contract evolution
- Current endpoint returns `String` payload and, in this test slice, accepts both `text/plain` and `application/json` with `200`.
- It is unclear whether long-term contract should remain plain text or migrate to a stable JSON envelope.

3. Reports route ownership split
- `ReportController` owns only `/api/v1/reports/test`.
- `/api/v1/reports/company/{symbol}` and `/api/v1/reports/smart/{symbol}` are owned by `CompanyReportController` and `SmartReportController` respectively.
- Cross-controller routing ownership is clear in code but can be misread if only the path prefix is considered.

4. Global stable error schema rollout
- `SPEC.md` and `docs/ERROR_CATALOG.md` define a stable error shape for new handlers.
- Existing controllers may still use default Spring error rendering in some paths.
- Whether strict stable schema is mandatory for all legacy endpoints immediately remains a migration-policy ambiguity.
