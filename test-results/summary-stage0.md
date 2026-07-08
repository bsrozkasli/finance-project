# Stage 0 Summary

- Stage: `0-inventory`
- Timestamp (UTC): 2026-07-04T22:31:03Z
- Total checks: 18
- Passed: 12
- Failed/Missing: 6

## Critical Top 5 Issues

1. Missing backend profile config `application-dev.yml` at `backend/src/main/resources/application-dev.yml`.
2. Missing backend profile config `application-prod.yml` at `backend/src/main/resources/application-prod.yml`.
3. Missing backend `application.properties` at `backend/src/main/resources/application.properties`.
4. `application-test.yml` is not under main resources (`backend/src/main/resources`); it exists only in test resources.
5. Missing `data-service/pyproject.toml` (only `requirements.txt` present).

## Additional Finding

- `Jenkinsfile` not found at repository root; GitHub Actions workflows are present under `.github/workflows/`.

## Output Files

- `test-results/inventory.md`
- `test-results/errors.jsonl` (append-only)
- `test-results/summary-stage0.md`
