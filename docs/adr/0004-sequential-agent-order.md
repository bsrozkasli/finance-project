# ADR-0004: Sequential Agent Execution Order

Date: 2026-06-28
Status: Accepted
Deciders: Development team

## Context

The agent-analysis pipeline turns pre-calculated financial, technical, risk, and sentiment metrics into an investment-oriented decision. Each role contributes a different perspective. Fundamental, technical, and risk summaries establish the initial context. Bull and bear researchers then argue from that shared context. The portfolio manager should decide only after seeing both sides and the earlier summaries. Running all agents independently would prevent that ordered context transfer.

## Decision

The multi-agent analysis pipeline will execute sequentially in this order: Fundamental Analyst -> Technical Analyst -> Risk Analyst -> Bull Researcher -> Bear Researcher -> Portfolio Manager.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Parallel agent execution followed by merge | It would reduce latency, but agents could not consume each other's outputs and the final debate context would be weaker. |
| Single LLM prompt | It would reduce orchestration code but would weaken role specialization and increase context-window pressure. |
| Dynamic execution order | It adds complexity without a clear benefit for the current fixed analysis workflow. |

## Consequences

### Positive

- Later agents can use earlier summaries as explicit context.
- The portfolio manager receives both bull and bear arguments before deciding.
- The pipeline is deterministic and easier to test, observe, and debug.
- Token usage and failures can be attributed to well-defined stages.

### Negative / trade-offs

- End-to-end latency is higher than a parallel pipeline.
- A failure in an early stage can block downstream agents.
- Adding new roles requires careful placement in the sequence.

## References

- SPEC.md Section 3
- AGENTS.md Section 3
- data-service/app/routers/agent_analysis.py