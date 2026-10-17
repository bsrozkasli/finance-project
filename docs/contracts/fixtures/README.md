# HTTP Contract Fixtures

Each JSON file is a representative Spring `/api/v1` response body shared by the
backend and frontend test suites. Values are test data derived by hand from the
stub scenario in `PortfolioDashboardContractTest`; they are not market data and
must never be served to users.

- Backend: `ContractFixtures.assertSameShape` compares the serialized field-path
  set of a real controller response with the fixture (values are ignored, `null`
  is a leaf).
- Frontend: `src/api/contract.test.ts` parses every fixture with a strict zod
  schema that mirrors the TypeScript type in `src/api/client.ts`.

Changing a field name therefore fails the backend test, the frontend test, or both.
To add a fixture: write the JSON with every array non-empty and every object
non-null, add a backend shape test for the endpoint, and add a frontend schema test.

| Fixture | Endpoint |
|---|---|
| `portfolio-summary.json` | `GET /portfolio/summary` |
| `portfolio-performance.json` | `GET /portfolio/performance?period=&benchmark=` |
| `portfolio-enriched-positions.json` | `GET /portfolio/positions/enriched` |
| `error-response.json` | Any Spring 4xx/5xx handled by `GlobalExceptionHandler` |
