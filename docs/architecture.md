# System Architecture

This document provides a comprehensive overview of the System Architecture for the **Finance Project**, detailing the communication patterns, hexagonal architecture layout of the backend, FastAPI data-service capabilities, caching strategy, and database layout.

---

## 1. High-Level Architecture Diagram

The system is composed of a Vite+React frontend, a Spring Boot backend acting as the central API gateway and orchestrator, a FastAPI data-service for technical analysis and agent-based reasoning, a Redis cache, and a PostgreSQL database.

```mermaid
flowchart TB
    %% Nodes / Components
    subgraph FrontendSpace ["Frontend (Vite + React + TS)"]
        FE[React UI / Components]
        API_Client[Axios Client]
    end

    subgraph BackendSpace ["Backend (Spring Boot 3.4 - Hexagonal Architecture)"]
        subgraph AdaptersIn ["Inbound Adapters (Primary)"]
            REST[REST Controllers]
            Sched[Scheduled Ingestion Jobs]
        end
        
        subgraph Domain ["Pure Domain (Framework-Free)"]
            Service[Domain Use Cases / Services]
            Model[Domain Models / Entities]
        end
        
        subgraph AdaptersOut ["Outbound Adapters (Secondary)"]
            DB_Adapter[JPA Repository Adapters]
            Cache_Adapter[Redis Cache Adapter]
            DS_Client[FastAPI Client Adapter]
            FMP_Client[FMP API Client Adapter]
            FH_Client[Finnhub Client Adapter]
        end
    end

    subgraph DataServiceSpace ["FastAPI Data-Service"]
        Router[FastAPI Routers]
        YF[yfinance / pandas-ta Wrapper]
        
        subgraph AgentSystem ["Multi-Agent Reasoning System"]
            Graph[MetricsTradingAgentsGraph]
            Agent_Fund[Fundamental Agent]
            Agent_Tech[Technical Agent]
            Agent_Risk[Risk Agent]
            Agent_Bull[Bullish Thesis Agent]
            Agent_Bear[Bearish Thesis Agent]
            Agent_PM[Portfolio Manager Agent]
        end
    end

    subgraph Storage ["Storage & Caching"]
        Postgres[(PostgreSQL DB)]
        Redis[(Redis Cache)]
    end

    subgraph External ["External Services"]
        FMP_API[FMP API]
        Finnhub_API[Finnhub API]
        Azure_OpenAI[Azure OpenAI]
    end

    %% Communication Flow Lines
    FE -->|User Actions| API_Client
    API_Client -->|REST HTTP requests /api/v1| REST
    
    %% Hexagonal mapping
    REST --> Service
    Sched --> Service
    Service --> Model
    Service --> DB_Adapter
    Service --> Cache_Adapter
    Service --> DS_Client
    Service --> FMP_Client
    Service --> FH_Client
    
    %% Storage links
    DB_Adapter -->|SQL queries| Postgres
    Cache_Adapter -->|Reads / Writes| Redis
    
    %% Services / Clients links
    DS_Client -->|HTTP /api/v1| Router
    FMP_Client -->|HTTPS API calls| FMP_API
    FH_Client -->|HTTPS API calls| Finnhub_API
    
    %% FastAPI Internal
    Router --> YF
    Router --> Graph
    Graph --> Agent_Fund
    Agent_Fund --> Agent_Tech --> Agent_Risk --> Agent_Bull --> Agent_Bear --> Agent_PM
    Graph -->|Prompts & Data| Azure_OpenAI
```

---

## 2. Key Components and Communication Patterns

### 2.1 Frontend Communication
- Built with **React**, **TypeScript**, **Vite**, and React Router browser routes.
- Styled using design tokens declared in `frontend/src/index.css`.
- The Axios HTTP client (`frontend/src/api/client.ts`) communicates exclusively with the Spring Boot backend on `http://localhost:8080/api/v1`.
- Browser routes such as `/dashboard`, `/portfolio/{portfolioId}`, `/news/{symbol}`, and `/reports/{symbol}` are frontend-only routes and are distinct from backend `/api/v1` endpoints.
- State management and side-effects are organized via custom hooks (e.g., `useAgentAnalysis.ts`), with page-level state composed in `Dashboard.tsx` and transient UI state kept in components.

### 2.2 Backend (Hexagonal Architecture)
To maintain long-term maintainability, the backend codebase is partitioned into three key packages:
1. **Domain Model**: Framework-free Java classes (e.g., `Asset`, `PriceHistory`) that contain core logic and enforce system invariants at construction time.
2. **Domain Port (Outbound)**: Interfaces defining what capabilities the domain needs (e.g., repository interfaces, external api client interfaces).
3. **Adapters**:
   - *Inbound (Primary)*: REST controllers (`PriceController`, `AssetController`, `AgentAnalysisController`) and scheduled tasks (`PriceIngestionJob`) that drive the application.
   - *Outbound (Secondary)*: Implementations of the ports (e.g., JPA repositories, Redis caching adapters, and REST clients targeting FMP/FastAPI).
- All pure domain use-case beans are registered programmatically in `DomainConfig.java` to prevent Spring framework annotations from leaking into the pure domain package.

### 2.3 FastAPI Data-Service
- Serves as the core analytical engine.
- Uses `yfinance` and `pandas-ta` to calculate technical analysis indicators (requires at least 30 candles).
- Hosts the **Multi-Agent Reasoning System** (`MetricsTradingAgentsGraph`) powered by Azure OpenAI.
- **Agent Analysis Pipeline**:
  1. **Fundamental Agent**: Assesses financial statements and solvency/growth metrics.
  2. **Technical Agent**: Parses price history, moving averages, and technical indicators.
  3. **Risk Agent**: Audits volatility and potential portfolio drawbacks.
  4. **Bullish & Bearish Thesis Agents**: Formulate arguments for positive and negative perspectives.
  5. **Portfolio Manager Agent**: Aggregates all insights to produce a final recommendation (Decision, Confidence, and Summary).

### 2.4 Caching and Persistence
- **Redis Cache**: Used to cache quantitative data and LLM agent analysis results (15-minute TTL) to avoid redundant computation and external API charges.
- **PostgreSQL**: Stores persistent tables such as `assets`, `price_histories`, and `agent_analysis_history` for audit trails and offline analysis.

---

## 3. Core Data Flow Diagram

The following sequence diagram outlines a typical request cycle for generating a Multi-Agent Analysis Report on a specific ticker:

```mermaid
sequenceDiagram
    autonumber
    actor User as React Client (UI)
    participant Spring as Spring Boot Backend
    participant Redis as Redis Cache
    participant Postgres as PostgreSQL DB
    participant FastAPI as FastAPI Data-Service
    participant Azure as Azure OpenAI (LLM)

    User->>Spring: GET /api/v1/agent-analysis/{ticker}
    Spring->>Redis: Check cache for key 'agent-analysis:{ticker}'
    
    alt Cache Hit
        Redis-->>Spring: Return cached AgentAnalysisResponse
        Spring-->>User: Return response (200 OK)
    else Cache Miss
        Spring->>Postgres: Load ticker metadata & historical prices
        Postgres-->>Spring: Return Asset & Price data
        Spring->>Spring: Compute Financial, Technical, & Risk Metrics
        
        Spring->>FastAPI: POST /api/v1/agent-analysis (Metrics payload)
        
        Note over FastAPI, Azure: Multi-Agent execution graph is initialized
        FastAPI->>Azure: Run Agent Graph (Fund -> Tech -> Risk -> Bull -> Bear -> PM)
        Azure-->>FastAPI: Return Consolidated Agent Analysis JSON
        
        FastAPI-->>Spring: Return AgentAnalysisResult
        
        Spring->>Postgres: Save result to agent_analysis_history table
        Spring->>Redis: Cache result with 15 min TTL
        
        Spring-->>User: Return computed analysis (200 OK)
    end
```
