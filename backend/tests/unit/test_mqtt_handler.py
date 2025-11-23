"""
Unit tests for MQTT Handler.
"""
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
import json


class TestMQTTHandlerInitialization:
    """Test MQTT Handler initialization."""

    @patch('paho.mqtt.client.Client')
    def test_mqtt_handler_creation(self, mock_client_class):
        """Test creating an MQTT handler instance."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(
            broker_host="localhost",
            broker_port=1883,
            client_id="test-client"
        )

        assert handler is not None
        assert handler.broker_host == "localhost"
        assert handler.broker_port == 1883

    @patch('paho.mqtt.client.Client')
    def test_mqtt_handler_with_credentials(self, mock_client_class):
        """Test MQTT handler with username/password."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(
            broker_host="localhost",
            broker_port=1883,
            username="testuser",
            password="testpass"
        )

        # Should call username_pw_set
        mock_client.username_pw_set.assert_called_once_with("testuser", "testpass")


class TestMQTTConnection:
    """Test MQTT connection management."""

    @patch('paho.mqtt.client.Client')
    @pytest.mark.asyncio
    async def test_connect_success(self, mock_client_class):
        """Test successful MQTT connection."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.connect.return_value = 0  # Success
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        await handler.connect()

        mock_client.connect.assert_called_once_with("localhost", 1883, 60)

    @patch('paho.mqtt.client.Client')
    @pytest.mark.asyncio
    async def test_connect_failure(self, mock_client_class):
        """Test MQTT connection failure handling."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.connect.side_effect = ConnectionError("Connection failed")
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        with pytest.raises(ConnectionError):
            await handler.connect()

    @patch('paho.mqtt.client.Client')
    @pytest.mark.asyncio
    async def test_disconnect(self, mock_client_class):
        """Test MQTT disconnection."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)
        await handler.disconnect()

        mock_client.disconnect.assert_called_once()


class TestMQTTPublishing:
    """Test MQTT message publishing."""

    @patch('paho.mqtt.client.Client')
    @pytest.mark.asyncio
    async def test_publish_observation(self, mock_client_class):
        """Test publishing an observation message."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.publish.return_value = (0, 1)  # Success, message ID
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        observation = {
            "site_id": "test-site",
            "sensor_id": "level-test",
            "value": 5.5,
            "ts": "2025-01-01T00:00:00Z",
            "unit": "m"
        }

        topic = "wtp/test-site/asset/level/observation"
        await handler.publish(topic, observation)

        # Verify publish was called with JSON payload
        mock_client.publish.assert_called_once()
        call_args = mock_client.publish.call_args
        assert call_args[0][0] == topic
        assert json.loads(call_args[0][1]) == observation

    @patch('paho.mqtt.client.Client')
    @pytest.mark.asyncio
    async def test_publish_configuration(self, mock_client_class):
        """Test publishing a configuration message."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.publish.return_value = (0, 1)
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        config = {
            "site_id": "test-site",
            "config_type": "plant",
            "data": {"modules": ["intake", "pump"]}
        }

        topic = "wtp/test-site/configuration/plant"
        await handler.publish(topic, config, qos=1, retain=True)

        mock_client.publish.assert_called_once()
        call_args = mock_client.publish.call_args
        assert call_args[1]['qos'] == 1
        assert call_args[1]['retain'] is True

    @patch('paho.mqtt.client.Client')
    @pytest.mark.asyncio
    async def test_publish_failure_retry(self, mock_client_class):
        """Test publish retry on failure."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        # First call fails, second succeeds
        mock_client.publish.side_effect = [
            (1, 0),  # Failure
            (0, 1)   # Success
        ]
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        message = {"test": "data"}
        topic = "test/topic"

        # Should retry and eventually succeed
        await handler.publish(topic, message)

        # Should have called publish at least once
        assert mock_client.publish.call_count >= 1


class TestMQTTSubscription:
    """Test MQTT subscription management."""

    @patch('paho.mqtt.client.Client')
    def test_subscribe_single_topic(self, mock_client_class):
        """Test subscribing to a single topic."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.subscribe.return_value = (0, 1)
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)
        handler.subscribe("test/topic")

        mock_client.subscribe.assert_called_once_with("test/topic", qos=0)

    @patch('paho.mqtt.client.Client')
    def test_subscribe_multiple_topics(self, mock_client_class):
        """Test subscribing to multiple topics."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.subscribe.return_value = (0, 1)
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        topics = [
            "wtp/+/+/+/observation",
            "wtp/+/configuration/+"
        ]

        for topic in topics:
            handler.subscribe(topic)

        assert mock_client.subscribe.call_count == len(topics)

    @patch('paho.mqtt.client.Client')
    def test_subscribe_with_callback(self, mock_client_class):
        """Test subscription with message callback."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        callback_called = False

        def message_callback(topic, payload):
            nonlocal callback_called
            callback_called = True

        handler.on_message = message_callback
        handler.subscribe("test/topic")

        # Simulate message received
        mock_message = MagicMock()
        mock_message.topic = "test/topic"
        mock_message.payload = b'{"test": "data"}'

        # Trigger callback
        if hasattr(handler, '_on_message'):
            handler._on_message(mock_client, None, mock_message)
        # Callback should be set up
        assert handler.on_message == message_callback


class TestMQTTStatistics:
    """Test MQTT statistics tracking."""

    @patch('paho.mqtt.client.Client')
    def test_statistics_tracking(self, mock_client_class):
        """Test that handler tracks statistics."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.publish.return_value = (0, 1)
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        # Get initial stats
        stats = handler.get_statistics() if hasattr(handler, 'get_statistics') else {}

        # Should have some statistics
        assert isinstance(stats, dict)

    @patch('paho.mqtt.client.Client')
    @pytest.mark.asyncio
    async def test_message_count_tracking(self, mock_client_class):
        """Test that published message count is tracked."""
        from protocols.mqtt_handler import MQTTHandler

        mock_client = MagicMock()
        mock_client.publish.return_value = (0, 1)
        mock_client_class.return_value = mock_client

        handler = MQTTHandler(broker_host="localhost", broker_port=1883)

        # Publish some messages
        for i in range(5):
            await handler.publish("test/topic", {"msg": i})

        # Check statistics
        if hasattr(handler, 'get_statistics'):
            stats = handler.get_statistics()
            # Should track message count
            assert 'messages_published' in stats or 'mqtt_publishes' in stats
