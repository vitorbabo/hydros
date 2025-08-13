"""
Core plant modeling components for Hydros WTP system.

This module contains all the core plant modeling functionality:
- Plant model (digital twin)
- Component factory for creating WTP components
- WTP component definitions and simulation logic
- Address allocation for protocol mapping
- Protocol management
"""

from .plant_model import PlantModel, ComponentMetadata, ComponentState
from .component_factory import ComponentFactory
from .wtp_components import WTPComponent, Parameter, ParameterType, MeasurementType
from .address_allocator import AddressAllocator
from .protocol_manager import DynamicModbusServer, DynamicModbusClient, ProtocolMapping

__all__ = [
    "PlantModel",
    "ComponentMetadata",
    "ComponentState",
    "ComponentFactory",
    "WTPComponent",
    "Parameter",
    "ParameterType",
    "MeasurementType",
    "AddressAllocator",
    "DynamicModbusServer",
    "DynamicModbusClient",
    "ProtocolMapping",
]
