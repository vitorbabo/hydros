#!/usr/bin/env python3
"""
Dynamic Address Allocation System

Automatically allocates protocol-specific addresses (Modbus registers, OPC UA nodes, etc.)
based on plant configuration and generates mapping files for edge gateway consumption.
"""

import yaml
import json
from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path


class DataType(Enum):
    BOOL = "bool"
    INT16 = "int16"
    UINT16 = "uint16"
    INT32 = "int32"
    UINT32 = "uint32"
    REAL = "real"
    STRING = "string"


class ParameterType(Enum):
    SENSOR = "sensor"
    ACTUATOR = "actuator"
    STATUS = "status"
    SETPOINT = "setpoint"
    ALARM = "alarm"


@dataclass
class ParameterDefinition:
    """Definition of a plant parameter (sensor, actuator, etc.)"""

    component_id: str
    parameter_name: str
    measurement: str
    unit: str
    data_type: DataType
    parameter_type: ParameterType
    description: str = ""
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    precision: int = 2
    access: str = "read"  # read, write, read_write


@dataclass
class AddressMapping:
    """Maps a parameter to protocol-specific addresses"""

    parameter_id: str
    component_id: str
    parameter_name: str
    measurement: str
    unit: str
    data_type: DataType
    parameter_type: ParameterType

    # Protocol-specific addresses
    modbus_address: Optional[int] = None
    modbus_type: Optional[str] = (
        None  # holding_register, input_register, coil, discrete_input
    )
    opcua_node_id: Optional[str] = None
    s7_address: Optional[str] = None

    # Metadata
    description: str = ""
    scale_factor: float = 1.0
    offset: float = 0.0
    access: str = "read"


class AddressAllocator:
    """Dynamically allocates protocol addresses for plant parameters"""

    def __init__(self, config_file: str = "plant_config.yaml"):
        self.config_file = config_file
        self.plant_config = self._load_plant_config()

        # Address allocation state
        self.modbus_registers = {
            "holding_registers": 1000,  # Start at 1000
            "input_registers": 3000,  # Start at 3000
            "coils": 100,  # Start at 100
            "discrete_inputs": 1100,  # Start at 1100
        }
        self.opcua_node_counter = 1000
        self.s7_db_counter = {"db": 1, "offset": 0}

        # Generated mappings
        self.address_mappings: List[AddressMapping] = []
        self.parameters: List[ParameterDefinition] = []

    def _load_plant_config(self) -> dict:
        """Load plant configuration"""
        try:
            with open(self.config_file, "r") as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            print(f"Config file {self.config_file} not found")
            return {}

    def generate_plant_parameters(self, site_id: str) -> List[ParameterDefinition]:
        """Generate all parameters for a plant site based on modules"""
        site_config = self.plant_config.get("site_configurations", {}).get(site_id, {})
        module_templates = self.plant_config.get("module_templates", {})

        parameters = []
        modules = site_config.get("modules", [])

        for module_name in modules:
            # Handle module instances (e.g., intake_pump_1, intake_pump_2)
            base_module = module_name.rstrip("_0123456789")

            if base_module in module_templates:
                module_config = module_templates[base_module]
                module_params = self._generate_module_parameters(
                    module_name, module_config
                )
                parameters.extend(module_params)

        return parameters

    def _generate_module_parameters(
        self, module_id: str, module_config: dict
    ) -> List[ParameterDefinition]:
        """Generate parameters for a specific module"""
        parameters = []

        # Required sensors
        for sensor in module_config.get("required_sensors", []):
            param = self._create_parameter_definition(
                module_id, sensor, ParameterType.SENSOR, required=True
            )
            if param:
                parameters.append(param)

        # Optional sensors
        for sensor in module_config.get("optional_sensors", []):
            param = self._create_parameter_definition(
                module_id, sensor, ParameterType.SENSOR, required=False
            )
            if param:
                parameters.append(param)

        # Actuators
        for actuator in module_config.get("actuators", []):
            param = self._create_parameter_definition(
                module_id, actuator, ParameterType.ACTUATOR
            )
            if param:
                parameters.append(param)

        # Status indicators
        if "run_status" in str(module_config):
            param = self._create_parameter_definition(
                module_id, "run_status", ParameterType.STATUS
            )
            if param:
                parameters.append(param)

        return parameters

    def _create_parameter_definition(
        self,
        component_id: str,
        parameter_name: str,
        param_type: ParameterType,
        required: bool = True,
    ) -> Optional[ParameterDefinition]:
        """Create a parameter definition with appropriate metadata"""

        # Parameter specifications - this could be moved to config
        param_specs = self._get_parameter_specs(parameter_name)

        if not param_specs:
            return None

        return ParameterDefinition(
            component_id=component_id,
            parameter_name=parameter_name,
            measurement=param_specs["measurement"],
            unit=param_specs["unit"],
            data_type=param_specs["data_type"],
            parameter_type=param_type,
            description=param_specs.get(
                "description", f"{parameter_name} for {component_id}"
            ),
            min_value=param_specs.get("min_value"),
            max_value=param_specs.get("max_value"),
            precision=param_specs.get("precision", 2),
            access=param_specs.get("access", "read"),
        )

    def _get_parameter_specs(self, parameter_name: str) -> Optional[dict]:
        """Get parameter specifications (units, ranges, etc.)"""

        # This could be loaded from a parameter library config file
        specs = {
            # Water quality parameters
            "turbidity": {
                "measurement": "turbidity",
                "unit": "NTU",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 1000.0,
                "precision": 2,
            },
            "ph": {
                "measurement": "ph",
                "unit": "pH",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 14.0,
                "precision": 2,
            },
            "temperature": {
                "measurement": "temperature",
                "unit": "°C",
                "data_type": DataType.REAL,
                "min_value": -10.0,
                "max_value": 50.0,
                "precision": 1,
            },
            "conductivity": {
                "measurement": "conductivity",
                "unit": "µS/cm",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 2000.0,
                "precision": 1,
            },
            "dissolved_oxygen": {
                "measurement": "dissolved_oxygen",
                "unit": "mg/L",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 20.0,
                "precision": 2,
            },
            "chlorine_residual": {
                "measurement": "chlorine_residual",
                "unit": "mg/L",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 10.0,
                "precision": 2,
            },
            # Physical parameters
            "level": {
                "measurement": "level",
                "unit": "m",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 10.0,
                "precision": 2,
            },
            "flow_rate": {
                "measurement": "flow_rate",
                "unit": "m³/h",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 200.0,
                "precision": 1,
            },
            "pressure": {
                "measurement": "pressure",
                "unit": "bar",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 10.0,
                "precision": 2,
            },
            "differential_pressure": {
                "measurement": "differential_pressure",
                "unit": "mbar",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 1000.0,
                "precision": 0,
            },
            # Equipment parameters
            "motor_current": {
                "measurement": "motor_current",
                "unit": "A",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 100.0,
                "precision": 1,
            },
            "motor_temperature": {
                "measurement": "motor_temperature",
                "unit": "°C",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 150.0,
                "precision": 1,
            },
            "vibration": {
                "measurement": "vibration",
                "unit": "mm/s",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 10.0,
                "precision": 2,
            },
            "power_consumption": {
                "measurement": "power_consumption",
                "unit": "kW",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 100.0,
                "precision": 1,
            },
            # Chemical parameters
            "chemical_tank_level": {
                "measurement": "level",
                "unit": "m",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 5.0,
                "precision": 2,
            },
            "dose_rate": {
                "measurement": "dose_rate",
                "unit": "mg/L",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 50.0,
                "precision": 2,
                "access": "read_write",
            },
            # Status parameters
            "run_status": {
                "measurement": "run_status",
                "unit": "bool",
                "data_type": DataType.BOOL,
                "access": "read_write",
            },
            "pump_speed": {
                "measurement": "pump_speed",
                "unit": "rpm",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 3000.0,
                "precision": 0,
                "access": "read_write",
            },
            "mixer_speed": {
                "measurement": "mixer_speed",
                "unit": "rpm",
                "data_type": DataType.REAL,
                "min_value": 0.0,
                "max_value": 1000.0,
                "precision": 0,
                "access": "read_write",
            },
        }

        return specs.get(parameter_name)

    def allocate_addresses(
        self, parameters: List[ParameterDefinition]
    ) -> List[AddressMapping]:
        """Allocate protocol addresses for all parameters"""
        mappings = []

        for param in parameters:
            mapping = AddressMapping(
                parameter_id=f"{param.component_id}.{param.parameter_name}",
                component_id=param.component_id,
                parameter_name=param.parameter_name,
                measurement=param.measurement,
                unit=param.unit,
                data_type=param.data_type,
                parameter_type=param.parameter_type,
                description=param.description,
                access=param.access,
            )

            # Allocate Modbus address
            self._allocate_modbus_address(mapping)

            # Allocate OPC UA address
            self._allocate_opcua_address(mapping)

            # Allocate S7 address
            self._allocate_s7_address(mapping)

            mappings.append(mapping)

        return mappings

    def _allocate_modbus_address(self, mapping: AddressMapping):
        """Allocate Modbus address based on data type and access"""

        if mapping.data_type == DataType.BOOL:
            if "write" in mapping.access:
                # Writable boolean -> coil
                mapping.modbus_address = self.modbus_registers["coils"]
                mapping.modbus_type = "coil"
                self.modbus_registers["coils"] += 1
            else:
                # Read-only boolean -> discrete input
                mapping.modbus_address = self.modbus_registers["discrete_inputs"]
                mapping.modbus_type = "discrete_input"
                self.modbus_registers["discrete_inputs"] += 1
        else:
            if "write" in mapping.access:
                # Writable numeric -> holding register
                mapping.modbus_address = self.modbus_registers["holding_registers"]
                mapping.modbus_type = "holding_register"
                self.modbus_registers["holding_registers"] += 1

                # Apply scaling for float values in integer registers
                if mapping.data_type in [DataType.REAL]:
                    mapping.scale_factor = 100.0  # Store as integer * 100
            else:
                # Read-only numeric -> input register
                mapping.modbus_address = self.modbus_registers["input_registers"]
                mapping.modbus_type = "input_register"
                self.modbus_registers["input_registers"] += 1

                if mapping.data_type in [DataType.REAL]:
                    mapping.scale_factor = 100.0

    def _allocate_opcua_address(self, mapping: AddressMapping):
        """Allocate OPC UA node ID"""
        node_id = f"ns=2;i={self.opcua_node_counter}"
        mapping.opcua_node_id = node_id
        self.opcua_node_counter += 1

    def _allocate_s7_address(self, mapping: AddressMapping):
        """Allocate S7/DB address"""
        db = self.s7_db_counter["db"]
        offset = self.s7_db_counter["offset"]

        if mapping.data_type == DataType.BOOL:
            # Boolean -> DBX format
            mapping.s7_address = f"DB{db}.DBX{offset}.0"
            self.s7_db_counter["offset"] += 2  # Align to word boundary
        else:
            # Numeric -> DBW format
            mapping.s7_address = f"DB{db}.DBW{offset}"
            self.s7_db_counter["offset"] += 2

        # Move to next DB every 200 bytes
        if self.s7_db_counter["offset"] >= 200:
            self.s7_db_counter["db"] += 1
            self.s7_db_counter["offset"] = 0

    def generate_mapping_files(self, site_id: str, output_dir: str = "."):
        """Generate all mapping files for a site"""
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)

        # Generate parameters
        parameters = self.generate_plant_parameters(site_id)

        # Allocate addresses
        mappings = self.allocate_addresses(parameters)

        # Generate unified mapping file
        unified_mapping = {
            "site_id": site_id,
            "generated_at": str(datetime.now()),
            "parameters": [asdict(param) for param in parameters],
            "address_mappings": [asdict(mapping) for mapping in mappings],
        }

        with open(output_path / f"{site_id}_unified_mapping.json", "w") as f:
            json.dump(unified_mapping, f, indent=2, default=str)

        # Generate protocol-specific mapping files
        self._generate_modbus_mapping(site_id, mappings, output_path)
        self._generate_opcua_mapping(site_id, mappings, output_path)
        self._generate_edge_gateway_config(site_id, mappings, output_path)

        print(f"Generated mapping files for {site_id}:")
        print(f"  - {len(parameters)} parameters")
        print(f"  - {len(mappings)} address mappings")
        print(f"  - Files saved to {output_path}")

        return mappings

    def _generate_modbus_mapping(
        self, site_id: str, mappings: List[AddressMapping], output_path: Path
    ):
        """Generate Modbus-specific mapping file"""
        modbus_mapping = {"site_id": site_id, "protocol": "modbus_tcp", "mappings": {}}

        for mapping in mappings:
            if mapping.modbus_address is not None:
                modbus_mapping["mappings"][mapping.parameter_id] = {
                    "address": mapping.modbus_address,
                    "type": mapping.modbus_type,
                    "data_type": mapping.data_type.value,
                    "scale_factor": mapping.scale_factor,
                    "offset": mapping.offset,
                    "component_id": mapping.component_id,
                    "measurement": mapping.measurement,
                    "unit": mapping.unit,
                    "access": mapping.access,
                }

        with open(output_path / f"{site_id}_modbus_mapping.json", "w") as f:
            json.dump(modbus_mapping, f, indent=2)

    def _generate_opcua_mapping(
        self, site_id: str, mappings: List[AddressMapping], output_path: Path
    ):
        """Generate OPC UA mapping file"""
        opcua_mapping = {"site_id": site_id, "protocol": "opcua", "mappings": {}}

        for mapping in mappings:
            if mapping.opcua_node_id is not None:
                opcua_mapping["mappings"][mapping.parameter_id] = {
                    "node_id": mapping.opcua_node_id,
                    "data_type": mapping.data_type.value,
                    "component_id": mapping.component_id,
                    "measurement": mapping.measurement,
                    "unit": mapping.unit,
                    "access": mapping.access,
                }

        with open(output_path / f"{site_id}_opcua_mapping.json", "w") as f:
            json.dump(opcua_mapping, f, indent=2)

    def _generate_edge_gateway_config(
        self, site_id: str, mappings: List[AddressMapping], output_path: Path
    ):
        """Generate edge gateway configuration file with protocol-specific addresses"""

        # Group mappings by protocol for multiple PLC connections
        protocol_groups = {}
        for mapping in mappings:
            # Determine primary protocol based on available addresses
            if mapping.modbus_address is not None:
                if "modbus_tcp" not in protocol_groups:
                    protocol_groups["modbus_tcp"] = []
                protocol_groups["modbus_tcp"].append((mapping, "modbus"))
            elif mapping.opcua_node_id is not None:
                if "opcua" not in protocol_groups:
                    protocol_groups["opcua"] = []
                protocol_groups["opcua"].append((mapping, "opcua"))
            elif mapping.s7_address is not None:
                if "s7" not in protocol_groups:
                    protocol_groups["s7"] = []
                protocol_groups["s7"].append((mapping, "s7"))

        gateway_config = {
            "site_id": site_id,
            "mqtt": {
                "host": "${MQTT_HOST:localhost}",
                "port": "${MQTT_PORT:1883}",
                "client_id": f"edge-gateway-{site_id}",
            },
            "plcs": [],
            "tags": [],
        }

        # Create PLC connections for each protocol
        for protocol_name, mappings_list in protocol_groups.items():
            if protocol_name == "modbus_tcp":
                connection_config = {
                    "connection_id": f"{protocol_name}_plc",
                    "protocol": "modbus_tcp",
                    "ip_address": "${PLC_HOST:localhost}",
                    "port": "${PLC_PORT:5020}",
                    "unit_id": 1,
                    "enabled": True,
                }
            elif protocol_name == "opcua":
                connection_config = {
                    "connection_id": f"{protocol_name}_plc",
                    "protocol": "opcua",
                    "endpoint_url": "${OPCUA_ENDPOINT:opc.tcp://localhost:4840}",
                    "enabled": True,
                }
            elif protocol_name == "s7":
                connection_config = {
                    "connection_id": f"{protocol_name}_plc",
                    "protocol": "s7",
                    "ip_address": "${S7_HOST:localhost}",
                    "rack": "${S7_RACK:0}",
                    "slot": "${S7_SLOT:1}",
                    "enabled": True,
                }

            gateway_config["plcs"].append(connection_config)

            # Create tags for this protocol
            for mapping, protocol_type in mappings_list:
                # Use protocol-appropriate addresses
                if protocol_type == "modbus":
                    # Convert to standard Modbus addressing format
                    if mapping.modbus_type == "input_register":
                        tag_address = str(30001 + mapping.modbus_address)
                    elif mapping.modbus_type == "holding_register":
                        tag_address = str(40001 + mapping.modbus_address)
                    elif mapping.modbus_type == "coil":
                        tag_address = str(1 + mapping.modbus_address)
                    elif mapping.modbus_type == "discrete_input":
                        tag_address = str(10001 + mapping.modbus_address)
                    else:
                        tag_address = str(mapping.modbus_address)
                elif protocol_type == "opcua":
                    tag_address = mapping.opcua_node_id
                elif protocol_type == "s7":
                    tag_address = mapping.s7_address
                else:
                    continue  # Skip unsupported protocols

                tag_def = {
                    "tag_address": tag_address,
                    "asset_id": mapping.component_id,
                    "sensor_id": f"{mapping.measurement}-{mapping.component_id}",
                    "measurement": mapping.measurement,
                    "unit": mapping.unit,
                    "data_type": mapping.data_type.value.upper(),
                    "scale_factor": mapping.scale_factor,
                    "offset": mapping.offset,
                    "description": mapping.description,
                    "component_type": mapping.parameter_type.value,
                    "plc_connection": f"{protocol_name}_plc",
                    "protocol": protocol_type,  # Add explicit protocol for each tag
                }
                gateway_config["tags"].append(tag_def)

        with open(output_path / f"{site_id}_edge_gateway_config.yaml", "w") as f:
            yaml.dump(gateway_config, f, indent=2, default_flow_style=False)


if __name__ == "__main__":
    # Test the address allocator
    allocator = AddressAllocator("../config/wtp_config.yaml")

    # Generate mappings for Porto plant
    mappings = allocator.generate_mapping_files("wtp-porto-01", "config")

    print("\nSample mappings:")
    for mapping in mappings[:5]:
        print(f"  {mapping.parameter_id}:")
        print(f"    Modbus: {mapping.modbus_type} {mapping.modbus_address}")
        print(f"    OPC UA: {mapping.opcua_node_id}")
        print(f"    S7: {mapping.s7_address}")
