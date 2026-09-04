"""
Unit tests for InfluxDBQueryService.

The service builds Flux by string interpolation, so escaping and input
clamping are the security-relevant surface. Query execution is mocked: tests
cover query construction, record parsing, caching and alert derivation.
"""
import asyncio

import pytest

from services.influxdb_query_service import (
    MAX_LIMIT,
    MAX_LOOKBACK_SECONDS,
    InfluxDBQueryService,
    _coerce_float,
    clamp_int,
    escape_flux_string,
)


class FakeRecord:
    def __init__(self, values, time=None):
        self.values = values
        self._time = time

    def get_time(self):
        return self._time


class FakeTable:
    def __init__(self, records):
        self.records = records


@pytest.fixture
def service(mocker):
    svc = InfluxDBQueryService(
        url="http://influx:8086", token="t", org="hydros", bucket="telemetry"
    )
    svc.query_api = mocker.MagicMock()
    return svc


def observation_record(**overrides):
    values = {
        "site_id": "wtp-porto-01",
        "asset_id": "raw_intake",
        "sensor_id": "level-01",
        "_measurement": "level",
        "_field": "value",
        "_value": 5.5,
        "unit": "m",
        "quality": "good",
    }
    values.update(overrides)
    return FakeRecord(values)


class TestEscapeFluxString:
    def test_escapes_quotes_and_backslashes(self):
        assert escape_flux_string('a"b\\c') == 'a\\"b\\\\c'

    def test_neutralizes_predicate_injection(self):
        payload = 'x" or r["_measurement"] == "secret'

        escaped = escape_flux_string(payload)

        # No bare quote survives, so the value cannot close the string literal.
        assert '"' not in escaped.replace('\\"', "")

    def test_escapes_newlines(self):
        assert escape_flux_string("a\nb") == "a\\nb"

    def test_coerces_non_strings(self):
        assert escape_flux_string(42) == "42"


class TestClampInt:
    @pytest.mark.parametrize(
        "raw,expected",
        [("50", 50), ("0", 1), ("999999", 100), ("abc", 10), (None, 10), (-5, 1)],
    )
    def test_bounds_and_fallback(self, raw, expected):
        assert clamp_int(raw, default=10, minimum=1, maximum=100) == expected


class TestCoerceFloat:
    @pytest.mark.parametrize(
        "raw,expected", [("1.5", 1.5), (2, 2.0), ("bad", None), (None, None), (True, None)]
    )
    def test_numeric_coercion(self, raw, expected):
        assert _coerce_float(raw) == expected


class TestQueryLatestObservations:
    @pytest.mark.asyncio
    async def test_returns_empty_when_not_connected(self):
        svc = InfluxDBQueryService("u", "t", "o", "b")

        assert await svc.query_latest_observations() == []

    @pytest.mark.asyncio
    async def test_site_id_is_escaped_into_the_query(self, service):
        service.query_api.query.return_value = []

        await service.query_latest_observations(site_id='evil" or true or "')

        flux = service.query_api.query.call_args[0][0]
        assert 'evil\\" or true or \\"' in flux

    @pytest.mark.asyncio
    async def test_out_of_range_inputs_are_clamped(self, service):
        service.query_api.query.return_value = []

        await service.query_latest_observations(
            lookback_seconds=10**9, limit=10**9
        )

        flux = service.query_api.query.call_args[0][0]
        assert f"-{MAX_LOOKBACK_SECONDS}s" in flux

    @pytest.mark.asyncio
    async def test_parses_records_into_observation_shape(self, service):
        service.query_api.query.return_value = [FakeTable([observation_record()])]

        observations = await service.query_latest_observations()

        assert len(observations) == 1
        assert observations[0]["site_id"] == "wtp-porto-01"
        assert observations[0]["asset_id"] == "raw_intake"
        assert observations[0]["value"] == 5.5
        assert observations[0]["unit"] == "m"

    @pytest.mark.asyncio
    async def test_unknown_quality_falls_back_to_good(self, service):
        service.query_api.query.return_value = [
            FakeTable([observation_record(quality="weird")])
        ]

        observations = await service.query_latest_observations()

        assert observations[0]["quality"] == "good"

    @pytest.mark.asyncio
    async def test_non_numeric_value_drops_only_that_record(self, service):
        service.query_api.query.return_value = [
            FakeTable(
                [
                    observation_record(sensor_id="bad-01", _value="not-a-number"),
                    observation_record(sensor_id="good-01", _value=7.0),
                ]
            )
        ]

        observations = await service.query_latest_observations()

        assert [o["value"] for o in observations] == [7.0]

    @pytest.mark.asyncio
    async def test_query_failure_returns_empty_list(self, service):
        service.query_api.query.side_effect = RuntimeError("influx down")

        assert await service.query_latest_observations() == []

    @pytest.mark.asyncio
    async def test_results_are_cached_within_the_ttl(self, service):
        service.query_api.query.return_value = [FakeTable([observation_record()])]

        await service.query_latest_observations(site_id="wtp-porto-01")
        await service.query_latest_observations(site_id="wtp-porto-01")

        assert service.query_api.query.call_count == 1

    @pytest.mark.asyncio
    async def test_different_arguments_are_cached_separately(self, service):
        service.query_api.query.return_value = [FakeTable([observation_record()])]

        await service.query_latest_observations(site_id="a")
        await service.query_latest_observations(site_id="b")

        assert service.query_api.query.call_count == 2

    @pytest.mark.asyncio
    async def test_concurrent_callers_share_one_query(self, service):
        service.query_api.query.return_value = [FakeTable([observation_record()])]

        await asyncio.gather(
            *(service.query_latest_observations(site_id="a") for _ in range(5))
        )

        assert service.query_api.query.call_count == 1


class TestDeriveQualityAlerts:
    def test_good_quality_produces_no_alerts(self):
        observations = [
            {
                "site_id": "s",
                "asset_id": "a",
                "sensor_id": "x",
                "measurement": "level",
                "quality": "good",
                "ts": "2026-01-01T00:00:00Z",
                "value": 1.0,
            }
        ]

        assert InfluxDBQueryService.derive_quality_alerts(observations) == []

    @pytest.mark.parametrize(
        "quality,severity", [("uncertain", "warning"), ("bad", "critical")]
    )
    def test_quality_maps_to_severity(self, quality, severity):
        observations = [
            {
                "site_id": "s",
                "asset_id": "a",
                "sensor_id": "x",
                "measurement": "level",
                "quality": quality,
                "ts": "2026-01-01T00:00:00Z",
                "value": 1.0,
            }
        ]

        assert InfluxDBQueryService.derive_quality_alerts(observations)[0][
            "severity"
        ] == severity

    def test_redundant_sensors_get_distinct_alert_ids(self):
        """Two sensors on one asset measuring the same thing must not collide."""
        observations = [
            {
                "site_id": "s",
                "asset_id": "a",
                "sensor_id": sensor,
                "measurement": "level",
                "quality": "bad",
                "ts": "2026-01-01T00:00:00Z",
                "value": 1.0,
            }
            for sensor in ("level-01", "level-02")
        ]

        alerts = InfluxDBQueryService.derive_quality_alerts(observations)

        assert len({alert["id"] for alert in alerts}) == 2

    def test_alerts_are_newest_first_and_limited(self):
        observations = [
            {
                "site_id": "s",
                "asset_id": "a",
                "sensor_id": f"x{i}",
                "measurement": "level",
                "quality": "bad",
                "ts": f"2026-01-0{i}T00:00:00Z",
                "value": 1.0,
            }
            for i in range(1, 4)
        ]

        alerts = InfluxDBQueryService.derive_quality_alerts(observations, limit=2)

        assert len(alerts) == 2
        assert alerts[0]["timestamp"] > alerts[1]["timestamp"]


class TestDailyTotalFlow:
    @pytest.mark.asyncio
    async def test_malformed_date_is_rejected_before_querying(self, service):
        result = await service.query_daily_total_flow("s", date="2026-01-01) |> drop(")

        assert result == 0.0
        service.query_api.query.assert_not_called()

    @pytest.mark.asyncio
    async def test_wellformed_date_is_used(self, service):
        service.query_api.query.return_value = []

        await service.query_daily_total_flow("s", date="2026-01-01")

        assert "2026-01-01" in service.query_api.query.call_args[0][0]

    @pytest.mark.asyncio
    async def test_site_and_asset_are_escaped(self, service):
        service.query_api.query.return_value = []

        await service.query_current_flow_rate('s"x', asset_id='a"y')

        flux = service.query_api.query.call_args[0][0]
        assert 's\\"x' in flux and 'a\\"y' in flux
