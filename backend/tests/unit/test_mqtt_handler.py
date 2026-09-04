"""
Unit tests for MQTTHandler.

MQTTHandler is constructed as MQTTHandler(site_id, gateway_config_file=None)
and reads broker settings from the gateway YAML (with ${ENV:default} support).
Publishing is queue-based: publish_async() enqueues, the publisher task drains
onto paho's client. Tests drive the paho client through a mock.
"""
import asyncio
import json

import pytest
import yaml

from protocols.mqtt_handler import MQTTHandler, MQTTMessage, MQTTMessageType


@pytest.fixture
def handler():
    return MQTTHandler(site_id="test-site-01")


@pytest.fixture
def connected_handler(handler, mocker):
    """A handler wired to a mock paho client and marked connected."""
    handler.mqtt_client = mocker.MagicMock()
    handler.mqtt_client.publish.return_value = mocker.MagicMock(rc=0)
    handler.connected = True
    return handler


def gateway_config(tmp_path, mqtt_section) -> str:
    path = tmp_path / "gateway.yaml"
    path.write_text(yaml.dump({"mqtt": mqtt_section}))
    return str(path)


class TestMQTTHandlerInitialization:
    def test_defaults_when_no_gateway_config(self, handler):
        assert handler.site_id == "test-site-01"
        assert handler.mqtt_host == "localhost"
        assert handler.mqtt_port == 1883
        assert handler.client_id == "hydros-system-test-site-01"
        assert handler.connected is False

    def test_reads_broker_from_gateway_config(self, tmp_path):
        config = gateway_config(
            tmp_path, {"host": "mosquitto", "port": 8883, "client_id": "custom-id"}
        )

        handler = MQTTHandler("test-site-01", gateway_config_file=config)
        handler._load_mqtt_config()

        assert handler.mqtt_host == "mosquitto"
        assert handler.mqtt_port == 8883
        assert handler.client_id == "custom-id"

    def test_expands_env_placeholder_with_default(self, tmp_path, monkeypatch):
        monkeypatch.delenv("MQTT_HOST", raising=False)
        config = gateway_config(
            tmp_path, {"host": "${MQTT_HOST:fallback-broker}", "port": 1883}
        )

        handler = MQTTHandler("test-site-01", gateway_config_file=config)
        handler._load_mqtt_config()

        assert handler.mqtt_host == "fallback-broker"

    def test_env_placeholder_prefers_environment(self, tmp_path, monkeypatch):
        monkeypatch.setenv("MQTT_HOST", "env-broker")
        config = gateway_config(tmp_path, {"host": "${MQTT_HOST:fallback}", "port": 1883})

        handler = MQTTHandler("test-site-01", gateway_config_file=config)
        handler._load_mqtt_config()

        assert handler.mqtt_host == "env-broker"

    def test_unreadable_config_falls_back_to_defaults(self, tmp_path):
        handler = MQTTHandler(
            "test-site-01", gateway_config_file=str(tmp_path / "missing.yaml")
        )
        handler._load_mqtt_config()

        assert handler.mqtt_host == "localhost"
        assert handler.mqtt_port == 1883


class TestMQTTConnectionCallbacks:
    def test_successful_connect_callback_marks_connected(self, handler):
        handler._on_mqtt_connect(None, None, None, 0, None)

        assert handler.connected is True
        assert handler.stats["connection_count"] == 1
        assert handler.stats["last_connection"] is not None

    def test_failed_connect_callback_leaves_disconnected(self, handler):
        handler._on_mqtt_connect(None, None, None, 5, None)

        assert handler.connected is False
        assert handler.stats["connection_count"] == 0

    def test_disconnect_callback_clears_connected(self, handler):
        handler.connected = True

        handler._on_mqtt_disconnect(None, None, None, 0, None)

        assert handler.connected is False
        assert handler.stats["last_disconnect"] is not None

    @pytest.mark.asyncio
    async def test_disconnect_stops_client_loop(self, connected_handler):
        await connected_handler.disconnect()

        connected_handler.mqtt_client.loop_stop.assert_called_once()
        connected_handler.mqtt_client.disconnect.assert_called_once()
        assert connected_handler.connected is False

    @pytest.mark.asyncio
    async def test_disconnect_when_never_connected_is_safe(self, handler):
        await handler.disconnect()

        assert handler.connected is False

    @pytest.mark.asyncio
    async def test_connect_fails_after_max_attempts(self, handler, mocker):
        mocker.patch.object(handler, "_setup_mqtt_client", return_value=True)
        handler.mqtt_client = mocker.MagicMock()
        handler.connection_attempts = handler.max_connection_attempts

        assert await handler.connect() is False


class TestMQTTPublishing:
    @pytest.mark.asyncio
    async def test_publish_observation_builds_topic_and_queues(self, connected_handler):
        ok = await connected_handler.publish_observation(
            "test-site-01", "raw_intake", "level", {"value": 5.5, "unit": "m"}
        )

        assert ok is True
        queued = connected_handler._publish_queue.get_nowait()
        assert queued.topic == "wtp/test-site-01/raw_intake/level/observation"
        assert queued.message_type is MQTTMessageType.OBSERVATION
        assert queued.retain is False

    @pytest.mark.asyncio
    async def test_publish_configuration_is_retained_on_global_topic(
        self, connected_handler
    ):
        ok = await connected_handler.publish_configuration("templates", {"a": 1})

        assert ok is True
        queued = connected_handler._publish_queue.get_nowait()
        assert queued.topic == "wtp/global/configuration/templates"
        assert queued.retain is True
        assert queued.qos == 1

    @pytest.mark.asyncio
    async def test_publish_configuration_scoped_to_site(self, connected_handler):
        await connected_handler.publish_configuration(
            "plant", {"a": 1}, site_id="test-site-01"
        )

        queued = connected_handler._publish_queue.get_nowait()
        assert queued.topic == "wtp/test-site-01/configuration/plant"

    @pytest.mark.asyncio
    async def test_publish_status_topic(self, connected_handler):
        await connected_handler.publish_status("health", {"ok": True})

        queued = connected_handler._publish_queue.get_nowait()
        assert queued.topic == "wtp/global/status/health"

    @pytest.mark.asyncio
    async def test_publish_while_disconnected_is_refused(self, handler):
        ok = await handler.publish_observation("s", "a", "m", {"value": 1})

        assert ok is False
        assert handler._publish_queue.empty()

    def test_publish_sync_serializes_payload_to_paho(self, connected_handler):
        message = MQTTMessage(
            message_type=MQTTMessageType.OBSERVATION,
            topic="wtp/test/topic",
            payload={"value": 5.5},
        )

        assert connected_handler.publish_sync(message) is True

        topic, payload = connected_handler.mqtt_client.publish.call_args[0]
        assert topic == "wtp/test/topic"
        assert json.loads(payload) == {"value": 5.5}

    def test_publish_failure_is_counted(self, connected_handler, mocker):
        connected_handler.mqtt_client.publish.return_value = mocker.MagicMock(rc=1)
        message = MQTTMessage(
            message_type=MQTTMessageType.OBSERVATION,
            topic="wtp/test/topic",
            payload={"value": 5.5},
        )

        connected_handler.publish_sync(message)

        assert connected_handler.stats["messages_failed"] == 1


class TestMQTTStatistics:
    def test_statistics_expose_broker_and_counters(self, connected_handler):
        stats = connected_handler.get_statistics()

        assert stats["protocol"] == "mqtt"
        assert stats["connected"] is True
        assert stats["broker"] == "localhost:1883"
        assert stats["messages_published"] == 0
        assert stats["publish_queue_size"] == 0

    def test_publish_callback_increments_published_count(self, handler):
        handler._on_mqtt_publish(None, None, 1, 0, None)
        handler._on_mqtt_publish(None, None, 2, 0, None)

        assert handler.get_statistics()["messages_published"] == 2

    def test_publish_callback_increments_failed_count(self, handler):
        handler._on_mqtt_publish(None, None, 1, 1, None)

        assert handler.get_statistics()["messages_failed"] == 1

    def test_is_connected_reflects_state(self, handler):
        assert handler.is_connected() is False
        handler.connected = True
        assert handler.is_connected() is True


class TestUnsupportedOperations:
    def test_read_parameter_is_not_supported(self, handler):
        with pytest.raises(NotImplementedError):
            handler.read_parameter("raw_intake.level")

    def test_write_parameter_is_not_supported(self, handler):
        with pytest.raises(NotImplementedError):
            handler.write_parameter("raw_intake.level", 1.0)
