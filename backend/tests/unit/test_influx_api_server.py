"""
Unit tests for InfluxAPIServer.

Exercised through aiohttp's test client against a stub query service, so the
tests cover routing, CORS, query-param clamping and the snapshot endpoint's
single-query contract rather than InfluxDB behaviour.
"""
import pytest
from aiohttp import web
from aiohttp.test_utils import TestClient, TestServer

from services.influx_api_server import InfluxAPIServer


class StubInfluxService:
    def __init__(self, observations=None):
        self.bucket = "telemetry"
        self.client = object()
        self.observations = observations or []
        self.observation_calls = []
        self.alert_calls = []

    async def query_latest_observations(self, site_id=None, lookback_seconds=120, limit=500):
        self.observation_calls.append((site_id, lookback_seconds, limit))
        return self.observations

    async def query_quality_alerts(self, site_id=None, lookback_seconds=300, limit=300):
        self.alert_calls.append((site_id, lookback_seconds, limit))
        return [{"id": "alert-1"}]

    @staticmethod
    def derive_quality_alerts(observations, limit=300):
        return [
            {"id": f"influx-{o['sensor_id']}"}
            for o in observations
            if o.get("quality") != "good"
        ][:limit]


def sample_observation(quality="good", sensor_id="level-01"):
    return {
        "site_id": "wtp-porto-01",
        "asset_id": "raw_intake",
        "sensor_id": sensor_id,
        "measurement": "level",
        "ts": "2026-01-01T00:00:00Z",
        "value": 5.5,
        "unit": "m",
        "quality": quality,
    }


@pytest.fixture
def stub():
    return StubInfluxService([sample_observation(), sample_observation("bad", "ph-01")])


@pytest.fixture
async def client(stub):
    server = InfluxAPIServer(stub, allowed_origin="https://dashboard.example")
    app = web.Application(middlewares=[server._error_middleware])
    app.router.add_get("/health", server._health)
    app.router.add_get("/api/influx/telemetry/latest", server._latest_telemetry)
    app.router.add_get("/api/influx/alerts/active", server._active_alerts)
    app.router.add_get("/api/influx/snapshot", server._snapshot)
    app.router.add_options("/{tail:.*}", server._handle_options)

    async with TestClient(TestServer(app)) as test_client:
        yield test_client


class TestHealth:
    async def test_reports_ok_when_connected(self, client):
        response = await client.get("/health")

        assert response.status == 200
        body = await response.json()
        assert body["status"] == "ok"
        assert body["bucket"] == "telemetry"

    async def test_reports_degraded_without_a_client(self, client, stub):
        stub.client = None

        body = await (await client.get("/health")).json()

        assert body["status"] == "degraded"


class TestCors:
    async def test_configured_origin_is_echoed(self, client):
        response = await client.get("/health")

        assert (
            response.headers["Access-Control-Allow-Origin"] == "https://dashboard.example"
        )

    async def test_preflight_returns_no_content(self, client):
        response = await client.options("/api/influx/snapshot")

        assert response.status == 204
        assert "Access-Control-Allow-Methods" in response.headers


class TestTelemetryEndpoint:
    async def test_returns_observations_with_count(self, client):
        body = await (await client.get("/api/influx/telemetry/latest")).json()

        assert body["count"] == 2
        assert len(body["observations"]) == 2

    async def test_passes_site_id_through(self, client, stub):
        await client.get("/api/influx/telemetry/latest?site_id=wtp-porto-01")

        assert stub.observation_calls[0][0] == "wtp-porto-01"

    async def test_non_numeric_params_fall_back_to_defaults(self, client, stub):
        response = await client.get(
            "/api/influx/telemetry/latest?lookback_seconds=abc&limit=xyz"
        )

        assert response.status == 200
        assert stub.observation_calls[0][1:] == (120, 500)

    async def test_negative_params_are_clamped(self, client, stub):
        await client.get("/api/influx/telemetry/latest?lookback_seconds=-10&limit=-5")

        assert stub.observation_calls[0][1:] == (1, 1)

    async def test_oversized_params_are_capped(self, client, stub):
        await client.get(
            "/api/influx/telemetry/latest?lookback_seconds=99999999&limit=99999999"
        )

        _, lookback, limit = stub.observation_calls[0]
        assert lookback == 86_400
        assert limit == 5_000


class TestAlertsEndpoint:
    async def test_returns_alerts(self, client):
        body = await (await client.get("/api/influx/alerts/active")).json()

        assert body["count"] == 1
        assert body["alerts"][0]["id"] == "alert-1"


class TestSnapshotEndpoint:
    async def test_returns_observations_and_derived_alerts(self, client):
        body = await (await client.get("/api/influx/snapshot")).json()

        assert body["count"] == 2
        assert [a["id"] for a in body["alerts"]] == ["influx-ph-01"]

    async def test_costs_a_single_observation_query(self, client, stub):
        """The whole point of /snapshot: one query serves both streams."""
        await client.get("/api/influx/snapshot")

        assert len(stub.observation_calls) == 1
        assert stub.alert_calls == []


class TestErrorHandling:
    async def test_handler_failure_returns_json_500_with_cors(self, client, stub):
        async def boom(*args, **kwargs):
            raise RuntimeError("influx exploded")

        stub.query_latest_observations = boom

        response = await client.get("/api/influx/snapshot")

        assert response.status == 500
        assert (await response.json())["error"] == "internal_error"
        assert "Access-Control-Allow-Origin" in response.headers
