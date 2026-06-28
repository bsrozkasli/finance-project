# ADR-0002: Three-Runtime Monorepo

Date: 2026-06-28
Status: Accepted
Deciders: Development team

## Context

The product needs a durable backend API, data-heavy analytics, and an interactive frontend. Spring Boot and Java are a strong fit for the backend API, domain orchestration, persistence, caching, and operational integration. Python is the practical choice for market-data and analytics workflows because the project depends on libraries such as pandas, pandas-ta, yfinance, and portfolio optimization tooling. The frontend also needs a separate Vite + React + TypeScript runtime for fast UI iteration and browser delivery.

## Decision

The project will remain a monorepo with three runtimes: Spring Boot backend, FastAPI data-service, and Vite React frontend.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Single Spring Boot application without Python integration | It would force reimplementation or awkward integration of Python-first financial analytics libraries. |
| Separate repositories for each runtime | It would increase coordination overhead for API contract changes that span frontend, backend, and data-service. |
| Python-only backend | It would weaken the existing Java domain architecture, Spring ecosystem integration, and type-safe backend structure. |

## Consequences

### Positive

- Each runtime uses the ecosystem best suited to its responsibility.
- Cross-service contract changes can be reviewed in one repository.
- Local development can be coordinated through fixed ports and Docker Compose.
- Frontend, backend, and analytics code can evolve together while preserving clear runtime boundaries.

### Negative / trade-offs

- Developers need toolchains for Java, Python, Node, Docker, and local infrastructure.
- CI and local verification require multiple commands.
- API contracts must be kept synchronized across runtimes.

## References

- SPEC.md Section 1
- SPEC.md Section 3
- AGENTS.md Section 1
- docker-compose.yml