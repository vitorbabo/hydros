"""
Water Treatment Plant Component Definitions and Sensor Mappings

This module defines the modular components, sensors, and actuators for a complete
water treatment plant digital twin based on typical treatment train processes.
"""

from dataclasses import dataclass
from enum import Enum
from typing import List


class ParameterType(Enum):
    SENSOR = "sensor"
    ACTUATOR = "actuator"
    STATUS = "status"


class MeasurementType(Enum):
    # Water Quality Parameters
    TURBIDITY = "turbidity"
    PH = "ph"
    TEMPERATURE = "temperature"
    DISSOLVED_OXYGEN = "dissolved_oxygen"
    CONDUCTIVITY = "conductivity"
    CHLORINE_RESIDUAL = "chlorine_residual"
    ALKALINITY = "alkalinity"
    TOC = "total_organic_carbon"

    # Physical Parameters
    LEVEL = "level"
    FLOW_RATE = "flow_rate"
    PRESSURE = "pressure"
    DIFFERENTIAL_PRESSURE = "differential_pressure"

    # Chemical Dosing
    CHEMICAL_DOSE_RATE = "chemical_dose_rate"
    CHEMICAL_TANK_LEVEL = "chemical_tank_level"

    # Equipment Parameters
    MOTOR_CURRENT = "motor_current"
    MOTOR_TEMPERATURE = "motor_temperature"
    VIBRATION = "vibration"
    POWER_CONSUMPTION = "power_consumption"
    PUMP_SPEED = "pump_speed"
    VALVE_POSITION = "valve_position"

    # Status Parameters
    RUN_STATUS = "run_status"
    ALARM_STATUS = "alarm_status"
    MAINTENANCE_MODE = "maintenance_mode"


@dataclass
class Parameter:
    tag: str
    parameter_type: ParameterType
    measurement: MeasurementType
    unit: str
    min_value: float
    max_value: float
    precision: int = 2
    quality_degradation_chance: float = 0.02  # 2% chance of quality issues


@dataclass
class WTPComponent:
    component_id: str
    component_name: str
    component_type: str
    parameters: List[Parameter]
    dependencies: List[str] = None  # Components this depends on

    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []
