# Architecture Decision Records

This directory stores Architecture Decision Records (ADRs) for durable project-level decisions.

## ADR List

| ADR | Title | Status |
|---|---|---|
| [ADR-0001](0001-hexagonal-architecture.md) | Backend Hexagonal Architecture | Accepted |
| [ADR-0002](0002-three-runtime-monorepo.md) | Three-Runtime Monorepo | Accepted |
| [ADR-0003](0003-redis-agent-analysis-cache.md) | Redis Cache for Agent Analysis Results | Accepted |
| [ADR-0004](0004-sequential-agent-order.md) | Sequential Agent Execution Order | Accepted |
| [ADR-0005](0005-db-first-lazy-price-loading.md) | DB-First Lazy Price History Loading | Accepted |

## Adding a New ADR

1. Copy the established ADR structure into a new file named `NNNN-short-title.md`.
2. Use the next sequential ADR number.
3. Set `Status: Proposed` while the decision is under review.
4. Change the status to `Accepted` only after the team agrees on the decision.
5. Include concrete alternatives and trade-offs, not only the chosen option.
6. Reference the relevant `SPEC.md`, `AGENTS.md`, code, or operational docs.
7. Add the new ADR to the table above in the same commit.

## Status Values

- `Proposed`: under discussion and not yet binding.
- `Accepted`: current decision and expected project direction.
- `Deprecated`: no longer recommended, but kept for historical context.
- `Superseded`: replaced by a newer ADR; link the replacement ADR.