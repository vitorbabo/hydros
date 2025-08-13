"""
Water Treatment Plant Component Definitions and Sensor Mappings

This module defines the modular components, sensors, and actuators for a complete
water treatment plant simulation based on typical treatment train processes.
"""

import math
import random
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


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


class WTPSimulator:
    """Comprehensive Water Treatment Plant Simulator"""

    def __init__(self, site_id: str = "wtp-porto-01"):
        self.site_id = site_id
        self.components = self._initialize_components()
        self.current_values = {}
        self.component_states = {}
        self._initialize_states()

    def _initialize_components(self) -> Dict[str, WTPComponent]:
        """Initialize all WTP components with their sensors and actuators"""

        components = {}

        # 1. RAW WATER INTAKE
        components["raw_intake"] = WTPComponent(
            component_id="raw_intake",
            component_name="Raw Water Intake",
            component_type="intake",
            parameters=[
                Parameter(
                    "DB1.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.LEVEL,
                    "m",
                    2.0,
                    4.5,
                    2,
                ),
                Parameter(
                    "DB1.DBW102",
                    ParameterType.SENSOR,
                    MeasurementType.FLOW_RATE,
                    "m3/h",
                    20.0,
                    80.0,
                    1,
                ),
                Parameter(
                    "DB1.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.TURBIDITY,
                    "NTU",
                    1.0,
                    25.0,
                    2,
                ),
                Parameter(
                    "DB1.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.PH,
                    "pH",
                    6.8,
                    8.2,
                    2,
                ),
                Parameter(
                    "DB1.DBW108",
                    ParameterType.SENSOR,
                    MeasurementType.TEMPERATURE,
                    "°C",
                    8.0,
                    22.0,
                    1,
                ),
                Parameter(
                    "DB1.DBW110",
                    ParameterType.SENSOR,
                    MeasurementType.CONDUCTIVITY,
                    "µS/cm",
                    150,
                    800,
                    0,
                ),
            ],
        )

        # 2. INTAKE PUMPS
        components["intake_pump_1"] = WTPComponent(
            component_id="intake_pump_1",
            component_name="Intake Pump 1",
            component_type="pump",
            parameters=[
                Parameter(
                    "DB2.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.FLOW_RATE,
                    "m3/h",
                    0.0,
                    40.0,
                    1,
                ),
                Parameter(
                    "DB2.DBW102",
                    ParameterType.SENSOR,
                    MeasurementType.PRESSURE,
                    "bar",
                    0.5,
                    3.2,
                    2,
                ),
                Parameter(
                    "DB2.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.MOTOR_CURRENT,
                    "A",
                    0.0,
                    25.0,
                    1,
                ),
                Parameter(
                    "DB2.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.MOTOR_TEMPERATURE,
                    "°C",
                    20.0,
                    75.0,
                    1,
                ),
                Parameter(
                    "DB2.DBW108",
                    ParameterType.SENSOR,
                    MeasurementType.VIBRATION,
                    "mm/s",
                    0.5,
                    4.5,
                    2,
                ),
                Parameter(
                    "DB2.DBW110",
                    ParameterType.SENSOR,
                    MeasurementType.POWER_CONSUMPTION,
                    "kW",
                    0.0,
                    18.5,
                    1,
                ),
                Parameter(
                    "DB2.DBX100.0",
                    ParameterType.STATUS,
                    MeasurementType.RUN_STATUS,
                    "bool",
                    0,
                    1,
                    0,
                ),
                Parameter(
                    "DB2.DBW112",
                    ParameterType.ACTUATOR,
                    MeasurementType.PUMP_SPEED,
                    "%",
                    0.0,
                    100.0,
                    1,
                ),
            ],
            dependencies=["raw_intake"],
        )

        # 3. COAGULATION/FLOCCULATION
        components["coagulation_tank"] = WTPComponent(
            component_id="coagulation_tank",
            component_name="Coagulation Tank",
            component_type="chemical_treatment",
            parameters=[
                Parameter(
                    "DB3.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.LEVEL,
                    "m",
                    1.5,
                    3.8,
                    2,
                ),
                Parameter(
                    "DB3.DBW102",
                    ParameterType.SENSOR,
                    MeasurementType.PH,
                    "pH",
                    6.0,
                    7.8,
                    2,
                ),
                Parameter(
                    "DB3.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.TURBIDITY,
                    "NTU",
                    2.0,
                    45.0,
                    2,
                ),
                Parameter(
                    "DB3.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.TEMPERATURE,
                    "°C",
                    10.0,
                    22.0,
                    1,
                ),
                Parameter(
                    "DB3.DBW108",
                    ParameterType.SENSOR,
                    MeasurementType.ALKALINITY,
                    "mg/L",
                    80.0,
                    200.0,
                    1,
                ),
            ],
        )

        # 4. CHEMICAL DOSING - COAGULANT
        components["coagulant_dosing"] = WTPComponent(
            component_id="coagulant_dosing",
            component_name="Coagulant Dosing System",
            component_type="chemical_dosing",
            parameters=[
                Parameter(
                    "DB4.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.CHEMICAL_TANK_LEVEL,
                    "m",
                    0.2,
                    2.5,
                    2,
                ),
                Parameter(
                    "DB4.DBW102",
                    ParameterType.ACTUATOR,
                    MeasurementType.CHEMICAL_DOSE_RATE,
                    "mg/L",
                    2.0,
                    25.0,
                    2,
                ),
                Parameter(
                    "DB4.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.FLOW_RATE,
                    "L/h",
                    10.0,
                    180.0,
                    1,
                ),
                Parameter(
                    "DB4.DBX100.0",
                    ParameterType.STATUS,
                    MeasurementType.RUN_STATUS,
                    "bool",
                    0,
                    1,
                    0,
                ),
            ],
            dependencies=["coagulation_tank"],
        )

        # 5. SEDIMENTATION/CLARIFICATION
        components["clarifier_1"] = WTPComponent(
            component_id="clarifier_1",
            component_name="Primary Clarifier",
            component_type="sedimentation",
            parameters=[
                Parameter(
                    "DB5.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.LEVEL,
                    "m",
                    2.8,
                    4.2,
                    2,
                ),
                Parameter(
                    "DB5.DBW102",
                    ParameterType.SENSOR,
                    MeasurementType.TURBIDITY,
                    "NTU",
                    0.5,
                    8.0,
                    2,
                ),
                Parameter(
                    "DB5.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.FLOW_RATE,
                    "m3/h",
                    15.0,
                    65.0,
                    1,
                ),
                Parameter(
                    "DB5.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.PH,
                    "pH",
                    6.5,
                    7.8,
                    2,
                ),
            ],
            dependencies=["coagulation_tank"],
        )

        # 6. FILTRATION
        components["filter_bed_1"] = WTPComponent(
            component_id="filter_bed_1",
            component_name="Rapid Sand Filter 1",
            component_type="filtration",
            parameters=[
                Parameter(
                    "DB6.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.DIFFERENTIAL_PRESSURE,
                    "mbar",
                    50,
                    400,
                    0,
                ),
                Parameter(
                    "DB6.DBW102",
                    ParameterType.SENSOR,
                    MeasurementType.TURBIDITY,
                    "NTU",
                    0.1,
                    2.0,
                    3,
                ),
                Parameter(
                    "DB6.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.FLOW_RATE,
                    "m3/h",
                    10.0,
                    35.0,
                    1,
                ),
                Parameter(
                    "DB6.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.LEVEL,
                    "m",
                    1.8,
                    2.2,
                    2,
                ),
                Parameter(
                    "DB6.DBX100.0",
                    ParameterType.STATUS,
                    MeasurementType.RUN_STATUS,
                    "bool",
                    0,
                    1,
                    0,
                ),
                Parameter(
                    "DB6.DBX100.1",
                    ParameterType.STATUS,
                    MeasurementType.MAINTENANCE_MODE,
                    "bool",
                    0,
                    1,
                    0,
                ),
            ],
            dependencies=["clarifier_1"],
        )

        # 7. DISINFECTION
        components["chlorination"] = WTPComponent(
            component_id="chlorination",
            component_name="Chlorination System",
            component_type="disinfection",
            parameters=[
                Parameter(
                    "DB7.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.CHLORINE_RESIDUAL,
                    "mg/L",
                    0.2,
                    2.5,
                    2,
                ),
                Parameter(
                    "DB7.DBW102",
                    ParameterType.ACTUATOR,
                    MeasurementType.CHEMICAL_DOSE_RATE,
                    "mg/L",
                    0.5,
                    4.0,
                    2,
                ),
                Parameter(
                    "DB7.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.PH,
                    "pH",
                    6.8,
                    7.8,
                    2,
                ),
                Parameter(
                    "DB7.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.TEMPERATURE,
                    "°C",
                    12.0,
                    25.0,
                    1,
                ),
                Parameter(
                    "DB7.DBW108",
                    ParameterType.SENSOR,
                    MeasurementType.CHEMICAL_TANK_LEVEL,
                    "m",
                    0.3,
                    3.0,
                    2,
                ),
            ],
            dependencies=["filter_bed_1"],
        )

        # 8. FINISHED WATER PUMPS
        components["finished_water_pump_1"] = WTPComponent(
            component_id="finished_water_pump_1",
            component_name="Finished Water Pump 1",
            component_type="pump",
            parameters=[
                Parameter(
                    "DB8.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.FLOW_RATE,
                    "m3/h",
                    0.0,
                    45.0,
                    1,
                ),
                Parameter(
                    "DB8.DBW102",
                    ParameterType.SENSOR,
                    MeasurementType.PRESSURE,
                    "bar",
                    1.0,
                    4.5,
                    2,
                ),
                Parameter(
                    "DB8.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.MOTOR_CURRENT,
                    "A",
                    0.0,
                    30.0,
                    1,
                ),
                Parameter(
                    "DB8.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.POWER_CONSUMPTION,
                    "kW",
                    0.0,
                    22.0,
                    1,
                ),
                Parameter(
                    "DB8.DBX100.0",
                    ParameterType.STATUS,
                    MeasurementType.RUN_STATUS,
                    "bool",
                    0,
                    1,
                    0,
                ),
                Parameter(
                    "DB8.DBW108",
                    ParameterType.ACTUATOR,
                    MeasurementType.PUMP_SPEED,
                    "%",
                    0.0,
                    100.0,
                    1,
                ),
            ],
            dependencies=["chlorination"],
        )

        # 9. FINISHED WATER RESERVOIR
        components["finished_water_tank"] = WTPComponent(
            component_id="finished_water_tank",
            component_name="Finished Water Storage Tank",
            component_type="storage",
            parameters=[
                Parameter(
                    "DB9.DBW100",
                    ParameterType.SENSOR,
                    MeasurementType.LEVEL,
                    "m",
                    1.0,
                    8.5,
                    2,
                ),
                Parameter(
                    "DB9.DBW102",
                    ParameterType.SENSOR,
                    MeasurementType.CHLORINE_RESIDUAL,
                    "mg/L",
                    0.3,
                    1.8,
                    2,
                ),
                Parameter(
                    "DB9.DBW104",
                    ParameterType.SENSOR,
                    MeasurementType.PH,
                    "pH",
                    7.0,
                    8.0,
                    2,
                ),
                Parameter(
                    "DB9.DBW106",
                    ParameterType.SENSOR,
                    MeasurementType.TEMPERATURE,
                    "°C",
                    10.0,
                    25.0,
                    1,
                ),
            ],
            dependencies=["finished_water_pump_1"],
        )

        return components

    def _initialize_states(self):
        """Initialize component states and starting values"""
        for comp_id, component in self.components.items():
            self.component_states[comp_id] = {
                "operational": True,
                "maintenance_mode": False,
                "last_maintenance": time.time()
                - random.randint(3600, 86400),  # 1h to 24h ago
            }

            # Initialize parameter values
            for param in component.parameters:
                # Start with values in middle 70% of range to avoid extremes
                range_span = param.max_value - param.min_value
                safe_min = param.min_value + (range_span * 0.15)
                safe_max = param.max_value - (range_span * 0.15)
                initial_value = random.uniform(safe_min, safe_max)

                if param.measurement == MeasurementType.RUN_STATUS:
                    initial_value = 1.0  # Most equipment starts running
                elif param.measurement == MeasurementType.MAINTENANCE_MODE:
                    initial_value = 0.0  # Start in normal operation

                self.current_values[param.tag] = round(initial_value, param.precision)

    def simulate_process_interactions(self):
        """Simulate realistic interactions between treatment processes"""

        # Raw water turbidity affects downstream turbidity
        raw_turbidity = self.current_values.get("DB1.DBW104", 10.0)

        # Coagulation effectiveness based on pH and dose rate
        coag_ph = self.current_values.get("DB3.DBW102", 7.0)
        coag_dose = self.current_values.get("DB4.DBW102", 15.0)
        coag_effectiveness = min(
            1.0, (7.5 - abs(coag_ph - 6.8)) / 2.0 + coag_dose / 30.0
        )

        # Clarifier turbidity depends on coagulation effectiveness
        clarifier_turbidity = max(0.5, raw_turbidity * (1 - coag_effectiveness * 0.8))
        self.current_values["DB5.DBW102"] = round(clarifier_turbidity, 2)

        # Filter differential pressure increases over time
        current_dp = self.current_values.get("DB6.DBW100", 100)
        dp_increase = random.uniform(0.5, 2.0)  # Gradual clogging
        self.current_values["DB6.DBW100"] = min(400, current_dp + dp_increase)

        # Filter turbidity depends on clarifier performance and differential pressure
        filter_effectiveness = min(
            1.0, (400 - current_dp) / 400.0
        )  # Decreases as DP increases
        filter_turbidity = max(
            0.1, clarifier_turbidity * (1 - filter_effectiveness * 0.95)
        )
        self.current_values["DB6.DBW102"] = round(filter_turbidity, 3)

        # Chlorine residual decay over time and consumption by organics
        chlorine_dose = self.current_values.get("DB7.DBW102", 2.0)
        organic_demand = filter_turbidity * 0.5  # Higher turbidity = more organics
        residual_chlorine = max(
            0.2, chlorine_dose - organic_demand - random.uniform(0.1, 0.3)
        )
        self.current_values["DB7.DBW100"] = round(residual_chlorine, 2)

        # Tank chlorine residual slightly lower than dosing point
        tank_residual = max(0.3, residual_chlorine - random.uniform(0.05, 0.15))
        self.current_values["DB9.DBW102"] = round(tank_residual, 2)

    def simulate_equipment_behavior(self):
        """Simulate realistic equipment behavior and wear"""

        for comp_id, component in self.components.items():
            state = self.component_states[comp_id]

            for param in component.parameters:
                current_val = self.current_values.get(param.tag, 0)

                if param.parameter_type == ParameterType.SENSOR:
                    # Add realistic noise and trends
                    noise_factor = (
                        param.max_value - param.min_value
                    ) * 0.02  # 2% noise
                    noise = random.uniform(-noise_factor, noise_factor)

                    # Equipment degradation over time
                    if param.measurement == MeasurementType.VIBRATION:
                        # Vibration slowly increases over time
                        drift = random.uniform(0, 0.01)
                    elif param.measurement == MeasurementType.MOTOR_TEMPERATURE:
                        # Temperature varies with load and ambient
                        drift = random.uniform(-0.5, 0.8)
                    else:
                        drift = random.uniform(-noise_factor / 2, noise_factor / 2)

                    new_value = current_val + noise + drift
                    new_value = max(param.min_value, min(param.max_value, new_value))
                    self.current_values[param.tag] = round(new_value, param.precision)

                elif param.parameter_type == ParameterType.ACTUATOR:
                    # Actuators respond to control logic (simplified)
                    if param.measurement == MeasurementType.PUMP_SPEED:
                        # Pump speed varies based on demand
                        target_speed = random.uniform(60, 95)  # Typical operating range
                        speed_change = (
                            target_speed - current_val
                        ) * 0.1  # Gradual change
                        new_speed = current_val + speed_change
                        self.current_values[param.tag] = round(
                            max(0, min(100, new_speed)), 1
                        )

                    elif param.measurement == MeasurementType.CHEMICAL_DOSE_RATE:
                        # Dose rate adjusts based on water quality (simplified)
                        if "coagulant" in comp_id:
                            raw_turbidity = self.current_values.get("DB1.DBW104", 10.0)
                            target_dose = (
                                8.0 + (raw_turbidity - 10.0) * 0.5
                            )  # More turbid = more coagulant
                        elif "chlorination" in comp_id:
                            target_dose = 1.5 + random.uniform(
                                0, 1.0
                            )  # Chlorine demand varies
                        else:
                            target_dose = current_val

                        dose_change = (target_dose - current_val) * 0.05
                        new_dose = current_val + dose_change
                        self.current_values[param.tag] = round(
                            max(param.min_value, min(param.max_value, new_dose)),
                            param.precision,
                        )

    def generate_raw_data(self, seq: int) -> dict:
        """Generate comprehensive raw PLC data"""

        # Simulate process interactions
        self.simulate_process_interactions()

        # Simulate equipment behavior
        self.simulate_equipment_behavior()

        # Prepare tags dictionary
        tags = {}
        for component in self.components.values():
            for param in component.parameters:
                value = self.current_values[param.tag]

                # Simulate occasional quality issues
                if random.random() < param.quality_degradation_chance:
                    # Simulate sensor drift or failure
                    if random.random() < 0.5:
                        # Sensor drift
                        drift_factor = random.uniform(0.8, 1.2)
                        value = value * drift_factor
                    else:
                        # Sensor stuck/freeze
                        pass  # Keep previous value

                tags[param.tag] = value

        return {
            "site_id": self.site_id,
            "source": "siemens-s7-1500",  # Upgraded PLC model
            "seq": seq,
            "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "tags": tags,
        }

    def get_tag_mapping(self) -> Dict[str, Dict[str, Any]]:
        """Generate the mapping configuration for tag transformation"""

        mapping = {}
        for component in self.components.values():
            for param in component.parameters:
                mapping[param.tag] = {
                    "asset_id": component.component_id,
                    "sensor_id": f"{param.measurement.value}-{component.component_id}",
                    "measurement": param.measurement.value,
                    "unit": param.unit,
                    "parameter_type": param.parameter_type.value,
                    "component_type": component.component_type,
                }

        return mapping
