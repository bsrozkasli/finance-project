# Backend Rules

The backend is a Spring Boot 3.4 application on Java 17 using hexagonal architecture.

## Package Boundaries

- `domain/model`: framework-free domain models and invariants.
- `domain/port/outbound`: outbound capability interfaces.
- `domain/usecase` or domain services: pure use-case logic.
- `adapter/inbound/rest`: Spring REST controllers.
- `adapter/outbound/persistence`: JPA repositories and persistence adapters.
- `adapter/outbound/client`: external HTTP clients and data-service clients.
- `adapter/outbound/scheduler`: scheduled jobs that delegate to use cases.
- `config/DomainConfig.java`: Spring registration for pure domain use cases.

## Non-Negotiable Rules

- Do not add Spring annotations to domain models or pure domain services.
- Do not import Spring, JPA, HTTP, Redis, or Feign types into `domain/`.
- Controllers must not call JPA repositories directly.
- Adapters must communicate through ports where domain behavior is involved.
- Preserve endpoint shapes and DTO field names unless frontend consumers are updated.
- Prefer MapStruct mapper classes over hand-written mapping in controllers/adapters.
- Use `BigDecimal` for financial calculations.
- Do not hardcode secrets or API keys.

## Scheduled Jobs

Scheduled jobs must stay thin.

Allowed:

```java
@Scheduled(...)
public void run() {
    priceIngestionUseCase.ingest();
}
```

Avoid:

- Fetching external data directly inside the job.
- Performing financial calculations in the job.
- Writing persistence logic in the job.

## Spring Dependency Injection Error Protocol

When backend startup or tests fail with dependency injection errors, use this sequence:

1. Read the full root cause, not only the top-level `ApplicationContext` error.
2. Identify the missing bean type and constructor parameter.
3. Determine the layer:
   - Pure domain use case missing: register it in `DomainConfig.java`.
   - Outbound port missing: create or fix a Spring adapter implementing the port.
   - Mapper missing: ensure MapStruct mapper has `componentModel = "spring"` or is wired consistently with existing mappers.
   - Feign/client missing: check enablement/config and package scanning.
   - Repository missing: check JPA repository package and entity mapping.
4. Do not fix missing pure domain beans by adding `@Service` or `@Component` to domain classes.
5. Do not inject adapters directly into domain objects.
6. Add a focused test or run the smallest existing test that loads the affected slice.
7. Re-run the backend validation command.

Common command:

```powershell
cd backend
.\mvnw.cmd test
```

## External API Rules

- FMP metadata is tried before falling back to minimal `STOCK` assets in asset flows.
- Price history lazy loading reads DB first, then uses `DataServicePriceAdapter`, then persists fetched data.
- Protect external providers with existing resilience patterns where already used.
- Never call real external APIs from tests; use mocks, WireMock, or Testcontainers as appropriate.

## Backend Validation

From `backend/`:

```powershell
.\mvnw.cmd test
```

From macOS/Linux:

```bash
./mvnw test
```
