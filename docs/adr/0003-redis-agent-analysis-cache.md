# ADR-0003: Redis Cache for Agent Analysis Results

Date: 2026-06-28
Status: Accepted
Deciders: Development team

## Context

Agent analysis invokes a metrics-only multi-agent pipeline backed by Azure OpenAI. That path is expensive relative to normal REST reads and can take several seconds or more per ticker. Users may request the same ticker repeatedly from the dashboard, and repeated calls should not trigger identical LLM work while the market context is still fresh enough. A 15 minute TTL balances response speed and provider cost against the fact that market data and sentiment can change meaningfully during a trading session.

## Decision

Agent analysis results will be cached in Redis with a default 15 minute TTL before the backend calls the FastAPI agent-analysis adapter again for the same ticker.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| In-memory cache | It is lost on application restart and does not work consistently across multiple backend instances. |
| Database-backed cache | It adds database load and latency for data that is intentionally short-lived. |
| No cache | Every repeated request would invoke the LLM pipeline, increasing latency, cost, and rate-limit exposure. |

## Consequences

### Positive

- Repeated ticker requests return faster within the TTL window.
- Azure OpenAI cost and token usage are reduced.
- Redis can support shared cache state across backend instances.
- The TTL provides a clear freshness boundary for agent-analysis responses.

### Negative / trade-offs

- Users may see a cached analysis for up to 15 minutes after market context changes.
- Cache invalidation endpoints and operational cache monitoring are required.
- Redis availability becomes important for optimal agent-analysis latency.

## References

- SPEC.md Section 3
- SPEC.md Section 14
- AGENTS.md Section 3