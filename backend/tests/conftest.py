"""
Pytest configuration and shared fixtures for Hydros backend tests.
"""
import pytest
import yaml
import tempfile
import os
from pathlib import Path
from typing import Dict, Any


@pytest.fixture
def temp_config_dir(tmp_path):
    """Create a temporary directory for test configurations."""
    config_dir = tmp_path / "config"
    config_dir.mkdir()

    # Create subdirectories
    (config_dir / "sites").mkdir()
    (config_dir / "templates").mkdir()
    (config_dir / "schemas").mkdir()

    return config_dir


@pytest.fixture
def sample_site_config() -> Dict[str, Any]:
    """Sample site configuration for testing."""
    return {
        "site_info": {
            "site_id": "test-site-01",
            "name": "Test Water Treatment Plant",
            "design_capacity": 50000,
            "location": {
                "region": "Test Region",
                "country": "Test Country",
                "coordinates": [40.0, -8.0]
            }
        },
        "modules": [
            "raw_intake",
            "intake_pump_1",
            "coagulation_tank"
        ],
        "operational_parameters": {
            "normal_flow_rate": 35.0,
            "design_flow_rate": 45.0
        },
        "protocol_clients": [
            {
                "client_id": "test_plc",
                "protocol": "modbus_tcp",
                "connection": {
                    "host": "localhost",
                    "port": 5020,
                    "unit_id": 1
                },
                "modules_assigned": ["raw_intake", "intake_pump_1"]
            }
        ]
    }


@pytest.fixture
def sample_module_templates() -> Dict[str, Any]:
    """Sample module templates for testing."""
    return {
        "module_templates": {
            "raw_intake": {
                "type": "intake",
                "description": "Raw water intake with quality monitoring",
                "required_sensors": ["level", "flow_rate", "turbidity", "ph"],
                "optional_sensors": ["temperature", "dissolved_oxygen"]
            },
            "intake_pump_1": {
                "type": "pumping",
                "description": "Primary intake pump",
                "required_sensors": ["flow_rate", "pressure", "motor_current"],
                "actuators": ["pump_speed"]
            },
            "coagulation_tank": {
                "type": "chemical_treatment",
                "description": "Coagulation and flocculation tank",
                "required_sensors": ["level", "turbidity", "ph"],
                "optional_sensors": ["temperature", "dose_rate"]
            }
        }
    }


@pytest.fixture
def sample_parameter_specs() -> Dict[str, Any]:
    """Sample parameter specifications for testing."""
    return {
        "parameter_specifications": {
            "level": {
                "measurement_type": "level",
                "unit": "m",
                "data_type": "REAL",
                "precision": 2,
                "ranges": {
                    "normal": [0.0, 10.0],
                    "alarm_low": 1.0,
                    "alarm_high": 9.0
                }
            },
            "flow_rate": {
                "measurement_type": "flow",
                "unit": "m³/h",
                "data_type": "REAL",
                "precision": 1,
                "ranges": {
                    "normal": [0.0, 100.0]
                }
            },
            "turbidity": {
                "measurement_type": "turbidity",
                "unit": "NTU",
                "data_type": "REAL",
                "precision": 2,
                "ranges": {
                    "raw_water": [0.0, 500.0],
                    "clarified": [0.0, 50.0],
                    "filtered": [0.0, 1.0]
                }
            },
            "ph": {
                "measurement_type": "ph",
                "unit": "pH",
                "data_type": "REAL",
                "precision": 2,
                "ranges": {
                    "normal": [6.0, 9.0],
                    "alarm_low": 6.5,
                    "alarm_high": 8.5
                }
            }
        }
    }


@pytest.fixture
def write_yaml_config(temp_config_dir):
    """Helper to write YAML configuration files."""
    def _write(filename: str, data: Dict[str, Any], subdir: str = "sites"):
        """Write YAML data to a file in the temp config directory."""
        file_path = temp_config_dir / subdir / filename
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False)

        return file_path

    return _write


@pytest.fixture
def mock_mqtt_client(mocker):
    """Mock MQTT client for testing."""
    mock_client = mocker.MagicMock()
    mock_client.connect.return_value = 0
    mock_client.publish.return_value = (0, 1)
    mock_client.subscribe.return_value = (0, 1)
    return mock_client


@pytest.fixture
def mock_modbus_client(mocker):
    """Mock Modbus client for testing."""
    mock_client = mocker.MagicMock()
    mock_client.connect.return_value = True

    # Mock read responses
    mock_response = mocker.MagicMock()
    mock_response.isError.return_value = False
    mock_response.registers = [100, 200, 300]

    mock_client.read_holding_registers.return_value = mock_response
    mock_client.read_input_registers.return_value = mock_response

    return mock_client


@pytest.fixture
def sample_plant_parameter():
    """Sample PlantParameter for testing."""
    from core.plant_elements import PlantParameter, ComponentRole, ProtocolDataType

    return PlantParameter(
        tag="test-site-01.raw_intake.level",
        component_role=ComponentRole.SENSOR,
        sensor_type="level",
        unit="m",
        protocol_data_type=ProtocolDataType.REAL,
        modbus_address=30001,
        scale_factor=1.0,
        offset=0.0
    )


@pytest.fixture
def sample_plant_component():
    """Sample PlantComponent for testing."""
    from core.plant_elements import PlantComponent, PlantParameter, ComponentRole, ProtocolDataType

    param = PlantParameter(
        tag="test-site-01.raw_intake.level",
        component_role=ComponentRole.SENSOR,
        sensor_type="level",
        unit="m",
        protocol_data_type=ProtocolDataType.REAL,
        modbus_address=30001
    )

    return PlantComponent(
        component_id="raw_intake",
        component_type="intake",
        parameters=[param]
    )
