#!/usr/bin/env python3
"""
Edge Gateway

Edge gateway for reading from PLCs and other controllers and publishing to MQTT.
Connects to industrial protocols (Modbus, OPC UA, S7) and publishes
standardized observations to MQTT broker.
"""

import asyncio
import json
import logging
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict

try:
    import yaml

    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

try:
    import paho.mqtt.client as mqtt

    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

from core.digital_twin import DigitalTwin


class GatewayMode(Enum):
    """Edge gateway operation modes"""

    PRODUCTION = "production"  # Real PLC connections only
    DEVELOPMENT = "development"  # Simulated connections (for testing)


@dataclass
class PLCConnection:
    """PLC connection configuration"""

    plc_id: str
    protocol: str  # modbus, opcua, s7
    host: str
    port: int
    device_id: int = 1
    timeout: float = 5.0
    retry_count: int = 3
    enabled: bool = True


@dataclass
class Observation:
    """Standardized observation data structure for MQTT publishing"""

    site_id: str
    asset_id: str
    sensor_id: str
    measurement: str
    ts: str
    value: Any
    unit: str
    quality: str
    raw_tag: str
    source: str
    seq: int
    parameter_type: str = "sensor"
    component_type: str = "generic"


class EdgeGateway:
    """
    Production edge gateway for reading from PLCs and publishing to MQTT.

    Core responsibilities:
    - Connect to real PLCs (Modbus, OPC UA, S7)
    - Read data from configured protocol mappings
    - Publish standardized observations to MQTT broker
    - Handle connection failures and retries
    """

    def __init__(
        self, plant_model: DigitalTwin, mode: GatewayMode = GatewayMode.PRODUCTION
    ):
        self.plant_model = plant_model
        self.mode = mode

        self.logger = logging.getLogger(self.__class__.__name__)

        # Configuration
        self.site_id = "unknown-site"
        self.read_interval = 5.0  # seconds
        self.sequence_number = 1

        # PLC connections and mappings
        self.plc_connections: Dict[str, PLCConnection] = {}
        self.parameter_mappings: Dict[str, Dict] = {}  # param_id -> plc mapping info
        self.plc_readers: Dict[str, Any] = {}  # Protocol-specific readers

        # MQTT client
        self.mqtt_client = None
        self.mqtt_config = {
            "host": "localhost",
            "port": 1883,
            "client_id": "hydros-edge-gateway",
            "keepalive": 60,
        }

        # Runtime state
        self.running = False
        self.stats = {
            "total_reads": 0,
            "successful_reads": 0,
            "failed_reads": 0,
            "mqtt_publishes": 0,
            "last_read_cycle": 0.0,
        }

    def load_gateway_configuration(self, config_file: str):
        """Load edge gateway configuration"""
        if not YAML_AVAILABLE:
            raise ImportError("PyYAML required for configuration loading")

        try:
            with open(config_file, "r") as f:
                config_content = f.read()

            # Simple environment variable substitution
            import re
            import os

            def replace_env_var(match):
                var_name = match.group(1)
                default_value = (
                    match.group(2) if len(match.groups()) > 1 and match.group(2) else ""
                )
                return os.getenv(var_name, default_value)

            # Replace ${VAR:default} patterns
            config_content = re.sub(
                r"\$\{([^:}]+):([^}]*)\}", replace_env_var, config_content
            )
            # Replace ${VAR} patterns
            config_content = re.sub(
                r"\$\{([^}]+)\}", lambda m: os.getenv(m.group(1), ""), config_content
            )

            config = yaml.safe_load(config_content)

            # Load site ID
            self.site_id = config.get("site_id", "unknown-site")

            # Load MQTT configuration
            mqtt_cfg = config.get("mqtt", {})
            # Ensure port is integer
            if "port" in mqtt_cfg:
                mqtt_cfg["port"] = int(mqtt_cfg["port"])
            self.mqtt_config.update(mqtt_cfg)

            # Load PLC connections (handle both 'plc_connections' and 'plcs' formats)
            plc_configs = config.get("plc_connections", config.get("plcs", []))
            for plc_config in plc_configs:
                # Handle different field names
                plc_id = plc_config.get(
                    "plc_id", plc_config.get("connection_id", "unknown")
                )
                protocol = plc_config.get("protocol", "modbus")
                host = plc_config.get("host", plc_config.get("ip_address", "localhost"))
                port = plc_config.get("port", 502)
                device_id = plc_config.get("device_id", plc_config.get("unit_id", 1))

                plc_conn = PLCConnection(
                    plc_id=plc_id,
                    protocol=protocol,
                    host=host,
                    port=port,
                    device_id=device_id,
                    enabled=plc_config.get("enabled", True),
                )
                self.plc_connections[plc_conn.plc_id] = plc_conn

            # Load parameter mappings (handle both formats)
            if "parameter_mappings" in config:
                self.parameter_mappings = config["parameter_mappings"]
            elif "tags" in config:
                # Convert tags list to parameter mappings dict
                for tag in config["tags"]:
                    param_id = tag.get(
                        "sensor_id",
                        f"{tag.get('asset_id', 'unknown')}_{tag.get('measurement', 'param')}",
                    )
                    self.parameter_mappings[param_id] = {
                        "plc_id": tag.get("plc_connection", "main_plc"),
                        "address": tag.get("tag_address", ""),
                        "asset_id": tag.get("asset_id", "unknown"),
                        "sensor_id": tag.get("sensor_id", param_id),
                        "measurement": tag.get("measurement", "unknown"),
                        "unit": tag.get("unit", ""),
                        "data_type": tag.get("data_type", "REAL"),
                        "scale_factor": tag.get("scale_factor", 1.0),
                        "offset": tag.get("offset", 0.0),
                        "parameter_type": tag.get("component_type", "sensor"),
                        "component_type": tag.get("component_type", "generic"),
                    }
            else:
                self.parameter_mappings = {}

            self.logger.info(
                f"Loaded gateway config: site={self.site_id}, "
                f"{len(self.plc_connections)} PLCs, {len(self.parameter_mappings)} parameters"
            )

        except Exception as e:
            self.logger.error(f"Failed to load gateway configuration: {e}")
            raise

    def initialize_mqtt(self):
        """Initialize MQTT client"""
        if not MQTT_AVAILABLE:
            self.logger.warning("paho-mqtt not available, MQTT publishing disabled")
            return False

        try:
            self.mqtt_client = mqtt.Client(client_id=self.mqtt_config["client_id"])

            def on_connect(client, userdata, flags, rc):
                if rc == 0:
                    self.logger.info(
                        f"Connected to MQTT broker {self.mqtt_config['host']}"
                    )
                else:
                    self.logger.error(f"MQTT connection failed: {rc}")

            def on_disconnect(client, userdata, rc):
                self.logger.warning(f"Disconnected from MQTT broker: {rc}")

            self.mqtt_client.on_connect = on_connect
            self.mqtt_client.on_disconnect = on_disconnect

            # Connect to MQTT broker
            self.mqtt_client.connect(
                self.mqtt_config["host"],
                self.mqtt_config["port"],
                self.mqtt_config["keepalive"],
            )
            self.mqtt_client.loop_start()
            return True

        except Exception as e:
            self.logger.error(f"Failed to initialize MQTT: {e}")
            return False

    async def initialize_plc_readers(self):
        """Initialize PLC readers using the plc_readers module"""
        try:
            from .data_mapper import PLCConnection as ReaderPLCConnection
            from .data_mapper import PLCProtocol
            from .plc_readers import create_plc_reader

            for plc_id, plc_conn in self.plc_connections.items():
                if not plc_conn.enabled:
                    continue

                # Convert to data_mapper PLCConnection format
                protocol_map = {
                    "modbus": PLCProtocol.MODBUS_TCP,
                    "modbus_tcp": PLCProtocol.MODBUS_TCP,
                    "opcua": PLCProtocol.OPCUA,
                    "s7": PLCProtocol.S7_COMM,
                }

                reader_conn = ReaderPLCConnection(
                    connection_id=plc_id,
                    ip_address=plc_conn.host,  # map host to ip_address
                    port=plc_conn.port,
                    protocol=protocol_map.get(
                        plc_conn.protocol, PLCProtocol.MODBUS_TCP
                    ),
                    unit_id=plc_conn.device_id,
                    timeout_ms=int(plc_conn.timeout * 1000),
                    retry_attempts=plc_conn.retry_count,
                    enabled=plc_conn.enabled,
                )

                reader = create_plc_reader(reader_conn)
                # Connect using async client only
                if hasattr(reader, "connect_async"):
                    try:
                        await reader.connect_async()
                        self.plc_readers[plc_id] = reader
                        self.logger.info(
                            f"Connected PLC reader: {plc_id} ({plc_conn.protocol})"
                        )
                    except Exception as e:
                        self.logger.error(
                            f"Failed to connect async client for {plc_id}: {e}"
                        )
                else:
                    self.logger.error(
                        f"Async client not available for PLC reader: {plc_id}"
                    )

        except ImportError:
            self.logger.error("PLC readers not available - cannot connect to real PLCs")
            raise

    async def read_plc_data(self) -> Dict[str, Any]:
        """Read data from all connected PLCs (async)"""
        start_time = time.perf_counter()
        all_data = {}

        for param_id, mapping in self.parameter_mappings.items():
            plc_id = mapping.get("plc_id")
            address = mapping.get("address")

            if plc_id not in self.plc_readers:
                self.logger.warning(
                    f"PLC {plc_id} not available for parameter {param_id}"
                )
                continue

            reader = self.plc_readers[plc_id]
            try:
                value, quality = await reader.read_tag_async(
                    address, mapping.get("data_type", "REAL")
                )
                if value is not None and quality.value == "good":
                    # Apply scaling
                    scale = mapping.get("scale_factor", 1.0)
                    offset = mapping.get("offset", 0.0)
                    scaled_value = (value * scale) + offset
                    all_data[param_id] = scaled_value
                else:
                    self.logger.warning(f"Bad quality read for {param_id}: {quality}")
            except Exception as e:
                self.logger.warning(f"Error reading {param_id} from {plc_id}: {e}")

        self.stats["total_reads"] += 1
        self.stats["last_read_cycle"] = time.perf_counter() - start_time

        return all_data

    def publish_to_mqtt(self, parameter_data: Dict[str, Any]):
        """Publish parameter data to MQTT as standardized observations"""
        if not self.mqtt_client:
            self.logger.warning("MQTT client not available")
            return

        timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        for param_id, value in parameter_data.items():
            mapping = self.parameter_mappings.get(param_id, {})

            # Create standardized observation
            observation = Observation(
                site_id=self.site_id,
                asset_id=mapping.get("asset_id", "unknown"),
                sensor_id=mapping.get("sensor_id", param_id),
                measurement=mapping.get("measurement", "unknown"),
                ts=timestamp,
                value=value,
                unit=mapping.get("unit", ""),
                quality="good",
                raw_tag=mapping.get("address", ""),
                source=mapping.get("plc_id", "gateway"),
                seq=self.sequence_number,
                parameter_type=mapping.get("parameter_type", "sensor"),
                component_type=mapping.get("component_type", "generic"),
            )

            # Publish to standardized MQTT topic
            topic = f"wtp/{observation.site_id}/{observation.asset_id}/{observation.measurement}/observation"
            payload = json.dumps(asdict(observation))

            try:
                self.mqtt_client.publish(topic, payload, qos=0)
                self.stats["mqtt_publishes"] += 1
            except Exception as e:
                self.logger.warning(f"Failed to publish {param_id} to MQTT: {e}")

        self.sequence_number += 1

    async def run_gateway_loop(self):
        """Main gateway loop - read from PLCs and publish to MQTT"""
        self.logger.info(f"Starting gateway loop in {self.mode.value} mode")

        while self.running:
            try:
                # Read data from real PLCs only
                parameter_data = await self.read_plc_data()

                if parameter_data:
                    # Update plant model with proper parameter ID format
                    for param_id, value in parameter_data.items():
                        mapping = self.parameter_mappings.get(param_id, {})
                        # Convert sensor_id to component.parameter format for DigitalTwin
                        asset_id = mapping.get("asset_id", "unknown")
                        measurement = mapping.get("measurement", "unknown")
                        # Include site_id to match SimulationEngine component registration format
                        plant_param_id = f"{self.site_id}.{asset_id}.{measurement}"
                        self.plant_model.set_parameter_value(plant_param_id, value)

                    # Publish to MQTT
                    self.publish_to_mqtt(parameter_data)

                    self.stats["successful_reads"] += 1
                    self.logger.debug(
                        f"Read and published {len(parameter_data)} parameters"
                    )
                else:
                    self.stats["failed_reads"] += 1
                    self.logger.warning("No data read from PLCs")

                # Log stats periodically
                if self.stats["total_reads"] % 30 == 0:  # Every 30 cycles (~1 minute)
                    self._log_stats()

                # Wait for next cycle
                await asyncio.sleep(self.read_interval)

            except Exception as e:
                self.logger.error(f"Error in gateway loop: {e}")
                self.stats["failed_reads"] += 1
                await asyncio.sleep(1.0)

    def _log_stats(self):
        """Log gateway statistics"""
        success_rate = 0
        if self.stats["total_reads"] > 0:
            success_rate = (
                self.stats["successful_reads"] / self.stats["total_reads"]
            ) * 100

        self.logger.info(
            f"Gateway stats: {self.stats['total_reads']} reads, "
            f"{success_rate:.1f}% success, {self.stats['mqtt_publishes']} MQTT publishes"
        )

    async def start(self):
        """Start the edge gateway"""
        try:
            self.logger.info("Starting edge gateway")

            # Initialize MQTT
            if not self.initialize_mqtt():
                raise Exception("Failed to initialize MQTT")

            # Initialize PLC readers
            await self.initialize_plc_readers()

            if not self.plc_readers:
                raise Exception("No PLC readers connected")

            # Allow connections to establish
            await asyncio.sleep(2.0)

            # Start main loop
            self.running = True
            await self.run_gateway_loop()

        except Exception as e:
            self.logger.error(f"Failed to start edge gateway: {e}")
            raise

    def stop(self):
        """Stop the edge gateway"""
        self.logger.info("Stopping edge gateway")
        self.running = False

        # Disconnect PLC readers
        for plc_id, reader in self.plc_readers.items():
            try:
                reader.disconnect()
                self.logger.info(f"Disconnected PLC reader: {plc_id}")
            except Exception as e:
                self.logger.warning(f"Error disconnecting PLC {plc_id}: {e}")

        # Disconnect MQTT
        if self.mqtt_client:
            try:
                self.mqtt_client.loop_stop()
                self.mqtt_client.disconnect()
                self.logger.info("Disconnected from MQTT broker")
            except Exception as e:
                self.logger.warning(f"Error disconnecting MQTT: {e}")

        self._log_stats()

    def get_stats(self) -> Dict[str, Any]:
        """Get current gateway statistics"""
        return self.stats.copy()

    def get_connection_status(self) -> Dict[str, Dict]:
        """Get status of all PLC connections"""
        status = {}

        for plc_id, plc_conn in self.plc_connections.items():
            reader = self.plc_readers.get(plc_id)
            is_connected = reader.is_connected if reader else False

            status[plc_id] = {
                "protocol": plc_conn.protocol,
                "host": plc_conn.host,
                "port": plc_conn.port,
                "connected": is_connected,
                "enabled": plc_conn.enabled,
            }

        return status
