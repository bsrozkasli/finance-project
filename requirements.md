# 📋 Project Requirements, Dependencies, & Gotchas

This document details the software, environmental, and credential requirements for running and testing the **Hybrid Financial Analysis Engine** across all three runtime parts.

---

## 💻 System-Level Prerequisites

To build and run the entire monorepo locally, your system must satisfy these minimum requirements:

*   **Operating System**: Windows 10/11, macOS, or modern Linux distribution.
*   **Java Runtime**: **Java 17 (LTS)** JDK installed (e.g., Eclipse Temurin or OpenJDK).
*   **Node.js**: **Node.js v18.0+** and **npm v9.0+** for building the React frontend.
*   **Python**: **Python 3.10 or 3.11** (Note: PyPortfolioOpt has compilation dependencies that compile best on 3.10/3.11; Python 3.12+ might require specific C++ build tools on Windows).
*   **Containerization**: **Docker Desktop** or an active Docker daemon (e.g. Rancher Desktop, Colima) for starting the PostgreSQL and Redis containers.
*   **Build Tools**:
    *   Maven Wrapper (`mvnw`) is bundled in `backend/`.
    *   Vite acts as the build bundler in `frontend/`.

---

## 🔌 Port Mapping & Dev Services

Make sure the following local TCP ports are free before launching the services:

*   **`8080`**: Spring Boot Backend API
*   **`8000`**: FastAPI Python Data Service
*   **`5173`**: Vite React Frontend Server
*   **`5433`**: PostgreSQL Database (mapped from container `5432`)
*   **`6379`**: Redis Cache instance

---

## ☕ Backend Service Requirements (`backend/`)

### 1. Key Dependencies (`pom.xml`)
The Spring Boot 3.4 API core depends on:
*   **Spring Web & Spring Data JPA**: REST Controllers layer and persistence mappings.
*   **PostgreSQL Driver**: JDBC communications.
*   **Spring Data Redis**: Caching interface for latest asset rates.
*   **Spring Cloud OpenFeign**: Declarative client support for external HTTP calls.
*   **Resilience4j**: Rate limiter and circuit breaker protection on third-party HTTP clients.
*   **MapStruct**: High-performance, type-safe bean mapping between Entities, Domain records, and REST DTOs.
*   **Lombok**: Automatic getters, setters, constructors, and builder generation.
*   **Testcontainers (PostgreSQL)**: Spinstrap a real database inside standard integration tests.
*   **WireMock**: HTTP mock recording/stubbing for external API unit validation.

### 2. Database Schema Mappings
The persistence layer contains tables maps to the following entities:
*   `AssetEntity`: Persistent representation of tracking financial instruments (e.g., AAPL).
*   `PriceEntity`: Persistent representation of a specific candlestick containing Open, High, Low, Close, Volume, and Timestamp.

---

## 🐍 Data Service Requirements (`data-service/`)

### 1. Core Python Dependencies (`requirements.txt`)
*   **`fastapi`** & **`uvicorn`**: High-performance ASGI web api server framework.
*   **`yfinance`**: Financial market downloader from Yahoo Finance API.
*   **`pandas`** & **`numpy`**: Fast tabular data management and matrices operations.
*   **`pandas-ta == 0.3.14b`**: Over 130 technical indicators library including RSI, MACD, Bollinger Bands, EMA, etc.
*   **`scipy == 1.13.0`**: Advanced algorithms for portfolio modeling and stats.
*   **`PyPortfolioOpt == 1.5.5`**: Portfolio optimization mathematical solver.
*   **`cvxpy == 1.5.2`**: Convex optimization engine required by PyPortfolioOpt solvers.
*   **`finnhub-python == 2.4.20`**: Official REST API wrapper for Finnhub news feeds.
*   **`anthropic == 0.28.0`**: Claude LLM model bindings.
*   **`pytest`** & **`pytest-asyncio`**: Async-aware test suite executors.

---

## ⚛️ Frontend UI Requirements (`frontend/`)

### 1. Build and Bundling
*   Built using **Vite v8.x** and **TypeScript**.
*   **Vanilla CSS**: Styles are controlled via premium custom CSS variables located in `src/index.css`.
*   **React Router**: Controls client-side navigational path transitions.
*   **Axios**: Configured client with preloaded base URL pointing to the Spring Boot instance on `http://localhost:8080/api/v1`.

---

## 🔑 Required API Keys & Env Variables

You need to obtain API credentials from the respective providers to enable all features:

1.  **Finnhub API Key**: Required by `data-service` to run market news sentiment indicators.
    *   Sign up at: [Finnhub API](https://finnhub.io/)
2.  **Anthropic API Key**: Required by `data-service` to generate LLM insights and portfolio stress scenario text.
    *   Sign up at: [Anthropic Console](https://console.anthropic.com/)

---

## ⚠️ Known Gotchas & Troubleshooting

### 1. Testcontainers & Docker Daemon
*   **Issue**: Running `./mvnw test` fails with `IllegalStateException` loading Spring Application Context.
*   **Cause**: The suite runs real Postgres integration tests via Testcontainers. If Docker Desktop is not active, the environment cannot mount.
*   **Fix**: Always make sure your Docker engine is fully started before running tests.

### 2. Python PYTHONPATH Errors on Pytest
*   **Issue**: Running pytest yields `ModuleNotFoundError: No module named 'app'` or similar.
*   **Cause**: Running plain `pytest` command does not always append the current directory (`data-service/`) to the active python sys.path.
*   **Fix**: Execute tests through python module syntax:
    ```bash
    python -m pytest
    ```

### 3. Windows C++ Compiler Errors on `pip install`
*   **Issue**: Installing `cvxpy` or `PyPortfolioOpt` throws missing compiler errors on Windows.
*   **Cause**: Mathematical optimization packages depend on compiled C/C++ backends (like OSQP, ECOS).
*   **Fix**: Install **Build Tools for Visual Studio** with the "Desktop development with C++" workload selected.

### 4. Technical Analysis Candle Minimums
*   **Issue**: Calling the `/technical/{symbol}` endpoint returns `HTTP 400 Bad Request`.
*   **Cause**: The TechnicalAnalysisService requires a strict minimum of **30 candles** (`TechnicalAnalysisService.MIN_CANDLES`) to compute long-period moving averages (EMA/SMA) and signals safely. Ensure the range argument (e.g., `range=3mo`) provides enough data points.
