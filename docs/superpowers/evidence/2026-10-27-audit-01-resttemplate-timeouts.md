# Evidence: audit-01 RestTemplate timeouts

**Date:** 2026-10-27
**Branch:** `fix/resttemplate-timeouts` (base `5edd6e1`)
**Plan:** `docs/superpowers/plans/2026-10-27-audit-01-resttemplate-timeouts.md`

## Commits

| Commit | Message |
|---|---|
| `6ddeacf` | `fix(backend): bound outbound RestTemplate connect and read timeouts` |
| `edad11f` | `docs(spec): record RestTemplate timeout policy` |

## TDD

- Red: new `WebConfigTest` cases written first; `mvn test` failed to compile because `restTemplate(Duration, Duration)` did not exist.
- Green: after implementing `WebConfig.restTemplate(connectTimeout, readTimeout)` all `WebConfigTest` cases pass:
  read timeout surfaces as `ResourceAccessException` (root cause `SocketTimeoutException`), request-id header still propagated,
  zero/negative timeouts rejected with `IllegalArgumentException`.
- Defaults: connect 3 s, read 60 s (`application.yml` `data-service.http.*`).
- `RequestCorrelationFilterTest` call site updated to the new signature (required to compile).

## Verification (fresh run, 2026-10-27, PowerShell, `backend/`)

```
.\mvnw.cmd test -Dtest=WebConfigTest,RequestCorrelationFilterTest,DataService*Test,Yahoo*Test -Dsurefire.failIfNoSpecifiedTests=false
Tests run: 28, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

`TechnicalAnalysisAdapterTest` and `LlmInsightAdapterTest` match no classes. No live providers called (local `HttpServer` stubs).
The full backend suite was not run locally (120 s limit); CI is the gate.

## Review

Task 1: spec compliant, quality approved (Sonnet reviewer; no Critical/Important). Deferred minors: no connect-timeout enforcement test,
no Spring-context binding test for the `Duration` properties, `exchange.close()` not in `finally` in the echo stub.
Task 2: docs reviewed by controller against code (property names/defaults match `WebConfig`).

## Decision

3 s / 60 s instead of the audit's 3 s / 10 s: data-service LLM calls wait up to 30/45 s via this shared bean.
Recorded in `docs/product/decisions/2026-10-27-resttemplate-timeouts.md`.
