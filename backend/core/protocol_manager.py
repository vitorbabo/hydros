#!/usr/bin/env python3
"""
Protocol Manager

Manages protocol servers (for simulation) and clients (for edge gateway)
using dynamically generated address mappings.
"""

import json
import logging
from typing import Dict, Any
from pathlib import Path
from dataclasses import dataclass

try:
    from pymodbus.client import ModbusTcpClient
    from pymodbus.datastore import (
        ModbusSequentialDataBlock,
        ModbusDeviceContext,
        ModbusServerContext,
    )
    from pymodbus.server import StartAsyncTcpServer

    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False


@dataclass
class ProtocolMapping:
    """Protocol-specific mapping information"""

    parameter_id: str
    component_id: str
    measurement: str
    unit: str
    data_type: str
    address: int
    address_type: str  # holding_register, input_register, coil, discrete_input
    scale_factor: float = 1.0
    offset: float = 0.0
    access: str = "read"


class DynamicModbusServer:
    """Dynamic Modbus server that allocates addresses based on mappings"""

    def __init__(self, host: str = "0.0.0.0", port: int = 5020):
        self.host = host
        self.port = port
        self.logger = logging.getLogger(f"{self.__class__.__name__}")

        # Address mappings
        self.mappings: Dict[str, ProtocolMapping] = {}
        self.parameter_to_address: Dict[str, int] = {}
        self.address_to_parameter: Dict[int, str] = {}

        # Data blocks
        self.holding_registers = {}
        self.input_registers = {}
        self.coils = {}
        self.discrete_inputs = {}

        # Server components
        self.server_context = None
        self.running = False

    def load_mappings(self, mapping_file: str):
        """Load address mappings from generated mapping file"""
        try:
            with open(mapping_file, "r") as f:
                mapping_data = json.load(f)

            site_id = mapping_data.get("site_id", "unknown")
            mappings_dict = mapping_data.get("mappings", {})

            self.logger.info(
                f"Loading {len(mappings_dict)} mappings for site {site_id}"
            )

            for param_id, mapping_info in mappings_dict.items():
                mapping = ProtocolMapping(
                    parameter_id=param_id,
                    component_id=mapping_info["component_id"],
                    measurement=mapping_info["measurement"],
                    unit=mapping_info["unit"],
                    data_type=mapping_info["data_type"],
                    address=mapping_info["address"],
                    address_type=mapping_info["type"],
                    scale_factor=mapping_info.get("scale_factor", 1.0),
                    offset=mapping_info.get("offset", 0.0),
                    access=mapping_info.get("access", "read"),
                )

                self.mappings[param_id] = mapping
                self.parameter_to_address[param_id] = mapping.address
                self.address_to_parameter[mapping.address] = param_id

                self.logger.debug(
                    f"Mapped {param_id} -> {mapping.address_type} {mapping.address}"
                )

            self._initialize_data_blocks()
            self.logger.info(
                f"Successfully loaded {len(self.mappings)} parameter mappings"
            )

        except Exception as e:
            self.logger.error(f"Failed to load mappings from {mapping_file}: {e}")
            raise

    def _initialize_data_blocks(self):
        """Initialize Modbus data blocks based on mappings"""
        if not MODBUS_AVAILABLE:
            self.logger.error("pymodbus not available - cannot initialize server")
            return

        # Determine required address ranges
        holding_registers_max = max(
            [
                m.address
                for m in self.mappings.values()
                if m.address_type == "holding_register"
            ],
            default=0,
        )
        input_registers_max = max(
            [
                m.address
                for m in self.mappings.values()
                if m.address_type == "input_register"
            ],
            default=0,
        )
        coils_max = max(
            [m.address for m in self.mappings.values() if m.address_type == "coil"],
            default=0,
        )
        discrete_inputs_max = max(
            [
                m.address
                for m in self.mappings.values()
                if m.address_type == "discrete_input"
            ],
            default=0,
        )

        # Create data blocks with sufficient size
        holding_size = max(holding_registers_max + 100, 1000)
        input_size = max(input_registers_max + 100, 1000)
        coil_size = max(coils_max + 100, 1000)
        discrete_size = max(discrete_inputs_max + 100, 1000)

        # Initialize with zeros/false
        holding_block = ModbusSequentialDataBlock(0, [0] * holding_size)
        input_block = ModbusSequentialDataBlock(0, [0] * input_size)
        coil_block = ModbusSequentialDataBlock(0, [False] * coil_size)
        discrete_block = ModbusSequentialDataBlock(0, [False] * discrete_size)

        # Create device context
        device_context = ModbusDeviceContext(
            di=discrete_block, co=coil_block, hr=holding_block, ir=input_block
        )

        # Create server context
        self.server_context = ModbusServerContext(devices=device_context, single=True)

        self.logger.info("Initialized Modbus data blocks:")
        self.logger.info(f"  - Holding registers: {holding_size}")
        self.logger.info(f"  - Input registers: {input_size}")
        self.logger.info(f"  - Coils: {coil_size}")
        self.logger.info(f"  - Discrete inputs: {discrete_size}")

    def update_parameter_value(self, parameter_id: str, value: Any):
        """Update a parameter value in the Modbus server"""
        if parameter_id not in self.mappings:
            self.logger.warning(f"Parameter {parameter_id} not found in mappings")
            return False

        mapping = self.mappings[parameter_id]

        try:
            # Apply scaling and convert to appropriate format
            if mapping.data_type.lower() == "bool":
                modbus_value = bool(value)
            else:
                # Apply scaling for numeric values
                scaled_value = float(value) * mapping.scale_factor + mapping.offset
                modbus_value = int(round(scaled_value))

                # Clamp to 16-bit range
                modbus_value = max(0, min(65535, modbus_value))

            # Update the appropriate data block
            if mapping.address_type == "holding_register":
                self.server_context[0].setValues(4, mapping.address, [modbus_value])
            elif mapping.address_type == "input_register":
                self.server_context[0].setValues(3, mapping.address, [modbus_value])
            elif mapping.address_type == "coil":
                self.server_context[0].setValues(1, mapping.address, [modbus_value])
            elif mapping.address_type == "discrete_input":
                self.server_context[0].setValues(2, mapping.address, [modbus_value])

            self.logger.debug(
                f"Updated {parameter_id} = {value} -> {mapping.address_type} {mapping.address} = {modbus_value}"
            )
            return True

        except Exception as e:
            self.logger.error(f"Failed to update {parameter_id}: {e}")
            return False

    def update_values(self, parameter_values: Dict[str, Any]):
        """Update multiple parameter values"""
        success_count = 0

        for param_id, value in parameter_values.items():
            if self.update_parameter_value(param_id, value):
                success_count += 1

        self.logger.debug(f"Updated {success_count}/{len(parameter_values)} parameters")
        return success_count

    async def start_async(self):
        """Start the async Modbus server"""
        if not MODBUS_AVAILABLE:
            self.logger.error("pymodbus not available - cannot start server")
            return

        if not self.server_context:
            self.logger.error("Server context not initialized - load mappings first")
            return

        self.logger.info(f"Starting dynamic Modbus server on {self.host}:{self.port}")

        try:
            address = (self.host, self.port)
            await StartAsyncTcpServer(
                context=self.server_context,
                address=address,
            )
        except Exception as e:
            self.logger.error(f"Failed to start Modbus server: {e}")
            raise


class DynamicModbusClient:
    """Dynamic Modbus client that uses generated mappings"""

    def __init__(self, host: str = "localhost", port: int = 5020):
        self.host = host
        self.port = port
        self.logger = logging.getLogger(f"{self.__class__.__name__}")

        # Mappings
        self.mappings: Dict[str, ProtocolMapping] = {}

        # Client
        self.client = None
        self.connected = False

    def load_mappings(self, mapping_file: str):
        """Load address mappings from generated mapping file"""
        try:
            with open(mapping_file, "r") as f:
                mapping_data = json.load(f)

            mappings_dict = mapping_data.get("mappings", {})

            for param_id, mapping_info in mappings_dict.items():
                mapping = ProtocolMapping(
                    parameter_id=param_id,
                    component_id=mapping_info["component_id"],
                    measurement=mapping_info["measurement"],
                    unit=mapping_info["unit"],
                    data_type=mapping_info["data_type"],
                    address=mapping_info["address"],
                    address_type=mapping_info["type"],
                    scale_factor=mapping_info.get("scale_factor", 1.0),
                    offset=mapping_info.get("offset", 0.0),
                    access=mapping_info.get("access", "read"),
                )

                self.mappings[param_id] = mapping

            self.logger.info(
                f"Loaded {len(self.mappings)} parameter mappings for client"
            )

        except Exception as e:
            self.logger.error(f"Failed to load mappings: {e}")
            raise

    def connect(self) -> bool:
        """Connect to Modbus server"""
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
        """Disconnect from Modbus server"""
        if self.client and self.connected:
            self.client.close()
            self.connected = False
            self.logger.info("Disconnected from Modbus server")

    def write_parameter_values(self, parameter_values: Dict[str, Any]) -> int:
        """Write parameter values using dynamic mappings"""
        if not self.connected:
            self.logger.error("Not connected to Modbus server")
            return 0

        success_count = 0

        for param_id, value in parameter_values.items():
            if param_id not in self.mappings:
                self.logger.debug(f"Parameter {param_id} not mapped, skipping")
                continue

            mapping = self.mappings[param_id]

            try:
                # Apply scaling
                if mapping.data_type.lower() == "bool":
                    modbus_value = bool(value)
                else:
                    scaled_value = float(value) * mapping.scale_factor + mapping.offset
                    modbus_value = int(round(scaled_value))
                    modbus_value = max(0, min(65535, modbus_value))

                # Write based on address type
                if mapping.address_type in ["holding_register", "input_register"]:
                    result = self.client.write_register(
                        mapping.address, modbus_value, device_id=1
                    )
                    if not result.isError():
                        success_count += 1
                        self.logger.debug(
                            f"✓ Wrote {param_id} = {value} -> {mapping.address} = {modbus_value}"
                        )
                    else:
                        self.logger.error(f"✗ Failed to write {param_id}: {result}")

                elif mapping.address_type in ["coil", "discrete_input"]:
                    result = self.client.write_coil(
                        mapping.address, modbus_value, device_id=1
                    )
                    if not result.isError():
                        success_count += 1
                        self.logger.debug(
                            f"✓ Wrote {param_id} = {value} -> coil {mapping.address} = {modbus_value}"
                        )
                    else:
                        self.logger.error(f"✗ Failed to write {param_id}: {result}")

            except Exception as e:
                self.logger.error(f"Error writing {param_id}: {e}")

        if success_count > 0:
            self.logger.info(
                f"Successfully wrote {success_count}/{len(parameter_values)} parameters"
            )

        return success_count


# Testing function
def test_dynamic_protocol_manager():
    """Test the dynamic protocol manager"""

    logging.basicConfig(level=logging.INFO)

    print("=== Testing Dynamic Protocol Manager ===")

    # Test with generated mapping file
    mapping_file = "config/wtp-porto-01_modbus_mapping.json"

    if not Path(mapping_file).exists():
        print(f"Mapping file {mapping_file} not found. Run address_allocator.py first.")
        return

    # Create server
    server = DynamicModbusServer()
    server.load_mappings(mapping_file)

    # Create client
    client = DynamicModbusClient()
    client.load_mappings(mapping_file)

    print(f"Loaded mappings: {len(server.mappings)} parameters")

    # Test data
    test_data = {
        "raw_intake.level": 5.67,
        "raw_intake.flow_rate": 45.2,
        "raw_intake.turbidity": 12.34,
        "raw_intake.ph": 7.8,
        "intake_pump_1.run_status": True,
        "intake_pump_1.flow_rate": 42.1,
        "intake_pump_1.pressure": 2.5,
    }

    print(f"\nTesting with sample data: {len(test_data)} parameters")

    # Test server updates
    success_count = server.update_values(test_data)
    print(f"Server updated: {success_count}/{len(test_data)} parameters")

    # The actual server would be started in async context
    # For this test, we just verify the mapping loading works

    print("✓ Dynamic protocol manager test completed")


if __name__ == "__main__":
    test_dynamic_protocol_manager()
