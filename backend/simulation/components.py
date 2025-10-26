#!/usr/bin/env python3
"""
Simulation Components

Wrapper classes that provide simulation behavior for WTP components.
These classes wrap the PlantComponent dataclass to provide update() and get_parameters() methods.
"""

import math
import random
import time
from typing import Any, Dict, Optional

from core.plant_elements import (
    ComponentRole,
    PlantComponent,
    PlantParameter,
    SensorType,
)
from core.sensor_catalog import get_parameter_library, ParameterSpecification
from .values_generator import SimulationValueGenerator, SimulationContext


class SimulatedPlantComponent:
    """
    Simulation wrapper for PlantComponent that provides dynamic behavior.

    This class wraps a PlantComponent dataclass and adds simulation logic
    to make parameters change over time with realistic behavior patterns.
    """

    def __init__(self, wtp_component: PlantComponent, module_type: Optional[str] = None):
        self.component = wtp_component
        self.current_values = {}
        self.last_update = time.time()
        self.simulation_time = 0.0

        # Simulation state (initialize before _initialize_values)
        self.operating = True
        self.fault_probability = 0.001  # 0.1% chance of fault per update

        # Module type for context-aware simulation
        self.module_type = module_type or wtp_component.component_type

        # Initialize realistic value generator
        try:
            self.value_generator = SimulationValueGenerator(get_parameter_library())
        except Exception as e:
            # Fallback to None if parameter library not available
            import logging
            logging.warning(f"Failed to load parameter library for realistic simulation: {e}")
            self.value_generator = None

        # Simulation context
        self.context = SimulationContext(
            module_type=self.module_type,
            quality_target="good",  # Default to good quality operation
            operating=self.operating,
            simulation_time=0.0,
        )

        # Initialize parameter values
        self._initialize_values()

    def _initialize_values(self):
        """Initialize parameter values within realistic ranges"""
        for param in self.component.parameters:
            param_name = self._get_parameter_name(param)

            # Try to use realistic value generator if available
            if self.value_generator and param_name:
                try:
                    initial_value = self.value_generator.get_initial_value(
                        param_name, self.context
                    )
                    self.current_values[param_name] = initial_value
                    continue
                except Exception as e:
                    # Fall through to legacy initialization
                    import logging
                    logging.debug(f"Failed to generate realistic value for {param_name}: {e}")

            # Legacy initialization as fallback
            if param.component_role == ComponentRole.SENSOR:
                # Initialize sensors to mid-range with slight variation
                mid_value = (param.min_value + param.max_value) / 2
                variation = (param.max_value - param.min_value) * 0.1
                initial_value = mid_value + random.uniform(-variation, variation)
                initial_value = max(
                    param.min_value, min(param.max_value, initial_value)
                )

            elif param.component_role == ComponentRole.ACTUATOR:
                # Initialize actuators based on component type
                if param.sensor_type == SensorType.PUMP_SPEED:
                    initial_value = random.uniform(70, 90)  # Typical operating range
                elif param.sensor_type == SensorType.VALVE_POSITION:
                    initial_value = random.uniform(30, 70)  # Partially open
                else:
                    initial_value = random.uniform(
                        param.min_value * 0.7, param.max_value * 0.9
                    )

            elif param.component_role == ComponentRole.STATUS:
                # Status parameters are typically boolean or discrete
                if param.sensor_type == SensorType.RUN_STATUS:
                    initial_value = 1 if self.operating else 0
                elif param.sensor_type == SensorType.ALARM_STATUS:
                    initial_value = 0  # No alarms initially
                elif param.sensor_type == SensorType.MAINTENANCE_MODE:
                    initial_value = 0  # Not in maintenance
                else:
                    initial_value = random.choice([0, 1])
            else:
                # Default to mid-range
                initial_value = (param.min_value + param.max_value) / 2

            # Round to appropriate precision
            if param.precision == 0:
                initial_value = int(initial_value)
            else:
                initial_value = round(initial_value, param.precision)

            self.current_values[param_name] = initial_value

    def _get_parameter_name(self, param: PlantParameter) -> str:
        """Get a clean parameter name from measurement type"""
        measurement_to_name = {
            SensorType.LEVEL: "level",
            SensorType.FLOW_RATE: "flow_rate",
            SensorType.TURBIDITY: "turbidity",
            SensorType.PH: "ph",
            SensorType.TEMPERATURE: "temperature",
            SensorType.PRESSURE: "pressure",
            SensorType.DIFFERENTIAL_PRESSURE: "differential_pressure",
            SensorType.CONDUCTIVITY: "conductivity",
            SensorType.DISSOLVED_OXYGEN: "dissolved_oxygen",
            SensorType.CHLORINE_RESIDUAL: "chlorine_residual",
            SensorType.ALKALINITY: "alkalinity",
            SensorType.TOC: "toc",
            SensorType.MOTOR_CURRENT: "motor_current",
            SensorType.MOTOR_TEMPERATURE: "motor_temperature",
            SensorType.VIBRATION: "vibration",
            SensorType.POWER_CONSUMPTION: "power_consumption",
            SensorType.CHEMICAL_TANK_LEVEL: "chemical_tank_level",
            SensorType.DOSE_RATE: "dose_rate",
            SensorType.PUMP_SPEED: "pump_speed",
            SensorType.VALVE_POSITION: "valve_position",
            SensorType.RUN_STATUS: "run_status",
            SensorType.ALARM_STATUS: "alarm_status",
            SensorType.MAINTENANCE_MODE: "maintenance_mode",
        }
        return measurement_to_name.get(
            param.sensor_type, param.sensor_type.value.lower()
        )

    def update(self):
        """Update component simulation state"""
        current_time = time.time()
        dt = current_time - self.last_update
        self.last_update = current_time
        self.simulation_time += dt

        # Update simulation context
        self.context.simulation_time = self.simulation_time
        self.context.operating = self.operating

        # Update temperature and flow rate from current values if available
        if "temperature" in self.current_values:
            self.context.temperature = self.current_values["temperature"]
        if "flow_rate" in self.current_values:
            self.context.flow_rate = self.current_values["flow_rate"]

        # Update each parameter based on its type and behavior
        for param in self.component.parameters:
            param_name = self._get_parameter_name(param)
            current_value = self.current_values[param_name]

            # Try realistic value generator first
            if self.value_generator and param_name:
                try:
                    # Handle status parameters separately
                    if param.component_role == ComponentRole.STATUS:
                        new_value = self._simulate_status_behavior(param, current_value, dt)
                    else:
                        new_value = self.value_generator.simulate_value_update(
                            param_name, current_value, dt, self.context
                        )
                    self.current_values[param_name] = new_value
                    continue
                except Exception as e:
                    # Fall through to legacy simulation
                    import logging
                    logging.debug(f"Failed to update realistic value for {param_name}: {e}")

            # Legacy simulation as fallback
            if param.component_role == ComponentRole.SENSOR:
                new_value = self._simulate_sensor_behavior(param, current_value, dt)
            elif param.component_role == ComponentRole.ACTUATOR:
                new_value = self._simulate_actuator_behavior(param, current_value, dt)
            elif param.component_role == ComponentRole.STATUS:
                new_value = self._simulate_status_behavior(param, current_value, dt)
            else:
                new_value = current_value

            # Apply bounds and precision
            new_value = max(param.min_value, min(param.max_value, new_value))
            if param.precision == 0:
                new_value = int(new_value)
            else:
                new_value = round(new_value, param.precision)

            self.current_values[param_name] = new_value

    def _simulate_sensor_behavior(
        self, param: PlantParameter, current_value: float, dt: float
    ) -> float:
        """Simulate realistic sensor behavior with noise and trends"""
        # Base noise (measurement uncertainty)
        noise_factor = (param.max_value - param.min_value) * 0.01  # 1% of range
        noise = random.uniform(-noise_factor, noise_factor)

        # Slow trends (process variations)
        trend_period = 300.0  # 5 minute cycles
        trend_amplitude = (param.max_value - param.min_value) * 0.05  # 5% of range
        trend = (
            math.sin(self.simulation_time * 2 * math.pi / trend_period)
            * trend_amplitude
        )

        # Equipment-specific behavior
        equipment_variation = 0.0

        if param.sensor_type == SensorType.FLOW_RATE:
            # Flow rates vary with demand cycles
            demand_cycle = (
                math.sin(self.simulation_time * 2 * math.pi / 7200) * 0.2
            )  # 2-hour cycle
            equipment_variation = current_value * demand_cycle

        elif param.sensor_type == SensorType.LEVEL:
            # Tank levels change slowly
            level_change = random.uniform(-0.02, 0.02) * dt  # Slow level changes
            equipment_variation = level_change

        elif param.sensor_type == SensorType.PRESSURE:
            # Pressure fluctuates with pump operation
            if self.operating:
                pressure_variation = random.uniform(-0.1, 0.1)
                equipment_variation = pressure_variation

        elif param.sensor_type == SensorType.TEMPERATURE:
            # Temperature follows slow thermal cycles
            thermal_cycle = (
                math.sin(self.simulation_time * 2 * math.pi / 3600) * 2.0
            )  # 1-hour cycle, ±2°C
            equipment_variation = thermal_cycle * 0.1  # Gradual change

        elif param.sensor_type == SensorType.MOTOR_CURRENT:
            # Motor current varies with load
            if self.operating:
                load_variation = random.uniform(-0.5, 0.5)
                equipment_variation = load_variation
            else:
                return 0.0  # No current when not running

        return current_value + noise + trend * dt + equipment_variation * dt

    def _simulate_actuator_behavior(
        self, param: PlantParameter, current_value: float, dt: float
    ) -> float:
        """Simulate actuator behavior (pumps, valves, etc.)"""
        if param.sensor_type == SensorType.PUMP_SPEED:
            if self.operating:
                # Pump speed varies slightly around setpoint
                variation = random.uniform(-2.0, 2.0) * dt
                target_speed = 85.0  # Target operating speed
                # Gradually move toward target
                speed_change = (target_speed - current_value) * 0.1 * dt
                return current_value + variation + speed_change
            else:
                return 0.0  # Pump stopped

        elif param.sensor_type == SensorType.VALVE_POSITION:
            # Valve position changes slowly for control
            position_change = random.uniform(-1.0, 1.0) * dt
            return current_value + position_change

        elif param.sensor_type == SensorType.DOSE_RATE:
            # Chemical dosing varies with water quality feedback
            dose_variation = random.uniform(-0.5, 0.5) * dt
            return current_value + dose_variation

        return current_value

    def _simulate_status_behavior(
        self, param: PlantParameter, current_value: float, dt: float
    ) -> float:
        """Simulate status parameter behavior"""
        if param.sensor_type == SensorType.RUN_STATUS:
            # Occasionally simulate start/stop events
            if random.random() < 0.001:  # 0.1% chance per update
                return 1.0 if current_value == 0.0 else 0.0
            return current_value

        elif param.sensor_type == SensorType.ALARM_STATUS:
            # Rarely trigger alarms
            if random.random() < 0.0005:  # 0.05% chance
                return 1.0
            elif (
                current_value == 1.0 and random.random() < 0.1
            ):  # 10% chance to clear alarm
                return 0.0
            return current_value

        elif param.sensor_type == SensorType.MAINTENANCE_MODE:
            # Very rarely enter maintenance mode
            if random.random() < 0.0001:  # 0.01% chance
                return 1.0 if current_value == 0.0 else 0.0
            return current_value

        return current_value

    def get_parameters(self) -> Dict[str, Any]:
        """Get current parameter values"""
        return self.current_values.copy()

    def set_parameter(self, parameter_name: str, value: Any) -> bool:
        """Set a parameter value (for actuators and setpoints)"""
        if parameter_name in self.current_values:
            # Find the parameter definition to check if it's writable
            for param in self.component.parameters:
                param_name = self._get_parameter_name(param)
                if param_name == parameter_name:
                    if param.component_role in [
                        ComponentRole.ACTUATOR,
                        ComponentRole.STATUS,
                    ]:
                        # Apply bounds
                        value = max(param.min_value, min(param.max_value, value))
                        if param.precision == 0:
                            value = int(value)
                        else:
                            value = round(value, param.precision)
                        self.current_values[parameter_name] = value
                        return True
                    break
        return False

    def get_component_info(self) -> Dict[str, Any]:
        """Get component metadata"""
        return {
            "component_id": self.component.component_id,
            "component_name": self.component.component_name,
            "component_type": self.component.component_type,
            "parameter_count": len(self.component.parameters),
            "operating": self.operating,
            "simulation_time": self.simulation_time,
        }

    def set_operating_state(self, operating: bool):
        """Set component operating state"""
        self.operating = operating
        self.context.operating = operating
        # Update run_status parameter if it exists
        for param in self.component.parameters:
            if param.sensor_type == SensorType.RUN_STATUS:
                param_name = self._get_parameter_name(param)
                self.current_values[param_name] = 1.0 if operating else 0.0
                break

    def set_quality_target(self, quality: str):
        """
        Set the quality target for simulation.

        Args:
            quality: One of "excellent", "good", "acceptable", "poor"
        """
        valid_qualities = ["excellent", "good", "acceptable", "poor"]
        if quality in valid_qualities:
            self.context.quality_target = quality
        else:
            import logging
            logging.warning(f"Invalid quality target: {quality}. Must be one of {valid_qualities}")

    def set_module_type(self, module_type: str):
        """Set the module type for context-aware simulation"""
        self.module_type = module_type
        self.context.module_type = module_type
