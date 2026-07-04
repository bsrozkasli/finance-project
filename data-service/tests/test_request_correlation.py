from fastapi.testclient import TestClient

from main import app


def test_request_id_header_is_echoed_on_metrics_endpoint():
    client = TestClient(app)

    response = client.get("/metrics", headers={"X-Request-ID": "phase3-request"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "phase3-request"
