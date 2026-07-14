from fastapi.testclient import TestClient

from main import app


def test_request_id_header_is_echoed_on_metrics_endpoint():
    client = TestClient(app)

    response = client.get("/metrics", headers={"X-Request-ID": "phase3-request"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "phase3-request"


def test_request_metrics_are_exported_for_bounded_route_labels():
    client = TestClient(app)

    response = client.get("/health/providers", headers={"X-Request-ID": "metrics-request"})

    assert response.status_code == 200

    metrics = client.get("/metrics").text
    request_counter = (
        'data_service_http_requests_total{method="GET",outcome="SUCCESS",'
        'route="/health/providers",status="200"}'
    )
    duration_counter = (
        'data_service_http_request_duration_seconds_count{method="GET",'
        'outcome="SUCCESS",route="/health/providers",status="200"}'
    )

    assert request_counter in metrics
    assert duration_counter in metrics
