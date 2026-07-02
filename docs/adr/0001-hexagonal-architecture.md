# ADR-0001: Backend Hexagonal Architecture

Date: 2026-06-28
Status: Accepted
Deciders: Development team

## Context

The backend owns domain behavior for assets, prices, portfolios, journal trades, watchlists, reports, and agent-analysis orchestration. That logic must remain testable without booting Spring and must not depend directly on PostgreSQL, Redis, FastAPI, Yahoo, Tiingo, Finnhub, or any other provider implementation. The project also needs provider adapters to be replaceable as market-data sources, caching, and persistence implementations evolve.

## Decision

The Spring Boot backend will use hexagonal architecture with framework-free domain models and services, outbound ports in the domain layer, and Spring-specific inbound/outbound adapters outside the domain.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Traditional layered MVC | It tends to couple controllers, services, repositories, and framework annotations tightly, making provider replacement and pure domain testing harder. |
| CQRS + Event Sourcing | It would add operational and modeling complexity that is not justified by the current read/write patterns or audit requirements. |

## Consequences

### Positive

- Domain logic can be tested without Spring infrastructure.
- External providers, persistence, and cache implementations can be swapped behind ports.
- Controllers and scheduled jobs stay thin and delegate to use cases.
- Domain models remain explicit about invariants instead of relying on framework behavior.

### Negative / trade-offs

- More interfaces and adapter classes are required than in a simple MVC structure.
- New features must respect package boundaries, which adds review overhead.
- Wiring pure use cases through `DomainConfig.java` requires discipline as the system grows.

## References

- SPEC.md Section 3
- AGENTS.md Section 2
- backend/src/main/java/com/ozkaslibasar/financeproject/config/DomainConfig.java