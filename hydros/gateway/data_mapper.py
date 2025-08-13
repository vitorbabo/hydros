"""
Data Mapping System - Data Structures and Base Classes

This module contains the data structures and base classes used by the
edge gateway for PLC communication and data mapping.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


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

    tag_address: str  # PLC-specific address (e.g., "DB1.DBW100", "40001")
    asset_id: str  # Standardized asset identifier
    sensor_id: str  # Unique sensor identifier
    measurement: str  # Type of measurement (e.g., "level", "flow_rate")
    unit: str  # Engineering unit (e.g., "m", "m3/h", "mg/L")
    data_type: str  # Data type (INT16, REAL, BOOL)
    scale_factor: float = 1.0  # Scaling factor to convert raw to engineering units
    offset: float = 0.0  # Offset to apply after scaling
    min_value: Optional[float] = None  # Valid range minimum
    max_value: Optional[float] = None  # Valid range maximum
    sample_rate_ms: int = 2000  # Sampling rate in milliseconds
    description: str = ""  # Human-readable description
    component_type: str = "generic"  # Component category
    plc_connection: str = "main_plc"  # Which PLC connection to use


@dataclass
class PLCConnection:
    """PLC connection configuration"""

    connection_id: str
    protocol: PLCProtocol
    ip_address: str
    port: int = 502
    node_id: Optional[str] = None  # For OPC UA
    unit_id: int = 1  # For Modbus
    timeout_ms: int = 3000
    retry_attempts: int = 3
    retry_delay_ms: int = 1000  # Delay between retry attempts
    enabled: bool = True
    description: str = ""  # Human-readable description

    # Additional protocol-specific fields
    rack: int = 0  # For S7 protocol
    slot: int = 1  # For S7 protocol
    endpoint_url: Optional[str] = None  # For OPC UA
    security_mode: str = "None"  # For OPC UA
    username: str = ""  # For authenticated protocols
    password: str = ""  # For authenticated protocols


@dataclass
class ParameterMapping:
    """Parameter mapping definition for gateway configuration"""

    param_id: str
    plc_id: str
    address: str
    asset_id: str
    sensor_id: str
    measurement: str
    unit: str
    data_type: str = "REAL"
    scale_factor: float = 1.0
    offset: float = 0.0
    parameter_type: str = "sensor"
    component_type: str = "generic"


class PLCDataReader:
    """Abstract base class for PLC protocol readers"""

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

    def read_tag(self, tag_address: str, data_type: str) -> Tuple[Any, DataQuality]:
        """Read a single tag from PLC"""
        raise NotImplementedError

    async def read_tag_async(
        self, tag_address: str, data_type: str
    ) -> Tuple[Any, DataQuality]:
        """Read a single tag from PLC (async version)"""
        # Default implementation falls back to sync
        return self.read_tag(tag_address, data_type)

    def read_tags(self, tags: List[str]) -> Dict[str, Tuple[Any, DataQuality]]:
        """Read multiple tags from PLC"""
        raise NotImplementedError
