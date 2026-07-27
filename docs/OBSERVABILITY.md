# Observability

This project exposes logs and Prometheus metrics for the backend, data-service,
PostgreSQL, Redis, Prometheus, and Grafana. Grafana is provisioned locally
through Docker Compose from `infra/grafana`.

## Request Correlation

- Incoming backend and data-service requests use `X-Request-ID`.
- If a request id is absent, each service creates one and echoes it in the response.
- Backend forwards the request id to data-service calls made through the shared `RestTemplate`.
- Logs should include request id context and must never include secrets, provider keys, authorization headers, or raw credentials.

## Prometheus Targets

Prometheus reads `prometheus.yml` and scrapes these jobs:

| Job | Target | Purpose |
|-----|--------|---------|
| `spring-backend` | `host.docker.internal:8080/actuator/prometheus` | Spring Boot, JVM, Hikari, HTTP, backend provider and agent metrics |
| `python-data-service` | `data-service:8000/metrics` | FastAPI HTTP, provider resolver, data-service agent metrics |
| `postgres` | `postgres-exporter:9187/metrics` | PostgreSQL health, connections, transactions, tuple activity |
| `redis` | `redis-exporter:9121/metrics` | Redis health, clients, command rate, memory |
| `prometheus` | `prometheus:9090/metrics` | Prometheus scrape health and self metrics |
| `grafana` | `grafana:3000/metrics` | Grafana HTTP and runtime metrics |

The database and Redis exporters are internal Docker-network services and do not
open additional host ports.

## Backend Metrics

Backend metrics are exposed at `/actuator/prometheus`.

Application-level HTTP metrics:

- `http_server_requests_seconds_*{method,uri,status}` from Spring/Micrometer.
- `finance_http_server_requests_total{method,route,status,outcome}` for stable route labels.
- `finance_http_server_request_duration_seconds_*{method,route,status,outcome}` with histogram buckets.

Provider, data-service, cache, and agent metrics include:

- `provider_request_total{provider,operation,result}`
- `dataservice_request_latency_seconds_*{endpoint,result}`
- `agent_analysis_success_total`
- `agent_analysis_failure_total`
- `agent_analysis_cache_total{result}`
- `agent_analysis_latency_seconds_*`
- `agent_execution_time_seconds_*`
- `agent_azure_tokens_total{type}`

Routes use matched route patterns where available. Unknown paths are collapsed to
`unmatched` to avoid high-cardinality labels.

## Data-service Metrics

Data-service metrics are exposed at `/metrics`.

HTTP metrics:

- `data_service_http_requests_total{method,route,status,outcome}`
- `data_service_http_request_errors_total{method,route}`
- `data_service_http_request_duration_seconds_*{method,route,status,outcome}`

Provider resolver metrics:

- `market_provider_success_total{provider,operation}`
- `market_provider_empty_total{provider,operation}`
- `market_provider_error_total{provider,operation}`
- `market_provider_fallback_total{operation,from_provider,to_provider}`
- `market_provider_latency_seconds_*{provider,operation,result}`
- `market_provider_blacklisted{provider}`
- `market_provider_health_status{provider,status}`

Agent metrics:

- `agent_analysis_latency_seconds_*`
- `agent_analysis_failures_total`
- `agent_azure_tokens_total`

Data-service route labels use FastAPI route templates where available and collapse
known dynamic fallback paths such as `/api/v1/prices/{symbol}`.

## Grafana

Docker Compose mounts Grafana provisioning from `infra/grafana`.

- Datasource: `Finance Prometheus` (`uid: finance-prometheus`)
- Dashboard: `Finance Observability`
- Local URL: `http://localhost:3000`

The dashboard includes these flow groups:

- Service target health for backend, data-service, PostgreSQL, Redis, Prometheus, and Grafana.
- Backend API throughput, p95 latency, and error rates by route/status.
- Data-service API throughput, p95 latency, and error rates by route/status.
- Backend outbound provider/data-service request rates and latency.
- Market provider success, error, empty, fallback, health, blacklist, and latency.
- Agent analysis success/failure, cache hit/miss, latency, and Azure token rate.
- PostgreSQL health, connections, transactions, and tuple activity.
- Redis health, connected clients, command rate, and memory usage.
- Prometheus scrape duration and Grafana HTTP request rate.

## Local Verification

```powershell
$env:DB_PASSWORD = 'local-password'
docker compose config --quiet
docker compose up -d postgres redis postgres-exporter redis-exporter data-service prometheus grafana
```

Then check:

- Prometheus targets: `http://localhost:9090/targets`
- Grafana dashboard: `http://localhost:3000`
- Backend metrics: `http://localhost:8080/actuator/prometheus`
- Data-service metrics: `http://localhost:8000/metrics`
