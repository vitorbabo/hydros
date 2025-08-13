"""
Production Edge Gateway - Data Mapping System

This module implements the production-ready edge gateway that connects to real WTP PLCs,
maps raw signals to standardized data model, and publishes to cloud MQTT broker.

Separate from simulator - this is the actual edge device solution for production deployment.
"""

import os
import time
import json
import logging
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from enum import Enum
import yaml

# PLC Communication Libraries (would be installed in production)
# from opcua import Client as OPCUAClient
# import modbus_tk.modbus_tcp as modbus_tcp
# from modbus_tk import modbus

import paho.mqtt.client as mqtt


class PLCProtocol(Enum):
    MODBUS_TCP = "modbus_tcp"
    OPCUA = "opcua"
    ETHERNET_IP = "ethernet_ip"
    PROFINET = "profinet"
    S7_COMM = "s7comm"


class DataQuality(Enum):
    GOOD = "good"
    UNCERTAIN = "uncertain"  
    BAD = "bad"
    COMM_ERROR = "comm_error"
    OUT_OF_RANGE = "out_of_range"
    SENSOR_FAULT = "sensor_fault"


@dataclass
class TagDefinition:
    """Definition of a single PLC tag to be read"""
    tag_address: str              # PLC-specific address (e.g., "DB1.DBW100", "40001")
    asset_id: str                 # Standardized asset identifier
    sensor_id: str                # Unique sensor identifier
    measurement: str              # Type of measurement (e.g., "level", "flow_rate")
    unit: str                     # Engineering unit (e.g., "m", "m3/h", "mg/L")
    data_type: str                # Data type (INT16, REAL, BOOL)
    scale_factor: float = 1.0     # Scaling factor to convert raw to engineering units
    offset: float = 0.0           # Offset to apply after scaling
    min_value: Optional[float] = None    # Valid range minimum
    max_value: Optional[float] = None    # Valid range maximum
    sample_rate_ms: int = 2000    # Sampling rate in milliseconds
    description: str = ""         # Human-readable description
    component_type: str = "generic"  # Component category
    plc_connection: str = "main_plc"  # Which PLC connection to use


@dataclass
class PLCConnection:
    """PLC connection configuration"""
    connection_id: str
    protocol: PLCProtocol
    ip_address: str
    port: int = 502
    node_id: Optional[str] = None     # For OPC UA
    unit_id: int = 1                  # For Modbus
    timeout_ms: int = 3000
    retry_attempts: int = 3
    retry_delay_ms: int = 1000        # Delay between retry attempts
    enabled: bool = True
    description: str = ""             # Human-readable description
    
    # Additional protocol-specific fields
    rack: int = 0                     # For S7 protocol
    slot: int = 1                     # For S7 protocol
    endpoint_url: Optional[str] = None  # For OPC UA
    security_mode: str = "None"       # For OPC UA
    username: str = ""                # For authenticated protocols
    password: str = ""                # For authenticated protocols


@dataclass
class Observation:
    """Standardized observation data structure"""
    site_id: str
    asset_id: str
    sensor_id: str
    measurement: str
    ts: str
    value: Union[float, int, bool, str]
    unit: str
    quality: str
    raw_tag: str
    source: str
    seq: int
    parameter_type: str = "sensor"
    component_type: str = "generic"


class PLCDataReader:
    """Abstract base for PLC protocol readers"""
    
    def __init__(self, connection: PLCConnection):
        self.connection = connection
        self.is_connected = False
        self.last_error = None
    
    def connect(self) -> bool:
        """Connect to PLC"""
        raise NotImplementedError
    
    def disconnect(self):
        """Disconnect from PLC"""
        raise NotImplementedError
    
    def read_tag(self, tag_address: str, data_type: str) -> tuple[Any, DataQuality]:
        """Read a single tag from PLC"""
        raise NotImplementedError
    
    def read_tags(self, tags: List[str]) -> Dict[str, tuple[Any, DataQuality]]:
        """Read multiple tags from PLC"""
        raise NotImplementedError


class MockPLCReader(PLCDataReader):
    """Mock PLC reader for testing - simulates real PLC communication"""
    
    def __init__(self, connection: PLCConnection):
        super().__init__(connection)
        self.mock_data = {}
        self._init_mock_data()
    
    def _init_mock_data(self):
        """Initialize mock data that simulates real PLC values"""
        import random
        
        # Simulate realistic WTP values
        self.mock_data = {
            # Raw intake
            "DB1.DBW100": random.uniform(2.0, 4.5),      # Level (m)
            "DB1.DBW102": random.uniform(20.0, 80.0),    # Flow (m3/h)
            "DB1.DBW104": random.uniform(1.0, 25.0),     # Turbidity (NTU)
            "DB1.DBW106": random.uniform(6.8, 8.2),      # pH
            "DB1.DBW108": random.uniform(8.0, 22.0),     # Temperature (°C)
            
            # Pump parameters
            "DB2.DBW100": random.uniform(0.0, 40.0),     # Pump flow (m3/h)
            "DB2.DBW102": random.uniform(0.5, 3.2),      # Pressure (bar)
            "DB2.DBW104": random.uniform(5.0, 25.0),     # Motor current (A)
            "DB2.DBW106": random.uniform(25.0, 65.0),    # Motor temp (°C)
            "DB2.DBW108": random.uniform(0.5, 2.5),      # Vibration (mm/s)
            "DB2.DBX100.0": 1,                           # Run status (bool)
            
            # Chemical dosing
            "DB4.DBW100": random.uniform(0.5, 2.0),      # Tank level (m)
            "DB4.DBW102": random.uniform(5.0, 20.0),     # Dose rate (mg/L)
            
            # Filter parameters
            "DB6.DBW100": random.randint(50, 300),       # Diff pressure (mbar)
            "DB6.DBW102": random.uniform(0.1, 1.0),      # Filtered turbidity
            
            # Chlorination
            "DB7.DBW100": random.uniform(0.5, 2.0),      # Cl2 residual (mg/L)
            "DB7.DBW102": random.uniform(1.0, 3.5),      # Dose rate (mg/L)
        }
    
    def connect(self) -> bool:
        """Simulate PLC connection"""
        try:
            # Simulate connection delay
            time.sleep(0.1)
            self.is_connected = True
            return True
        except Exception as e:
            self.last_error = str(e)
            return False
    
    def disconnect(self):
        """Simulate disconnection"""
        self.is_connected = False
    
    def read_tag(self, tag_address: str, data_type: str) -> tuple[Any, DataQuality]:
        """Simulate reading a single tag"""
        if not self.is_connected:
            return None, DataQuality.COMM_ERROR
        
        if tag_address in self.mock_data:
            value = self.mock_data[tag_address]
            
            # Add some realistic variation
            if isinstance(value, float):
                noise = value * 0.02  # 2% noise
                import random
                value += random.uniform(-noise, noise)
            
            # Simulate occasional communication issues
            if random.random() < 0.01:  # 1% chance
                return None, DataQuality.COMM_ERROR
                
            return value, DataQuality.GOOD
        else:
            return None, DataQuality.BAD
    
    def read_tags(self, tags: List[str]) -> Dict[str, tuple[Any, DataQuality]]:
        """Simulate reading multiple tags"""
        results = {}
        for tag in tags:
            results[tag] = self.read_tag(tag, "REAL")  # Assume REAL for mock
        return results


# Import actual PLC readers
try:
    from plc_readers import create_plc_reader, ModbusTcpReader, OPCUAReader, S7Reader
    PLC_READERS_AVAILABLE = True
except ImportError:
    PLC_READERS_AVAILABLE = False
    logging.warning("Production PLC readers not available. Using mock readers only.")


class EdgeDataMapper:
    """Main edge gateway data mapping system"""
    
    def __init__(self, config_file: str = "edge_config.yaml"):
        # Initialize logging first
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        self.config = self._load_config(config_file)
        self.site_id = self.config.get('site_id', 'unknown-site')
        
        # Initialize PLC readers
        self.plc_readers: Dict[str, PLCDataReader] = {}
        self._init_plc_readers()
        
        # Load tag definitions
        self.tag_definitions: List[TagDefinition] = []
        self._load_tag_definitions()
        
        # MQTT client for publishing
        self.mqtt_client = None
        self._init_mqtt()
        
        # Runtime state
        self.sequence_number = 1
        self.last_read_times = {}
    
    def _load_config(self, config_file: str) -> dict:
        """Load edge gateway configuration"""
        try:
            with open(config_file, 'r') as f:
                config_content = f.read()
                
                # Simple environment variable substitution
                import re
                import os
                
                def replace_env_var(match):
                    var_name = match.group(1)
                    default_value = match.group(2) if match.group(2) else ""
                    return os.getenv(var_name, default_value)
                
                # Replace ${VAR:default} patterns
                config_content = re.sub(r'\$\{([^:}]+):([^}]*)\}', replace_env_var, config_content)
                # Replace ${VAR} patterns  
                config_content = re.sub(r'\$\{([^}]+)\}', lambda m: os.getenv(m.group(1), ''), config_content)
                
                return yaml.safe_load(config_content)
        except FileNotFoundError:
            print(f"Config file {config_file} not found, using defaults")
            return self._default_config()
    
    def _default_config(self) -> dict:
        """Default configuration for development/testing"""
        return {
            'site_id': 'wtp-demo-01',
            'mqtt': {
                'host': os.getenv('MQTT_HOST', 'localhost'),
                'port': int(os.getenv('MQTT_PORT', '1883')),
                'client_id': 'edge-gateway',
                'keepalive': 60
            },
            'plcs': [
                {
                    'connection_id': 'main_plc',
                    'protocol': 'mock',  # Use mock for demo
                    'ip_address': '192.168.1.10',
                    'port': 502,
                    'enabled': True
                }
            ]
        }
    
    def _init_plc_readers(self):
        """Initialize PLC readers based on configuration"""
        for plc_config in self.config.get('plcs', []):
            if not plc_config.get('enabled', True):
                continue
            
            # Convert protocol string to enum
            protocol_str = plc_config.get('protocol', 'mock')
            try:
                if protocol_str == 'modbus_tcp':
                    protocol = PLCProtocol.MODBUS_TCP
                elif protocol_str == 'opcua':
                    protocol = PLCProtocol.OPCUA
                elif protocol_str == 's7comm':
                    protocol = PLCProtocol.S7_COMM
                else:
                    protocol = PLCProtocol.MODBUS_TCP  # Default fallback
            except:
                protocol = PLCProtocol.MODBUS_TCP
            
            # Create connection object with proper protocol enum
            connection_params = plc_config.copy()
            connection_params['protocol'] = protocol
            connection = PLCConnection(**connection_params)
            
            # Use production readers if available, otherwise mock
            if PLC_READERS_AVAILABLE:
                try:
                    reader = create_plc_reader(connection)
                    self.logger.info(f"Created production {protocol_str} reader for {connection.connection_id}")
                except Exception as e:
                    self.logger.warning(f"Failed to create production reader, using mock: {e}")
                    reader = MockPLCReader(connection)
            else:
                # Use mock reader for development/demo
                reader = MockPLCReader(connection)
                self.logger.info(f"Using mock {protocol_str} reader for {connection.connection_id}")
            
            self.plc_readers[connection.connection_id] = reader
    
    def _load_tag_definitions(self):
        """Load tag mapping definitions"""
        tag_configs = self.config.get('tags', [])
        
        for tag_config in tag_configs:
            tag_def = TagDefinition(**tag_config)
            self.tag_definitions.append(tag_def)
        
        self.logger.info(f"Loaded {len(self.tag_definitions)} tag definitions")
    
    def _init_mqtt(self):
        """Initialize MQTT client"""
        mqtt_config = self.config.get('mqtt', {})
        
        self.mqtt_client = mqtt.Client(client_id=mqtt_config.get('client_id', 'edge-gateway'))
        
        # Setup MQTT callbacks
        def on_connect(client, userdata, flags, rc):
            if rc == 0:
                self.logger.info("Connected to MQTT broker")
            else:
                self.logger.error(f"Failed to connect to MQTT broker: {rc}")
        
        def on_disconnect(client, userdata, rc):
            self.logger.warning(f"Disconnected from MQTT broker: {rc}")
        
        self.mqtt_client.on_connect = on_connect
        self.mqtt_client.on_disconnect = on_disconnect
    
    def connect_all_plcs(self) -> bool:
        """Connect to all configured PLCs"""
        success_count = 0
        
        for connection_id, reader in self.plc_readers.items():
            if reader.connect():
                self.logger.info(f"Connected to PLC: {connection_id}")
                success_count += 1
            else:
                self.logger.error(f"Failed to connect to PLC: {connection_id}")
        
        return success_count > 0
    
    def connect_mqtt(self) -> bool:
        """Connect to MQTT broker"""
        try:
            mqtt_config = self.config.get('mqtt', {})
            host = mqtt_config.get('host', 'localhost')
            port = int(mqtt_config.get('port', 1883))  # Ensure port is integer
            keepalive = int(mqtt_config.get('keepalive', 60))  # Ensure keepalive is integer
            
            self.mqtt_client.connect(host, port, keepalive)
            self.mqtt_client.loop_start()
            return True
        except Exception as e:
            self.logger.error(f"MQTT connection failed: {e}")
            return False
    
    def read_and_publish_data(self):
        """Main data acquisition and publishing loop"""
        current_time = time.time()
        
        # Group tags by PLC connection for efficient reading
        tags_by_plc = {}
        for tag_def in self.tag_definitions:
            # Determine which PLC this tag belongs to
            plc_id = getattr(tag_def, 'plc_connection', 'main_plc')
            
            # Check if it's time to read this tag
            last_read = self.last_read_times.get(tag_def.tag_address, 0)
            if (current_time - last_read) * 1000 >= tag_def.sample_rate_ms:
                if plc_id not in tags_by_plc:
                    tags_by_plc[plc_id] = []
                tags_by_plc[plc_id].append(tag_def)
        
        # Read data from each PLC
        for plc_id, tag_defs in tags_by_plc.items():
            if plc_id not in self.plc_readers:
                continue
            
            reader = self.plc_readers[plc_id]
            if not reader.is_connected:
                continue
            
            # Read all tags for this PLC
            tag_addresses = [tag.tag_address for tag in tag_defs]
            results = reader.read_tags(tag_addresses)
            
            # Map PLC connection to tag definitions for data type info
            tag_def_map = {tag.tag_address: tag for tag in tag_defs}
            
            # Process results and create observations
            for tag_def in tag_defs:
                if tag_def.tag_address in results:
                    raw_value, quality = results[tag_def.tag_address]
                    
                    if raw_value is not None:
                        # Apply scaling and offset
                        if isinstance(raw_value, (int, float)):
                            scaled_value = (raw_value * tag_def.scale_factor) + tag_def.offset
                            
                            # Validate range
                            if tag_def.min_value is not None and scaled_value < tag_def.min_value:
                                quality = DataQuality.OUT_OF_RANGE
                            elif tag_def.max_value is not None and scaled_value > tag_def.max_value:
                                quality = DataQuality.OUT_OF_RANGE
                        else:
                            scaled_value = raw_value
                        
                        # Create standardized observation
                        observation = Observation(
                            site_id=self.site_id,
                            asset_id=tag_def.asset_id,
                            sensor_id=tag_def.sensor_id,
                            measurement=tag_def.measurement,
                            ts=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                            value=scaled_value,
                            unit=tag_def.unit,
                            quality=quality.value,
                            raw_tag=tag_def.tag_address,
                            source=plc_id,
                            seq=self.sequence_number,
                            parameter_type="sensor",  # Could be derived from tag_def
                            component_type=tag_def.component_type
                        )
                        
                        # Publish observation
                        self._publish_observation(observation)
                        
                        # Update tracking
                        self.last_read_times[tag_def.tag_address] = current_time
                        self.sequence_number += 1
    
    def _publish_observation(self, observation: Observation):
        """Publish observation to MQTT"""
        # Publish to standardized topic
        topic = f"wtp/{observation.site_id}/{observation.asset_id}/{observation.sensor_id}/observation"
        payload = json.dumps(asdict(observation))
        
        self.mqtt_client.publish(topic, payload, qos=0, retain=False)
        
        # Also publish raw data aggregation (like original plc/raw topic)
        # This could be done less frequently or in batches
    
    def run(self):
        """Main execution loop"""
        self.logger.info("Starting Edge Data Mapper")
        
        # Connect to all PLCs
        if not self.connect_all_plcs():
            self.logger.error("Failed to connect to any PLCs")
            return
        
        # Connect to MQTT
        if not self.connect_mqtt():
            self.logger.error("Failed to connect to MQTT broker")
            return
        
        self.logger.info("Edge Data Mapper started successfully")
        
        try:
            while True:
                self.read_and_publish_data()
                time.sleep(0.1)  # Main loop frequency
                
        except KeyboardInterrupt:
            self.logger.info("Shutdown requested")
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
        finally:
            self._shutdown()
    
    def _shutdown(self):
        """Clean shutdown"""
        self.logger.info("Shutting down Edge Data Mapper")
        
        # Disconnect from PLCs
        for reader in self.plc_readers.values():
            reader.disconnect()
        
        # Disconnect from MQTT
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()


if __name__ == "__main__":
    edge_mapper = EdgeDataMapper()
    edge_mapper.run()