#!/usr/bin/env python3
"""
Unified MQTT Handler

Centralized MQTT client management for the entire Hydros system.
Handles real-time sensor observations, configuration publishing, and system status.
"""

import asyncio
import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

try:
    import paho.mqtt.client as mqtt
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

from .protocol_registry import BaseProtocolHandler, ProtocolCapability


class MQTTMessageType(Enum):
    """MQTT message types supported by the unified handler"""
    
    OBSERVATION = "observation"           # Real-time sensor data
    CONFIGURATION = "configuration"      # Site/template configurations
    STATUS = "status"                    # System health and status
    CONTROL = "control"                  # Control commands (future)
    ALARM = "alarm"                      # System alarms and alerts


@dataclass
class MQTTMessage:
    """Standardized MQTT message structure"""
    
    message_type: MQTTMessageType
    topic: str
    payload: Dict[str, Any]
    qos: int = 0
    retain: bool = False
    timestamp: Optional[str] = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now(timezone.utc).isoformat()


class MQTTHandler(BaseProtocolHandler):
    """
    Unified MQTT handler for all system components.
    
    Provides centralized MQTT connection management, message publishing,
    and future subscription capabilities for the entire Hydros system.
    """
    
    def __init__(self, site_id: str, gateway_config_file: Optional[str] = None):
        self.site_id = site_id
        self.gateway_config_file = gateway_config_file
        
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # MQTT configuration
        self.mqtt_host = "localhost"
        self.mqtt_port = 1883
        self.client_id = f"hydros-system-{site_id}"
        self.keepalive = 60
        
        # MQTT client and connection state
        self.mqtt_client: Optional[mqtt.Client] = None
        self.connected = False
        self.connection_attempts = 0
        self.max_connection_attempts = 5
        
        # Message statistics
        self.stats = {
            "messages_published": 0,
            "messages_failed": 0,
            "connection_count": 0,
            "last_connection": None,
            "last_disconnect": None
        }
        
        # Async support
        self._publish_queue = asyncio.Queue()
        self._publisher_task: Optional[asyncio.Task] = None
        
        # Load MQTT configuration
        self._load_mqtt_config()
        
        self.logger.info(f"Initialized MQTT handler for site {site_id}")
    
    def _load_mqtt_config(self):
        """Load MQTT configuration from gateway config file"""
        if not self.gateway_config_file or not YAML_AVAILABLE:
            self.logger.info("Using default MQTT configuration")
            return
        
        try:
            with open(self.gateway_config_file, 'r') as f:
                gateway_config = yaml.safe_load(f)
                mqtt_config = gateway_config.get('mqtt', {})
                
                # Parse host with environment variable support
                mqtt_host_raw = mqtt_config.get('host', 'localhost')
                if mqtt_host_raw.startswith('${') and mqtt_host_raw.endswith('}'):
                    env_var_part = mqtt_host_raw[2:-1]  # Remove ${ and }
                    if ':' in env_var_part:
                        env_var, default_value = env_var_part.split(':', 1)
                        self.mqtt_host = os.getenv(env_var, default_value)
                    else:
                        self.mqtt_host = os.getenv(env_var_part, 'localhost')
                else:
                    self.mqtt_host = mqtt_host_raw
                
                # Parse port with environment variable support
                mqtt_port_raw = mqtt_config.get('port', 1883)
                if isinstance(mqtt_port_raw, str) and mqtt_port_raw.startswith('${') and mqtt_port_raw.endswith('}'):
                    env_var_part = mqtt_port_raw[2:-1]  # Remove ${ and }
                    if ':' in env_var_part:
                        env_var, default_value = env_var_part.split(':', 1)
                        self.mqtt_port = int(os.getenv(env_var, default_value))
                    else:
                        self.mqtt_port = int(os.getenv(env_var_part, '1883'))
                else:
                    self.mqtt_port = int(mqtt_port_raw)
                
                # Use client_id from config if available
                self.client_id = mqtt_config.get('client_id', self.client_id)
                
                self.logger.info(f"Loaded MQTT config: {self.mqtt_host}:{self.mqtt_port}")
                
        except Exception as e:
            self.logger.warning(f"Could not load MQTT config from {self.gateway_config_file}: {e}")
            self.logger.info(f"Using default MQTT configuration: {self.mqtt_host}:{self.mqtt_port}")
    
    def _setup_mqtt_client(self) -> bool:
        """Setup MQTT client with proper event handlers"""
        if not MQTT_AVAILABLE:
            self.logger.error("MQTT not available - paho-mqtt not installed")
            return False
        
        try:
            self.mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
            
            # Event handlers
            self.mqtt_client.on_connect = self._on_mqtt_connect
            self.mqtt_client.on_disconnect = self._on_mqtt_disconnect
            self.mqtt_client.on_publish = self._on_mqtt_publish
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to setup MQTT client: {e}")
            return False
    
    def _on_mqtt_connect(self, client, userdata, flags, rc, properties):
        """MQTT connection callback"""
        if rc == 0:
            self.connected = True
            self.connection_attempts = 0
            self.stats["connection_count"] += 1
            self.stats["last_connection"] = datetime.now(timezone.utc).isoformat()
            self.logger.info(f"Connected to MQTT broker at {self.mqtt_host}:{self.mqtt_port}")
        else:
            self.logger.error(f"Failed to connect to MQTT broker: {rc}")
    
    def _on_mqtt_disconnect(self, client, userdata, flags, rc, properties):
        """MQTT disconnection callback"""
        self.connected = False
        self.stats["last_disconnect"] = datetime.now(timezone.utc).isoformat()
        if rc != 0:
            self.logger.warning(f"Unexpected MQTT disconnection: {rc}")
        else:
            self.logger.info("Disconnected from MQTT broker")
    
    def _on_mqtt_publish(self, client, userdata, mid, reason_code, properties):
        """MQTT publish callback"""
        if reason_code == 0:
            self.stats["messages_published"] += 1
            self.logger.debug(f"Published message {mid}")
        else:
            self.stats["messages_failed"] += 1
            self.logger.warning(f"Failed to publish message {mid}: {reason_code}")
    
    async def connect(self) -> bool:
        """Connect to MQTT broker"""
        if not self._setup_mqtt_client():
            return False
        
        self.connection_attempts += 1
        if self.connection_attempts > self.max_connection_attempts:
            self.logger.error(f"Exceeded maximum connection attempts ({self.max_connection_attempts})")
            return False
        
        try:
            self.mqtt_client.connect(self.mqtt_host, self.mqtt_port, self.keepalive)
            self.mqtt_client.loop_start()
            
            # Wait for connection with timeout
            for _ in range(50):  # 5 second timeout
                if self.connected:
                    break
                await asyncio.sleep(0.1)
            
            if self.connected:
                # Start async publisher task
                self._publisher_task = asyncio.create_task(self._async_publisher_loop())
                return True
            else:
                self.logger.error("MQTT connection timeout")
                return False
                
        except Exception as e:
            self.logger.error(f"Failed to connect to MQTT broker: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from MQTT broker"""
        # Stop async publisher
        if self._publisher_task:
            self._publisher_task.cancel()
            try:
                await self._publisher_task
            except asyncio.CancelledError:
                pass
        
        # Disconnect MQTT client
        if self.mqtt_client and self.connected:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
            self.connected = False
            self.logger.info("Disconnected from MQTT broker")
    
    async def _async_publisher_loop(self):
        """Async loop for processing queued messages"""
        try:
            while True:
                try:
                    # Wait for messages with timeout to allow clean shutdown
                    message = await asyncio.wait_for(
                        self._publish_queue.get(), 
                        timeout=1.0
                    )
                    
                    if self.connected:
                        self._publish_sync(message)
                    else:
                        self.logger.warning(f"Cannot publish {message.topic} - not connected")
                        self.stats["messages_failed"] += 1
                    
                    self._publish_queue.task_done()
                    
                except asyncio.TimeoutError:
                    # No messages to process, continue
                    continue
                    
        except asyncio.CancelledError:
            self.logger.debug("Async publisher loop cancelled")
            raise
        except Exception as e:
            self.logger.error(f"Error in async publisher loop: {e}")
    
    def _publish_sync(self, message: MQTTMessage):
        """Synchronously publish message to MQTT"""
        try:
            payload = json.dumps(message.payload, indent=2 if message.message_type == MQTTMessageType.CONFIGURATION else None)
            result = self.mqtt_client.publish(message.topic, payload, qos=message.qos, retain=message.retain)
            
            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                self.logger.warning(f"Failed to publish to {message.topic}: {result.rc}")
                self.stats["messages_failed"] += 1
                
        except Exception as e:
            self.logger.error(f"Error publishing to {message.topic}: {e}")
            self.stats["messages_failed"] += 1
    
    async def publish_async(self, message: MQTTMessage) -> bool:
        """Asynchronously publish message to MQTT"""
        if not self.connected:
            self.logger.warning(f"Cannot publish {message.topic} - not connected")
            return False
        
        try:
            await self._publish_queue.put(message)
            return True
        except Exception as e:
            self.logger.error(f"Failed to queue message for {message.topic}: {e}")
            return False
    
    def publish_sync(self, message: MQTTMessage) -> bool:
        """Synchronously publish message to MQTT"""
        if not self.connected:
            self.logger.warning(f"Cannot publish {message.topic} - not connected")
            return False
        
        self._publish_sync(message)
        return True
    
    # Convenience methods for different message types
    
    async def publish_observation(self, site_id: str, asset_id: str, measurement: str, 
                                 observation_data: Dict[str, Any], qos: int = 0) -> bool:
        """Publish sensor observation data"""
        topic = f"wtp/{site_id}/{asset_id}/{measurement}/observation"
        message = MQTTMessage(
            message_type=MQTTMessageType.OBSERVATION,
            topic=topic,
            payload=observation_data,
            qos=qos,
            retain=False
        )
        return await self.publish_async(message)
    
    async def publish_configuration(self, config_type: str, config_data: Dict[str, Any], 
                                   site_id: Optional[str] = None, qos: int = 1) -> bool:
        """Publish configuration data"""
        if site_id:
            topic = f"wtp/{site_id}/configuration/{config_type}"
        else:
            topic = f"wtp/global/configuration/{config_type}"
        
        message = MQTTMessage(
            message_type=MQTTMessageType.CONFIGURATION,
            topic=topic,
            payload=config_data,
            qos=qos,
            retain=True
        )
        return await self.publish_async(message)
    
    async def publish_status(self, status_type: str, status_data: Dict[str, Any], 
                            site_id: Optional[str] = None, qos: int = 0) -> bool:
        """Publish system status data"""
        if site_id:
            topic = f"wtp/{site_id}/status/{status_type}"
        else:
            topic = f"wtp/global/status/{status_type}"
        
        message = MQTTMessage(
            message_type=MQTTMessageType.STATUS,
            topic=topic,
            payload=status_data,
            qos=qos,
            retain=False
        )
        return await self.publish_async(message)
    
    # BaseProtocolHandler interface implementation
    
    def read_parameter(self, parameter_id: str) -> Any:
        """Not applicable for MQTT - used for publishing only"""
        raise NotImplementedError("MQTT handler is publish-only")
    
    def write_parameter(self, parameter_id: str, value: Any) -> bool:
        """Not applicable for MQTT - used for publishing only"""
        raise NotImplementedError("MQTT handler is publish-only")
    
    def get_capabilities(self) -> list[ProtocolCapability]:
        """Get MQTT handler capabilities"""
        return [ProtocolCapability.PUBLISH, ProtocolCapability.CLIENT]
    
    def is_connected(self) -> bool:
        """Check if MQTT client is connected"""
        return self.connected
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get MQTT handler statistics"""
        return {
            "protocol": "mqtt",
            "connected": self.connected,
            "broker": f"{self.mqtt_host}:{self.mqtt_port}",
            "client_id": self.client_id,
            "messages_published": self.stats["messages_published"],
            "messages_failed": self.stats["messages_failed"],
            "connection_count": self.stats["connection_count"],
            "last_connection": self.stats["last_connection"],
            "last_disconnect": self.stats["last_disconnect"],
            "publish_queue_size": self._publish_queue.qsize() if self._publish_queue else 0
        }


# Convenience functions for standalone usage

async def create_mqtt_handler(site_id: str, gateway_config_file: Optional[str] = None) -> MQTTHandler:
    """Create and connect an MQTT handler"""
    handler = MQTTHandler(site_id, gateway_config_file)
    await handler.connect()
    return handler


async def publish_message(handler: MQTTHandler, topic: str, payload: Dict[str, Any], 
                         qos: int = 0, retain: bool = False) -> bool:
    """Publish a custom message using the handler"""
    message = MQTTMessage(
        message_type=MQTTMessageType.STATUS,  # Default type for custom messages
        topic=topic,
        payload=payload,
        qos=qos,
        retain=retain
    )
    return await handler.publish_async(message)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Hydros MQTT Handler Test")
    parser.add_argument("--site-id", default="wtp-porto-01", help="Site ID")
    parser.add_argument("--config-file", help="Gateway configuration file")
    parser.add_argument("--test-message", action="store_true", help="Send test message")
    
    args = parser.parse_args()
    
    logging.basicConfig(level=logging.INFO)
    
    async def main():
        handler = await create_mqtt_handler(args.site_id, args.config_file)
        
        if args.test_message:
            # Send test observation
            test_data = {
                "site_id": args.site_id,
                "asset_id": "test_sensor",
                "measurement": "temperature",
                "value": 23.5,
                "unit": "°C",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            success = await handler.publish_observation(
                args.site_id, "test_sensor", "temperature", test_data
            )
            
            print(f"Test message published: {success}")
        
        print("MQTT Handler Statistics:")
        print(json.dumps(handler.get_statistics(), indent=2))
        
        await handler.disconnect()
    
    asyncio.run(main())