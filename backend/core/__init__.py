"""
Core Digital Twin Components for Hydros Water Treatment Plant System.

This module provides the fundamental building blocks for modeling water treatment plants:

Components:
- digital_twin: Digital twin of the water treatment plant managing all components and states
- plant_builder: Factory for constructing plant configurations from templates
- plant_elements: Core data structures (sensors, actuators, components)
- sensor_catalog: Centralized library of sensor specifications and parameters
- protocol_mapper: Protocol address mapping for Modbus, OPC UA, S7 communication

Key Classes:
- DigitalTwin: Central digital twin managing plant components and real-time data
- PlantComponent: Physical equipment components (pumps, filters, tanks, etc.)
- PlantParameter: Unified sensor/actuator parameter definitions
- ComponentRole: Parameter roles (SENSOR, ACTUATOR, STATUS)
- SensorType: Types of measurements (turbidity, pH, flow rate, etc.)
- ProtocolDataType: Data types for industrial protocols (BOOL, REAL, INT, etc.)
"""

from .digital_twin import ComponentInfo, DigitalTwin, OperationalState
from .plant_builder import ComponentFactory
from .plant_elements import (
    ComponentRole,
    PlantComponent,
    PlantParameter,
    ProtocolDataType,
    SensorType,
)
from .protocol_mapper import ProtocolMapper
from .sensor_catalog import ParameterLibrary, ParameterSpecification

__all__ = [
    "DigitalTwin",
    "ComponentInfo",
    "OperationalState",
    "ComponentFactory",
    "PlantComponent",
    "PlantParameter",
    "ComponentRole",
    "SensorType",
    "ProtocolDataType",
    "ProtocolMapper",
    "ParameterLibrary",
    "ParameterSpecification",
]
