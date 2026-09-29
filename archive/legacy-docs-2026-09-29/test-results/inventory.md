# Stage 0 Inventory Report

Generated: 2026-07-04T22:31:03Z

## 1) Backend (Java/Spring Boot)

- Build file: `backend/pom.xml` (single module Spring Boot project, Java 17)
- Top-level packages: `adapter`, `config`, `domain`
- Hexagonal split present: `adapter/inbound`, `adapter/outbound`, `domain/port/outbound`, `domain/service`, `domain/model`, `domain/usecase`

### Domain Layer Classes

- `domain/model` (26): AgentAnalysisResult.java, AgentMetricSnapshot.java, AgentSentimentSnapshot.java, Asset.java, AssetType.java, BacktestResult.java, EarningsEvent.java, EconomicEvent.java, FinancialStatement.java, FundamentalSnapshot.java, JournalTrade.java, JournalTradeStatus.java, JournalTradeType.java, MacroSnapshot.java, MarketCalendar.java, OpportunityNotification.java, Portfolio.java, PortfolioAssetType.java, PortfolioHolding.java, PortfolioPosition.java, PortfolioTransaction.java, PortfolioTransactionAction.java, PortfolioTransactionSource.java, PriceHistory.java, SmartReport.java, Watchlist.java
- `domain/service` (10): AgentAnalysisUseCase.java, FinancialMetricsCalculator.java, FinancialStatementMerger.java, PortfolioLedgerService.java, PriceIngestionService.java, PriceIngestionUseCase.java, PriceNormalizationService.java, PriceRefreshService.java, RiskMetricsCalculator.java, TechnicalMetricsCalculator.java
- `domain/port/outbound` (25): AgentAnalysisAiPort.java, AgentAnalysisHistoryPort.java, AssetRepositoryPort.java, FinancialDataClientPort.java, FinancialDataPort.java, FinancialStatementClientPort.java, FinancialStatementRepositoryPort.java, FundamentalSnapshotPort.java, JournalTradePort.java, LlmInsightPort.java, MarketCalendarPort.java, NotificationRepositoryPort.java, PatternDetectionPort.java, PortfolioOptimizationPort.java, PortfolioPort.java, PortfolioPositionPort.java, PortfolioTransactionPort.java, PriceChartClientPort.java, PriceRepositoryPort.java, ResearchDataPort.java, SentimentDataPort.java, SmartReportMarketDataPort.java, SmartReportScorePort.java, TechnicalAnalysisPort.java, WatchlistPort.java

### DomainConfig.java (full content)

```java
package com.ozkaslibasar.financeproject.config;

import com.ozkaslibasar.financeproject.adapter.outbound.client.yahoo.YahooStatementClientAdapter;
import com.ozkaslibasar.financeproject.domain.port.outbound.AgentAnalysisAiPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.AssetRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.FinancialDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.MarketCalendarPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceChartClientPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PriceRepositoryPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.PortfolioTransactionPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SentimentDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportMarketDataPort;
import com.ozkaslibasar.financeproject.domain.port.outbound.SmartReportScorePort;
import com.ozkaslibasar.financeproject.domain.service.AgentAnalysisUseCase;
import com.ozkaslibasar.financeproject.domain.service.PriceIngestionService;
import com.ozkaslibasar.financeproject.domain.service.PriceNormalizationService;
import com.ozkaslibasar.financeproject.domain.service.PortfolioLedgerService;
import com.ozkaslibasar.financeproject.domain.service.PriceRefreshService;
import com.ozkaslibasar.financeproject.domain.usecase.SmartReportUseCase;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration class to register pure domain services as Spring Beans.
 *
 * <p>This allows the domain layer to remain free of Spring annotations like
 * {@code @Service}, while still participating in the application context.</p>
 * <p>Market data is sourced from Yahoo Finance, Tiingo where configured,
 * and the local FastAPI data-service fallback.</p>
 */
@Configuration
public class DomainConfig {

    /**
     * Registers {@link PriceIngestionService} (Yahoo-backed) as a bean.
     *
     * <p>This is the primary ingestion service used by the scheduler.
     * It delegates to {@link PriceChartClientPort} (Yahoo Finance) for price data.</p>
     */
    @Bean
    public PriceIngestionService priceIngestionService(
            AssetRepositoryPort assetRepositoryPort,
            PriceRepositoryPort priceRepositoryPort,
            PriceChartClientPort priceChartClientPort) {
        return new PriceIngestionService(
                assetRepositoryPort, priceRepositoryPort, priceChartClientPort);
    }

    @Bean
    public PriceNormalizationService priceNormalizationService() {
        return new PriceNormalizationService();
    }

    @Bean
    public PriceRefreshService priceRefreshService(
            PriceRepositoryPort priceRepositoryPort,
            FinancialDataPort financialDataPort) {
        return new PriceRefreshService(priceRepositoryPort, financialDataPort);
    }

    @Bean
    public PortfolioLedgerService portfolioLedgerService(PortfolioTransactionPort transactionPort) {
        return new PortfolioLedgerService(transactionPort);
    }

    @Bean
    public AgentAnalysisUseCase agentAnalysisUseCase(
            YahooStatementClientAdapter yahooStatementClient,
            FinancialDataPort financialDataPort,
            PriceRepositoryPort priceRepositoryPort,
            SentimentDataPort sentimentDataPort,
            MarketCalendarPort marketCalendarPort,
            AgentAnalysisAiPort agentAnalysisAiPort) {
        return new AgentAnalysisUseCase(
                yahooStatementClient,
                financialDataPort,
                priceRepositoryPort,
                sentimentDataPort,
                marketCalendarPort,
                agentAnalysisAiPort);
    }

    @Bean
    public SmartReportUseCase smartReportUseCase(
            SmartReportScorePort smartReportScorePort,
            SmartReportMarketDataPort smartReportMarketDataPort) {
        return new SmartReportUseCase(smartReportScorePort, smartReportMarketDataPort);
    }
}
```

### Profile / Application Config Findings

- Found main config: `backend/src/main/resources/application.yml`
- Found test profile config at: `backend/src/test/resources/application-test.yml`
- Missing in main resources: `application.properties`, `application-dev.yml`, `application-prod.yml`, `application-test.yml`

#### `application.yml` (full content)

```yaml
spring:
  application:
    name: finance-project

  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5433}/${DB_NAME:financedb}
    username: ${DB_USERNAME:finance_user}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false
    open-in-view: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true

  data:
    mongodb:
      uri: ${MONGO_URI:mongodb://localhost:27017/financedb}
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}
      timeout: 2000ms

  cache:
    type: redis

server:
  port: 8080

# FastAPI data-service base URL (yfinance/Tiingo/Finnhub proxy)
data-service:
  base-url: ${DATA_SERVICE_URL:http://localhost:8000}

tiingo:
  api-key: ${TIINGO_API_KEY:}

finnhub:
  api-key: ${FINNHUB_API_KEY:}

agent-analysis:
  cache-ttl-minutes: 15

feign:
  client:
    config:
      default:
        logger-level: BASIC
  circuitbreaker:
    enabled: true

# Resilience4j Ã¢â‚¬â€ finnhubApi instance (30 req/s free tier limit)
resilience4j:
  ratelimiter:
    instances:
      finnhubApi:
        limitForPeriod: 30
        limitRefreshPeriod: 1s
        timeoutDuration: 5s
  retry:
    instances:
      finnhubApi:
        maxAttempts: 3
        waitDuration: 1s
        enableExponentialBackoff: true
        exponentialBackoffMultiplier: 2
        retryExceptions:
          - org.springframework.web.client.HttpClientErrorException$TooManyRequests
          - java.net.SocketTimeoutException
          - java.net.ConnectException
  circuitbreaker:
    instances:
      finnhubApi:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
        permittedNumberOfCallsInHalfOpenState: 3
  bulkhead:
    instances:
      finnhubApi:
        maxConcurrentCalls: 10

management:
  tracing:
    sampling:
      probability: 1.0
  endpoints:
    web:
      exposure:
        include: health,prometheus
  endpoint:
    prometheus:
      enabled: true
    health:
      show-details: always
  metrics:
    export:
      prometheus:
        enabled: true

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
  paths-to-match: /api/v1/**


logging:
  pattern:
    level: '%5p [requestId:%X{requestId:-none}]'
```

#### `application-test.yml` in test resources (full content)

```yaml
spring:
  datasource:
    url: jdbc:tc:postgresql:16-alpine:///finance_test
    username: test
    password: test
    driver-class-name: org.testcontainers.jdbc.ContainerDatabaseDriver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
    properties:
      hibernate:
        format_sql: true

# Resilience4j properties for testing Feign Client
resilience4j:
  ratelimiter:
    instances:
      finnhubApi:
        limitForPeriod: 5
        limitRefreshPeriod: 1s
        timeoutDuration: 0s
  circuitbreaker:
    instances:
      finnhubApi:
        registerHealthIndicator: true
        slidingWindowSize: 5
        minimumNumberOfCalls: 3
        permittedNumberOfCallsInHalfOpenState: 2
        waitDurationInOpenState: 10s
        failureRateThreshold: 50
```

## 2) Data-Service (Python/FastAPI)

- Main entry: `data-service/main.py`
- App directories: __pycache__, agents, models, providers, routers, services, trading_agents
- Dependency files: `requirements.txt` found, `pyproject.toml` missing

### `requirements.txt` (full content)

```txt
fastapi
uvicorn
yfinance
pandas
pandas-ta>=0.3.14b
scipy>=1.13.0
numpy>=1.26.0
finnhub-python==2.4.20
httpx==0.27.0
pytest>=8.2.0
pytest-asyncio>=0.23.7
httpx[test]
anthropic==0.28.0
python-dotenv>=1.0.1
redis>=5.0.0
tenacity>=8.3.0
PyPortfolioOpt>=1.5.5
cvxpy>=1.5.2
prometheus-fastapi-instrumentator==7.0.0
prometheus-client>=0.20.0
langchain-openai>=0.2.0
langchain-core>=0.3.0
```

### Files Using pandas

```txt
data-service\tests\test_analysis_endpoints.py:4:import pandas as pd
data-service\tests\test_technical_analysis_service.py:2:import pandas as pd
data-service\tests\test_portfolio_service.py:2:import pandas as pd
data-service\app\utils.py:7:import pandas as pd
data-service\app\routers\analysis.py:4:import pandas as pd
data-service\app\services\backtest_service.py:1:import pandas as pd
data-service\app\providers\yahoo_provider.py:20:import pandas as pd
data-service\app\services\factor_analysis_service.py:16:import pandas as pd
data-service\app\services\fundamental_analysis_service.py:9:import pandas as pd
data-service\app\services\pattern_detection_service.py:4:import pandas as pd
data-service\app\services\portfolio_analytics_service.py:14:import pandas as pd
data-service\app\services\portfolio_service.py:8:import pandas as pd
data-service\app\services\technical_analysis_service.py:3:import pandas as pd
data-service\external\TradingAgents\tests\test_market_data_validator.py:5:import pandas as pd
data-service\external\TradingAgents\tests\test_memory_log.py:4:import pandas as pd
data-service\external\TradingAgents\tests\test_no_data_handling.py:14:import pandas as pd
data-service\external\TradingAgents\tradingagents\dataflows\alpha_vantage_common.py:3:import pandas as pd
data-service\external\TradingAgents\tradingagents\dataflows\market_data_validator.py:15:import pandas as pd
data-service\external\TradingAgents\tradingagents\dataflows\stockstats_utils.py:4:import pandas as pd
data-service\external\TradingAgents\tradingagents\dataflows\utils.py:4:import pandas as pd
data-service\external\TradingAgents\tests\test_stockstats_date_column.py:9:import pandas as pd
data-service\external\TradingAgents\tradingagents\dataflows\y_finance.py:4:import pandas as pd
```

## 3) Frontend (React/TypeScript)

- Source directories under `frontend/src`: api, components, hooks, utils
- API folder: `frontend/src/api` (files: `client.ts`, `types.ts`)

### `package.json` scripts

```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.3.0",
    "axios": "^1.16.0",
    "lightweight-charts": "^5.2.0",
    "lucide-react": "^1.23.0",
    "motion": "^12.42.2",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.18.1",
    "recharts": "^3.9.0",
    "tailwindcss": "^4.3.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.12.3",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "typescript": "~6.0.2",
    "typescript-eslint": "^8.59.2",
    "vite": "^8.0.12"
  }
}
```

### TypeScript Configs

#### tsconfig.json
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

#### tsconfig.app.json
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "types": ["vite/client"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

#### tsconfig.node.json
```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "types": ["node"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    /* Linting */
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

### API Type Definition / Generation

- Current type definitions are handwritten in `frontend/src/api/types.ts` and additional interfaces in `frontend/src/api/client.ts`.
- No OpenAPI codegen script/config found in `frontend/package.json` scripts.
- Repository contains OpenAPI spec at `docs/openapi.yaml`, but no frontend generator pipeline/config file detected in `frontend/`.

## 4) Common Infrastructure

- Docker compose files found:
  - data-service\external\TradingAgents\docker-compose.yml
  - docker-compose.yml
- Root compose content (`docker-compose.yml`):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: finance_postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-financedb}
      POSTGRES_USER: ${DB_USERNAME:-finance_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD must be set in .env}
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U ${DB_USERNAME:-finance_user} -d ${DB_NAME:-financedb}" ]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: finance_redis
    ports:
      - "6379:6379"
    healthcheck:
      test: [ "CMD", "redis-cli", "ping" ]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    restart: unless-stopped

  data-service:
    build:
      context: ./data-service
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/providers', timeout=5).read()"]
      interval: 30s
      timeout: 5s
      retries: 3
    networks:
      - app-network
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v2.52.0
    container_name: finance_prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - app-network
    restart: unless-stopped

  grafana:
    image: grafana/grafana:11.0.0
    container_name: finance_grafana
    ports:
      - "3000:3000"
    networks:
      - app-network
    restart: unless-stopped

  mongodb:
    image: mongo:7-jammy
    container_name: finance_mongodb
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - app-network
    restart: unless-stopped

volumes:
  postgres_data:
  mongodb_data:

networks:
  app-network:
    driver: bridge
```

- CI/CD definitions found in `.github/workflows`:
  - backend.yml
  - ci.yml
  - data-service.yml
  - frontend.yml

### `ci.yml` (full content)
```yaml
name: ci

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  backend-ci:
    name: backend-ci
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Java 17
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '17'

      - name: Cache Maven dependencies
        uses: actions/cache@v4
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-maven-${{ hashFiles('backend/pom.xml') }}
          restore-keys: |
            ${{ runner.os }}-maven-

      - name: Run backend tests
        working-directory: backend
        run: |
          chmod +x ./mvnw
          ./mvnw test -B --no-transfer-progress

      - name: Upload backend test reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: backend-surefire-reports
          path: backend/target/surefire-reports/
          if-no-files-found: warn

  data-service-ci:
    name: data-service-ci
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: pip
          cache-dependency-path: data-service/requirements.txt

      - name: Install data-service dependencies
        working-directory: data-service
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run data-service tests
        working-directory: data-service
        run: python -m pytest --tb=short -q --junitxml=pytest-results.xml

      - name: Upload data-service test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: data-service-pytest-results
          path: data-service/pytest-results.xml
          if-no-files-found: warn

  frontend-ci:
    name: frontend-ci
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install frontend dependencies
        working-directory: frontend
        run: npm ci

      - name: Run frontend lint
        working-directory: frontend
        run: npm run lint

      - name: Build frontend
        working-directory: frontend
        run: npm run build

      - name: Upload frontend build artifact
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: frontend-dist
          path: frontend/dist/
          if-no-files-found: warn

  docker-compose:
    name: Docker Compose Config
    runs-on: ubuntu-latest
    env:
      DB_PASSWORD: finance_password

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create .env for compose validation
        run: |
          cp .env.example .env
          sed -i 's/^DB_PASSWORD=.*/DB_PASSWORD=finance_password/' .env

      - name: Validate compose file
        run: docker compose config --quiet

  all-checks-passed:
    name: All checks passed
    runs-on: ubuntu-latest
    needs:
      - backend-ci
      - data-service-ci
      - frontend-ci
      - docker-compose
    if: always()

    steps:
      - name: Verify required checks
        run: |
          if [ "${{ needs.backend-ci.result }}" != "success" ]; then
            echo "backend-ci failed or was cancelled"
            exit 1
          fi
          if [ "${{ needs.data-service-ci.result }}" != "success" ]; then
            echo "data-service-ci failed or was cancelled"
            exit 1
          fi
          if [ "${{ needs.frontend-ci.result }}" != "success" ]; then
            echo "frontend-ci failed or was cancelled"
            exit 1
          fi
          if [ "${{ needs.docker-compose.result }}" != "success" ]; then
            echo "docker-compose failed or was cancelled"
            exit 1
          fi
          echo "All checks passed"
```

- Jenkinsfile: missing at repository root (`Jenkinsfile`)
- `.env.example` files found:
  - .env.example
  - data-service\external\TradingAgents\.env.example
