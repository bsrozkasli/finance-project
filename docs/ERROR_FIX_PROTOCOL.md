# Error Fix Protocol

Use this protocol when fixing build, test, runtime, or dependency errors.

## General Sequence

1. Reproduce the error with the smallest relevant command.
2. Capture the exact failing command and root error.
3. Identify the runtime part: backend, frontend, data-service, infrastructure, or docs.
4. Read nearby code and configuration before editing.
5. Make the smallest fix that preserves architecture.
6. Re-run the failed command.
7. Run any adjacent validation commands if the fix crosses boundaries.

## Spring Dependency Injection Errors

Typical symptoms:

- `UnsatisfiedDependencyException`
- `NoSuchBeanDefinitionException`
- `Parameter 0 of constructor ... required a bean`
- `Failed to load ApplicationContext`

Fix rules:

1. Read the deepest cause in the stack trace.
2. Find the missing bean type.
3. If the missing type is a pure use case, register it in `DomainConfig.java`.
4. If the missing type is an outbound port, ensure a Spring adapter implements it and is component-scanned.
5. If the missing type is a JPA repository, check repository package scanning and entity annotations.
6. If the missing type is a mapper, follow existing MapStruct mapper patterns.
7. If the missing type is a Feign client, check Feign configuration and client package.
8. Do not add Spring annotations to domain classes as a shortcut.
9. Do not move domain logic into controllers to bypass wiring.

Validation:

```powershell
cd backend
.\mvnw.cmd test
```

## Frontend Build Errors

Common checks:

- Type mismatch: fix types at the API boundary or prop boundary.
- Missing export/import: follow existing component and hook naming.
- Vite dependency/native package issue: retry after confirming dependencies are installed.
- API route mismatch: update `client.ts` and `vite.config.ts` together when routing changes.

Validation:

```powershell
cd frontend
npm run lint
npm run build
```

## Data-Service Errors

Common checks:

- `ModuleNotFoundError`: run `python -m pytest` from `data-service/`.
- Insufficient candles: preserve and handle `MIN_CANDLES`.
- Empty market data: return a controlled error instead of allowing dataframe index errors.
- Dependency compile failures on Windows: confirm Python version and build tools.

Validation:

```powershell
cd data-service
python -m pytest
```

## Infrastructure Errors

- Testcontainers failures usually require Docker to be running.
- Port conflicts must respect fixed dev ports unless the task explicitly changes config.
- Redis/PostgreSQL local failures should be diagnosed through `docker-compose.yml`.

## Do Not

- Do not silence errors by weakening tests.
- Do not remove validation to make builds pass.
- Do not change public API contracts without updating consumers and docs.
- Do not commit secrets.
