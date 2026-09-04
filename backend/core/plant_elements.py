"""
Plant Elements - Core Data Structures for Water Treatment Plants

This module defines the fundamental data structures used throughout the Hydros system:
- ProtocolDataType: Data types for industrial protocols (Modbus, OPC UA, S7)
- ComponentRole: Parameter roles (sensor, actuator, status indicator)
- SensorType: Comprehensive catalog of water treatment measurements
- PlantParameter: Unified parameter definition with protocol addressing
- PlantComponent: Physical equipment components (pumps, filters, tanks, etc.)

These classes provide a consistent interface for representing water treatment plant
equipment, sensors, and control systems across simulation and real-world deployments.
"""

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional


class ProtocolDataType(Enum):
    """Standard data types for protocol mapping"""

    BOOL = "BOOL"
    INT = "INT"
    INT16 = "INT16"
    UINT16 = "UINT16"
    INT32 = "INT32"
    UINT32 = "UINT32"
    REAL = "REAL"
    STRING = "STRING"

    @classmethod
    def from_string(cls, data_type_str: str) -> "ProtocolDataType":
        """Convert string representation to DataType enum"""
        mapping = {
            "bool": cls.BOOL,
            "int": cls.INT,
            "int16": cls.INT16,
            "uint16": cls.UINT16,
            "int32": cls.INT32,
            "uint32": cls.UINT32,
            "real": cls.REAL,
            "REAL": cls.REAL,
            "string": cls.STRING,
        }
        return mapping.get(data_type_str, cls.REAL)


class ComponentRole(Enum):
    """Role of a component parameter (sensor, actuator, or status indicator)"""

    SENSOR = "sensor"
    ACTUATOR = "actuator"
    STATUS = "status"


class OperationalState(Enum):
    """Operational state of a component"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    FAULT = "fault"
    MAINTENANCE = "maintenance"
    OFFLINE = "offline"


class SensorType(Enum):
    """Types of sensors and measurements available in water treatment plants"""

    # Water Quality Parameters
    TURBIDITY = "turbidity"
    PH = "ph"
    TEMPERATURE = "temperature"
    DISSOLVED_OXYGEN = "dissolved_oxygen"
    CONDUCTIVITY = "conductivity"
    CHLORINE_RESIDUAL = "chlorine_residual"
    ALKALINITY = "alkalinity"
    TOC = "toc"
    FLUORIDE_RESIDUAL = "fluoride_residual"
    UV_TRANSMITTANCE = "uv_transmittance"
    PARTICLE_COUNT = "particle_count"
    CHLOROPHYLL_A = "chlorophyll_a"
    BLUE_GREEN_ALGAE = "blue_green_algae"
    HETEROTROPHIC_PLATE_COUNT = "heterotrophic_plate_count"
    ZETA_POTENTIAL = "zeta_potential"
    STREAMING_CURRENT = "streaming_current"

    # Physical Parameters
    LEVEL = "level"
    FLOW_RATE = "flow_rate"
    PRESSURE = "pressure"
    DIFFERENTIAL_PRESSURE = "differential_pressure"
    TRANSMEMBRANE_PRESSURE = "transmembrane_pressure"
    BACKWASH_PRESSURE = "backwash_pressure"
    OVERFLOW_WEIR_LEVEL = "overflow_weir_level"
    SLUDGE_BLANKET_LEVEL = "sludge_blanket_level"
    SLUDGE_DENSITY = "sludge_density"
    WATER_AGE = "water_age"
    RETENTION_TIME = "retention_time"

    # Chemical Dosing
    DOSE_RATE = "dose_rate"
    CHEMICAL_TANK_LEVEL = "chemical_tank_level"
    PH_FEEDBACK = "ph_feedback"
    SLUDGE_REMOVAL_RATE = "sludge_removal_rate"

    # Equipment Parameters
    MOTOR_CURRENT = "motor_current"
    MOTOR_TEMPERATURE = "motor_temperature"
    VIBRATION = "vibration"
    POWER_CONSUMPTION = "power_consumption"
    PUMP_SPEED = "pump_speed"
    VALVE_POSITION = "valve_position"
    MIXER_SPEED = "mixer_speed"
    SCREEN_SPEED = "screen_speed"
    UV_INTENSITY = "uv_intensity"
    LAMP_POWER = "lamp_power"

    # Status Parameters
    RUN_STATUS = "run_status"
    ALARM_STATUS = "alarm_status"
    MAINTENANCE_MODE = "maintenance_mode"
    LAMP_STATUS = "lamp_status"
    BACKWASH_INITIATION = "backwash_initiation"
    FILTER_TO_WASTE = "filter_to_waste"
    CLEANING_CYCLE = "cleaning_cycle"
    CLEANING_FREQUENCY = "cleaning_frequency"


@dataclass
class PlantParameter:
    """Unified parameter definition for water treatment plant components"""

    tag: str
    component_role: ComponentRole
    sensor_type: SensorType
    unit: str
    min_value: float
    max_value: float
    protocol_data_type: ProtocolDataType = ProtocolDataType.REAL
    precision: int = 2
    access_mode: str = "read"  # read, write, read_write
    description: str = ""
    component_id: Optional[str] = None  # Component this parameter belongs to
    quality_degradation_chance: float = 0.02  # 2% chance of quality issues

    # Protocol-specific addressing (populated by address allocator)
    modbus_address: Optional[int] = None
    modbus_type: Optional[str] = None
    opcua_node_id: Optional[str] = None
    s7_address: Optional[str] = None
    scale_factor: float = 1.0
    offset: float = 0.0

    @property
    def parameter_id(self) -> str:
        """Get standardized parameter ID"""
        if self.component_id:
            return f"{self.component_id}.{self.tag}"
        return self.tag

    @property
    def parameter_name(self) -> str:
        """Get parameter name from tag"""
        return self.tag

    def get_min_max(self) -> tuple[float, float]:
        """Get min and max values"""
        return self.min_value, self.max_value


@dataclass
class PlantComponent:
    """A physical component or system in the water treatment plant"""

    component_id: str
    component_name: str
    component_type: str
    parameters: List[PlantParameter]
    dependencies: List[str] = None  # Components this depends on

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
