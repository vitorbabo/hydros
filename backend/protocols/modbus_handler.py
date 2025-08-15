#!/usr/bin/env python3
"""
Modbus Handler

Unified Modbus implementation for both client and server functionality.
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Union

try:
    from pymodbus.client import ModbusTcpClient
    from pymodbus.datastore import (
        ModbusDeviceContext,
        ModbusSequentialDataBlock,
        ModbusServerContext,
    )
    from pymodbus.server import StartAsyncTcpServer

    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False


class ModbusRegisterType(Enum):
    """Modbus register types"""

    HOLDING_REGISTER = "holding_register"
    INPUT_REGISTER = "input_register"
    COIL = "coil"
    DISCRETE_INPUT = "discrete_input"


@dataclass
class ModbusMapping:
    """Modbus address mapping"""

    parameter_id: str
    address: int
    register_type: ModbusRegisterType
    data_type: str = "uint16"
    scale_factor: float = 1.0
    offset: float = 0.0
    unit: str = ""
    description: str = ""


class ModbusHandler:
    """
    Unified Modbus handler that can act as both client and server.

    Features:
    - Dynamic address mapping
    - Multiple data types support
    - Automatic scaling and unit conversion
    - Connection management and retry logic
    - Bulk read/write operations
    """

    def __init__(self, mode: str = "server", host: str = "localhost", port: int = 502):
        self.mode = mode.lower()
        self.host = host
        self.port = port

        self.logger = logging.getLogger(f"{self.__class__.__name__}_{mode}")

        # Mappings
        self.mappings: Dict[str, ModbusMapping] = {}
        self.address_to_param: Dict[int, str] = {}

        # Client/Server components
        self.client = None
        self.server_context = None
        self.connected = False

        # Data storage
        self.parameter_values: Dict[str, Any] = {}

        # Configuration
        self.connection_timeout = 5.0
        self.retry_count = 3
        self.device_id = 1

    def load_mappings(self, mappings: Union[List[ModbusMapping], Dict[str, Any]]):
        """Load Modbus address mappings"""
        if isinstance(mappings, dict):
            # Convert from dictionary format
            for param_id, mapping_data in mappings.items():
                mapping = ModbusMapping(
                    parameter_id=param_id,
                    address=mapping_data["address"],
                    register_type=ModbusRegisterType(mapping_data["type"]),
                    data_type=mapping_data.get("data_type", "uint16"),
                    scale_factor=mapping_data.get("scale_factor", 1.0),
                    offset=mapping_data.get("offset", 0.0),
                    unit=mapping_data.get("unit", ""),
                    description=mapping_data.get("description", ""),
                )
                self.mappings[param_id] = mapping
                self.address_to_param[mapping.address] = param_id
        else:
            # List of ModbusMapping objects
            for mapping in mappings:
                self.mappings[mapping.parameter_id] = mapping
                self.address_to_param[mapping.address] = mapping.parameter_id

        self.logger.info(f"Loaded {len(self.mappings)} Modbus mappings")

    def load_mappings_from_file(self, mapping_file: str):
        """Load mappings from JSON file"""
        import json

        try:
            with open(mapping_file, "r") as f:
                mapping_data = json.load(f)

            # Extract mappings from file format
            mappings_dict = mapping_data.get("mappings", mapping_data)
            self.load_mappings(mappings_dict)

        except Exception as e:
            self.logger.error(f"Failed to load mappings from {mapping_file}: {e}")
            raise

    def load_mappings_from_gateway_config(self, gateway_config_file: str):
        """Load mappings from gateway YAML config file"""
        try:
            import os
            import re

            import yaml

            with open(gateway_config_file, "r") as f:
                config_content = f.read()

            # Simple environment variable substitution
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

            # Extract tags and convert to mapping format
            tags = config.get("tags", [])
            mappings_dict = {}
            site_id = config.get("site_id", "unknown-site")

            for tag in tags:
                # Only process Modbus tags
                if tag.get("protocol") == "modbus":
                    # Use PlantModel parameter format: site_id.asset_id.measurement
                    asset_id = tag.get("asset_id", "unknown")
                    measurement = tag.get("measurement", "param")
                    param_id = f"{site_id}.{asset_id}.{measurement}"

                    # Convert data type
                    data_type_map = {
                        "BOOL": "bool",
                        "INT16": "int16",
                        "UINT16": "uint16",
                        "REAL": "real",
                    }
                    data_type = data_type_map.get(tag.get("data_type", "REAL"), "real")

                    # Parse standard Modbus addresses and convert to zero-based for server data blocks
                    tag_address = int(tag.get("tag_address", "0"))

                    # Determine register type and zero-based address from standard Modbus address ranges
                    if 30001 <= tag_address <= 39999:
                        register_type = "input_register"
                        address = tag_address - 30001  # Convert to zero-based address
                    elif 40001 <= tag_address <= 49999:
                        register_type = "holding_register"
                        address = tag_address - 40001  # Convert to zero-based address
                    elif 10001 <= tag_address <= 19999:
                        register_type = "discrete_input"
                        address = tag_address - 10001  # Convert to zero-based address
                    elif 1 <= tag_address <= 9999:
                        register_type = "coil"
                        address = tag_address - 1  # Convert to zero-based address
                    else:
                        # Fallback - infer register type from data type and access
                        if data_type == "bool":
                            register_type = (
                                "coil"
                                if "write" in tag.get("access", "read")
                                else "discrete_input"
                            )
                        else:
                            register_type = (
                                "holding_register"
                                if "write" in tag.get("access", "read")
                                else "input_register"
                            )
                        address = tag_address  # Use as-is for non-standard addresses

                    mappings_dict[param_id] = {
                        "address": address,
                        "type": register_type,
                        "data_type": data_type,
                        "scale_factor": tag.get("scale_factor", 1.0),
                        "offset": tag.get("offset", 0.0),
                        "component_id": tag.get("asset_id", "unknown"),
                        "measurement": tag.get("measurement", "unknown"),
                        "unit": tag.get("unit", ""),
                        "access": "read_write"
                        if "write" in tag.get("access", "read")
                        else "read",
                    }

            self.load_mappings(mappings_dict)

        except Exception as e:
            self.logger.error(
                f"Failed to load mappings from gateway config {gateway_config_file}: {e}"
            )
            raise

    def connect(self) -> bool:
        """Connect to Modbus server (client mode)"""
        if self.mode != "client":
            self.logger.error("Connect only available in client mode")
            return False

        if not MODBUS_AVAILABLE:
            self.logger.error("pymodbus not available")
            return False

        try:
            self.client = ModbusTcpClient(self.host, port=self.port)
            self.connected = self.client.connect()

            if self.connected:
                self.logger.info(
                    f"Connected to Modbus server at {self.host}:{self.port}"
                )
            else:
                self.logger.error("Failed to connect to Modbus server")

            return self.connected

        except Exception as e:
            self.logger.error(f"Connection error: {e}")
            return False

    def disconnect(self):
        """Disconnect from Modbus server (client mode)"""
        if self.client and self.connected:
            self.client.close()
            self.connected = False
            self.logger.info("Disconnected from Modbus server")

    def initialize_server(self):
        """Initialize Modbus server data blocks"""
        if self.mode != "server":
            self.logger.error("Server initialization only available in server mode")
            return False

        if not MODBUS_AVAILABLE:
            self.logger.error("pymodbus not available")
            return False

        try:
            # Determine required address ranges
            holding_max = max(
                [
                    m.address
                    for m in self.mappings.values()
                    if m.register_type == ModbusRegisterType.HOLDING_REGISTER
                ],
                default=0,
            )
            input_max = max(
                [
                    m.address
                    for m in self.mappings.values()
                    if m.register_type == ModbusRegisterType.INPUT_REGISTER
                ],
                default=0,
            )
            coil_max = max(
                [
                    m.address
                    for m in self.mappings.values()
                    if m.register_type == ModbusRegisterType.COIL
                ],
                default=0,
            )
            discrete_max = max(
                [
                    m.address
                    for m in self.mappings.values()
                    if m.register_type == ModbusRegisterType.DISCRETE_INPUT
                ],
                default=0,
            )

            # Create data blocks
            holding_size = max(holding_max + 100, 1000)
            input_size = max(input_max + 100, 1000)
            coil_size = max(coil_max + 100, 1000)
            discrete_size = max(discrete_max + 100, 1000)

            holding_block = ModbusSequentialDataBlock(0, [0] * holding_size)
            input_block = ModbusSequentialDataBlock(0, [0] * input_size)
            coil_block = ModbusSequentialDataBlock(0, [False] * coil_size)
            discrete_block = ModbusSequentialDataBlock(0, [False] * discrete_size)

            # Create server context
            device_context = ModbusDeviceContext(
                di=discrete_block, co=coil_block, hr=holding_block, ir=input_block
            )

            self.server_context = ModbusServerContext(
                devices=device_context, single=True
            )

            self.logger.info(
                f"Initialized Modbus server data blocks: "
                f"HR={holding_size}, IR={input_size}, CO={coil_size}, DI={discrete_size}"
            )

            return True

        except Exception as e:
            self.logger.error(f"Failed to initialize server: {e}")
            return False

    def read_parameter(self, parameter_id: str) -> Optional[Any]:
        """Read a single parameter (client mode)"""
        if self.mode != "client" or not self.connected:
            return None

        if parameter_id not in self.mappings:
            self.logger.warning(f"Parameter {parameter_id} not mapped")
            return None

        mapping = self.mappings[parameter_id]

        try:
            # Read based on register type
            if mapping.register_type == ModbusRegisterType.HOLDING_REGISTER:
                result = self.client.read_holding_registers(
                    mapping.address, 1, device_id=self.device_id
                )
            elif mapping.register_type == ModbusRegisterType.INPUT_REGISTER:
                result = self.client.read_input_registers(
                    mapping.address, 1, device_id=self.device_id
                )
            elif mapping.register_type == ModbusRegisterType.COIL:
                result = self.client.read_coils(
                    mapping.address, 1, device_id=self.device_id
                )
            elif mapping.register_type == ModbusRegisterType.DISCRETE_INPUT:
                result = self.client.read_discrete_inputs(
                    mapping.address, 1, device_id=self.device_id
                )
            else:
                return None

            if not result.isError():
                # Extract value
                if hasattr(result, "registers"):
                    raw_value = result.registers[0]
                else:
                    raw_value = result.bits[0]

                # Apply scaling and offset
                if mapping.data_type.lower() == "bool":
                    scaled_value = bool(raw_value)
                else:
                    scaled_value = (raw_value / mapping.scale_factor) - mapping.offset

                return scaled_value
            else:
                self.logger.error(f"Error reading {parameter_id}: {result}")
                return None

        except Exception as e:
            self.logger.error(f"Exception reading {parameter_id}: {e}")
            return None

    def write_parameter(self, parameter_id: str, value: Any) -> bool:
        """Write a single parameter (client mode)"""
        if self.mode != "client" or not self.connected:
            return False

        if parameter_id not in self.mappings:
            self.logger.warning(f"Parameter {parameter_id} not mapped")
            return False

        mapping = self.mappings[parameter_id]

        try:
            # Apply scaling and offset
            if mapping.data_type.lower() == "bool":
                modbus_value = bool(value)
            else:
                scaled_value = (float(value) + mapping.offset) * mapping.scale_factor
                modbus_value = int(round(scaled_value))
                modbus_value = max(0, min(65535, modbus_value))

            # Write based on register type
            if mapping.register_type == ModbusRegisterType.HOLDING_REGISTER:
                result = self.client.write_register(
                    mapping.address, modbus_value, device_id=self.device_id
                )
            elif mapping.register_type == ModbusRegisterType.COIL:
                result = self.client.write_coil(
                    mapping.address, modbus_value, device_id=self.device_id
                )
            else:
                self.logger.error(f"Cannot write to {mapping.register_type.value}")
                return False

            if not result.isError():
                self.logger.debug(
                    f"Wrote {parameter_id} = {value} -> address {mapping.address}"
                )
                return True
            else:
                self.logger.error(f"Error writing {parameter_id}: {result}")
                return False

        except Exception as e:
            self.logger.error(f"Exception writing {parameter_id}: {e}")
            return False

    def read_parameters(self, parameter_ids: List[str]) -> Dict[str, Any]:
        """Read multiple parameters"""
        results = {}

        for param_id in parameter_ids:
            value = self.read_parameter(param_id)
            if value is not None:
                results[param_id] = value

        return results

    def write_parameters(self, parameter_values: Dict[str, Any]) -> int:
        """Write multiple parameters, return count of successful writes"""
        success_count = 0

        for param_id, value in parameter_values.items():
            if self.write_parameter(param_id, value):
                success_count += 1

        return success_count

    def update_server_parameter(self, parameter_id: str, value: Any) -> bool:
        """Update server data using direct data store access (server mode)"""
        if self.mode != "server" or not self.server_context:
            return False

        if parameter_id not in self.mappings:
            return False

        mapping = self.mappings[parameter_id]

        try:
            # Apply scaling and offset
            if mapping.data_type.lower() == "bool":
                modbus_value = bool(value)
            else:
                scaled_value = (float(value) + mapping.offset) * mapping.scale_factor
                modbus_value = int(round(scaled_value))
                modbus_value = max(0, min(65535, modbus_value))

            # Get the device context and update using setValues method
            device_context = self.server_context[0]

            # Use the correct function codes for setValues
            if mapping.register_type == ModbusRegisterType.HOLDING_REGISTER:
                device_context.setValues(
                    3, mapping.address, [modbus_value]
                )  # FC=3 for holding registers
            elif mapping.register_type == ModbusRegisterType.INPUT_REGISTER:
                device_context.setValues(
                    4, mapping.address, [modbus_value]
                )  # FC=4 for input registers
            elif mapping.register_type == ModbusRegisterType.COIL:
                device_context.setValues(
                    1, mapping.address, [modbus_value]
                )  # FC=1 for coils
            elif mapping.register_type == ModbusRegisterType.DISCRETE_INPUT:
                device_context.setValues(
                    2, mapping.address, [modbus_value]
                )  # FC=2 for discrete inputs
            else:
                self.logger.warning(f"Unknown register type: {mapping.register_type}")
                return False

            self.parameter_values[parameter_id] = value
            return True

        except Exception as e:
            self.logger.error(f"Error updating server parameter {parameter_id}: {e}")
            return False

    def update_server_parameters(self, parameter_values: Dict[str, Any]) -> int:
        """Update multiple server parameters"""
        success_count = 0

        for param_id, value in parameter_values.items():
            if self.update_server_parameter(param_id, value):
                success_count += 1

        return success_count

    async def start_server(self):
        """Start Modbus server (server mode)"""
        if self.mode != "server" or not self.server_context:
            raise RuntimeError("Server not initialized")

        self.logger.info(f"Starting Modbus server on {self.host}:{self.port}")

        try:
            address = (self.host if self.host != "0.0.0.0" else "", self.port)
            await StartAsyncTcpServer(
                context=self.server_context,
                address=address,
            )
        except Exception as e:
            self.logger.error(f"Failed to start Modbus server: {e}")
            raise

    def get_parameter_mappings(self) -> Dict[str, Dict[str, Any]]:
        """Get all parameter mappings as dictionary"""
        mappings_dict = {}

        for param_id, mapping in self.mappings.items():
            mappings_dict[param_id] = {
                "address": mapping.address,
                "type": mapping.register_type.value,
                "data_type": mapping.data_type,
                "scale_factor": mapping.scale_factor,
                "offset": mapping.offset,
                "unit": mapping.unit,
                "description": mapping.description,
            }

        return mappings_dict

    def get_statistics(self) -> Dict[str, Any]:
        """Get handler statistics"""
        return {
            "mode": self.mode,
            "connected": self.connected,
            "mappings_count": len(self.mappings),
            "parameters_cached": len(self.parameter_values),
            "host": self.host,
            "port": self.port,
        }
