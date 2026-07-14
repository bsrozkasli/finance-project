# Observability

This project exposes logs and Prometheus metrics for the backend and data-service.
Grafana is provisioned locally through Docker Compose.

## Request Correlation

- Incoming backend and data-service requests use `X-Request-ID`.
- If a request id is absent, each service creates one and echoes it in the response.
- Backend forwards the request id to data-service calls made through the shared `RestTemplate`.
- Logs should include request id context and must never include secrets, provider keys, authorization headers, or raw credentials.

## Backend Metrics

Backend metrics are exposed at `/actuator/prometheus`.

Application-level HTTP metrics:

- `finance_http_server_requests_total{method,route,status,outcome}`
- `finance_http_server_request_duration_seconds{method,route,status,outcome}`

Provider and cache metrics already emitted by adapters remain available, including:

- `provider_request_total{provider,operation,result}`
- `dataservice_request_latency_seconds{endpoint,result}`
- `agent.execution.time`

Routes use matched route patterns where available. Unknown paths are collapsed to
`unmatched` to avoid high-cardinality labels.

## Data-service Metrics

Data-service metrics are exposed at `/metrics`.

HTTP metrics:

- `data_service_http_requests_total{method,route,status,outcome}`
- `data_service_http_request_errors_total{method,route}`
- `data_service_http_request_duration_seconds{method,route,status,outcome}`

Provider resolver metrics:

- `market_provider_success_total{provider,operation}`
- `market_provider_empty_total{provider,operation}`
- `market_provider_error_total{provider,operation}`
- `market_provider_fallback_total{operation,from_provider,to_provider}`
- `market_provider_latency_seconds{provider,operation,result}`
- `market_provider_blacklisted{provider}`
- `market_provider_health_status{provider,status}`

Data-service route labels use FastAPI route templates where available and collapse
known dynamic fallback paths such as `/api/v1/prices/{symbol}`.

## Grafana

Docker Compose mounts Grafana provisioning from `infra/grafana`.

- Datasource: `Finance Prometheus`
- Dashboard: `Finance Observability`
- Local URL: `http://localhost:3000`

The dashboard includes backend request rate, backend p95 latency, data-service
request rate, data-service p95 latency, provider result rates, provider
blacklist state, and provider fallback rates.

## Local Verification

```powershell
docker compose config --quiet
docker compose up -d prometheus grafana data-service
```

Then check:

- Prometheus: `http://localhost:9090/targets`
- Grafana: `http://localhost:3000`
- Backend metrics: `http://localhost:8080/actuator/prometheus`
- Data-service metrics: `http://localhost:8000/metrics`
