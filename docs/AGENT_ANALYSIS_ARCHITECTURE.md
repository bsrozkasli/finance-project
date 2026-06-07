# Agent Analysis Architecture

## Overview

TradingAgents integration follows a **metrics-first** design: Spring Boot aggregates market data and computes all quantitative metrics; FastAPI runs a metrics-only multi-agent reasoning pipeline on Azure OpenAI.

```mermaid
flowchart LR
  subgraph Frontend
    UI[React Agent Insights Tab]
  end
  subgraph Backend["Spring Boot (Hexagonal)"]
    API[AgentAnalysisController]
    Cache[(Redis agent-analysis:TICKER)]
    UC[AgentAnalysisUseCase]
    Calc[Financial / Technical / Risk Calculators]
    FMP[FMP Adapter]
    YF[Yahoo / Data-Service Prices]
    FH[Finnhub Sentiment]
    DB[(PostgreSQL agent_analysis_history)]
  end
  subgraph AI["FastAPI + MetricsTradingAgentsGraph"]
    EP[POST /api/v1/agent-analysis]
    TA[propagate: Fund → Tech → Risk → Bull → Bear → PM]
    AZ[Azure OpenAI]
  end
  UI --> API
  API --> Cache
  Cache -->|miss| UC
  UC --> Calc
  Calc --> FMP
  Calc --> YF
  UC --> FH
  UC --> EP
  EP --> TA
  TA --> AZ
  UC --> DB
  Cache -->|hit| API
```

## Cache

| Key | TTL | Payload |
|-----|-----|---------|
| `agent-analysis:{TICKER}` | 15 minutes | decision, confidence, summaries, `generated_at` |

Invalidation: `DELETE /api/v1/agent-analysis/{ticker}/cache` or `DELETE /api/v1/agent-analysis/cache`.

## Observability

| Metric | Layer |
|--------|--------|
| `agent.analysis.cache` (hit/miss) | Spring |
| `agent.execution.time` | Spring |
| `agent.analysis.latency` | Spring → FastAPI client |
| `agent.azure.tokens` | Spring + Prometheus on data-service |
| `agent_analysis_latency_seconds` | data-service |
| Micrometer tracing (OTel bridge) | Spring |

## Persistence

Table `agent_analysis_history`: `id`, `ticker`, `decision`, `confidence`, `analysis_json`, `created_at`.

Migration: `backend/src/main/resources/db/migration/V2__agent_analysis_history.sql`.
