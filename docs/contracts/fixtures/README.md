# HTTP Contract Fixtures

Each JSON file is a representative Spring `/api/v1` response body shared by the
backend and frontend test suites. Values are test data derived by hand from the
stub scenarios in the backend contract tests; they are not market data and
must never be served to users.

- Backend: `ContractFixtures.assertSameShape` compares the serialized field-path
  set of a real controller response with the fixture (values are ignored, `null`
  is a leaf).
- Frontend: `src/api/contract.test.ts` parses every fixture with a strict zod
  schema that mirrors the TypeScript type in `src/api/client.ts`.

This detects drift between a fixture and the backend response shape, and between a
fixture and the frontend zod schema. The zod schema is hand-mirrored and must be kept
in sync with `src/api/client.ts` by hand; a TypeScript-only interface rename in
`client.ts` is not detected (test files are excluded from `tsc`).
Object-valued maps such as `assetTypeWeights` are compared by their keys, so the `COMPLETE` and `PARTIAL` state
fixtures each pin their own key set.
To add a fixture: write the JSON with every array non-empty and every object
non-null, add a backend shape test for the endpoint, and add a frontend schema test.

| Fixture | Endpoint |
|---|---|
| `portfolio-summary.json` | `GET /portfolio/summary` (`pricingStatus`: worst price status of its positions, `null` without positions; `pricingComplete` is not made false by `STALE`) |
| `portfolio-performance.json` | `GET /portfolio/performance?period=&benchmark=` |
| `portfolio-enriched-positions.json` | `GET /portfolio/positions/enriched` (`priceAsOf` ISO instant and `priceStatus` `OK`; a position without a price has `priceAsOf` `null` and status `FAILED` or `EMPTY`, covered by controller tests. `GET /portfolio/positions/performance` and `GET /prices/{symbol}/latest` carry the same two fields and are pinned by controller tests, without a fixture) |
| `portfolio-transactions.json` | `GET /portfolios/{portfolioId}/transactions` |
| `portfolio-import-batch.json` | `POST/GET /portfolios/{portfolioId}/imports[...]`, `POST .../imports/{batchId}/accept` |
| `portfolio-state-complete.json` | `POST /portfolios/{portfolioId}/states`, `GET .../states/{version}` (`COMPLETE`, weights present) |
| `portfolio-state-partial.json` | Same routes, `PARTIAL`: null price, price date, market value and weight; `assetTypeWeights` is `{}` |
| `error-response.json` | Any Spring 4xx/5xx handled by `GlobalExceptionHandler` |
| `smart-report.json` | `GET /reports/smart/{symbol}`: nullable `sectionStatus` with an `EMPTY` component and a null reason (frontend: schema-only test in `contract.test.ts`; `client.ts` type is the next change) |
| `agent-analysis.json` | `GET /agent-analysis/{ticker}`, `OK` status: `decision_status` `{status: "OK", reason: null}` with decision and confidence (frontend: schema-only test in `contract.test.ts`) |
| `agent-analysis-failed.json` | Same route, `FAILED` status: `decision` and `confidence` are `null`, `decision_status.reason` carries the data-service reason code, `portfolio_manager_reasoning` is still returned (a `null` `decision_status` means unknown and is covered by a controller test) |
| `journal-trade.json` | One element of `GET /journal/trades` `content[]` (also `POST`/`PUT` bodies): an open trade priced from a stored price (`priceStatus` `STALE`, `priceAsOf` ISO instant). A closed trade has the same shape with `closedAt` set, `status` `CLOSED` and `priceAsOf`/`priceStatus` both `null`; `POST`/`PUT` responses also carry both `null` (frontend: schema-only test in `contract.test.ts`) |
