from __future__ import annotations

from prometheus_client import Counter, Histogram


HTTP_REQUESTS_TOTAL = Counter(
    "data_service_http_requests_total",
    "Total data-service HTTP requests by method, route, status, and outcome",
    ["method", "route", "status", "outcome"],
)
HTTP_REQUEST_ERRORS_TOTAL = Counter(
    "data_service_http_request_errors_total",
    "Total unhandled data-service HTTP request errors by method and route",
    ["method", "route"],
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "data_service_http_request_duration_seconds",
    "Data-service HTTP request latency in seconds",
    ["method", "route", "status", "outcome"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30),
)


def route_label(request) -> str:
    route = request.scope.get("route")
    route_path = getattr(route, "path", None)
    if route_path:
        return route_path
    path = request.url.path
    if path.startswith("/health/provider/"):
        return "/health/provider/{provider}"
    if path.startswith("/api/v1/prices/"):
        return "/api/v1/prices/{symbol}"
    return "unmatched"


def outcome_label(status_code: int, failed: bool = False) -> str:
    if failed:
        return "ERROR"
    if status_code >= 500:
        return "SERVER_ERROR"
    if status_code >= 400:
        return "CLIENT_ERROR"
    if status_code >= 300:
        return "REDIRECTION"
    return "SUCCESS"
