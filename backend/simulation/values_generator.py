#!/usr/bin/env python3
"""
Realistic Simulation Value Generator

Generates realistic sensor and actuator values based on parameter specifications
from the parameter library, taking into account:
- Proper ranges for each parameter type
- Quality indicators (excellent, good, acceptable, poor)
- Equipment-specific behaviors and physical relationships
- Correlations between parameters (temperature compensation, flow proportional dosing)
- Schema-compliant value generation
"""

import logging
import math
import random
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

from core.sensor_catalog import ParameterLibrary, ParameterSpecification

logger = logging.getLogger(__name__)


@dataclass
class SimulationContext:
    """Context information for realistic simulation"""

    module_type: Optional[str] = None  # e.g., "filtration", "chlorination"
    quality_target: str = "good"  # excellent, good, acceptable, poor
    operating: bool = True
    temperature: float = 20.0  # Ambient/process temperature
    flow_rate: float = 100.0  # Current flow rate for flow-proportional calculations
    simulation_time: float = 0.0


class SimulationValueGenerator:
    """
    Generates realistic values for water treatment plant sensors and actuators
    based on parameter specifications and physical relationships.
    """

    def __init__(self, parameter_library: Optional[ParameterLibrary] = None):
        """
        Initialize the realistic value generator.

        Args:
            parameter_library: Parameter library instance. If None, creates default.
        """
        if parameter_library is None:
            from core.sensor_catalog import get_parameter_library

            parameter_library = get_parameter_library()

        self.param_lib = parameter_library
        self.logger = logging.getLogger(self.__class__.__name__)

        # Cache parameter specs for quick lookup
        self._spec_cache: Dict[str, ParameterSpecification] = {}

    def get_parameter_spec(self, param_name: str) -> Optional[ParameterSpecification]:
        """Get parameter specification with caching"""
        if param_name not in self._spec_cache:
            self._spec_cache[param_name] = self.param_lib.get_parameter_spec(param_name)
        return self._spec_cache[param_name]

    def get_initial_value(
        self, param_name: str, context: Optional[SimulationContext] = None
    ) -> float:
        """
        Get realistic initial value for a parameter.

        Args:
            param_name: Parameter name (e.g., "turbidity", "ph", "flow_rate")
            context: Simulation context for context-aware initialization

        Returns:
            Initial value within appropriate range
        """
        if context is None:
            context = SimulationContext()

        spec = self.get_parameter_spec(param_name)
        if spec is None:
            self.logger.warning(f"No specification found for parameter: {param_name}")
            return 0.0

        # Get target range based on context
        target_range = self._get_target_range(spec, context)
        if not target_range or len(target_range) < 2:
            # Fallback to default range
            min_val, max_val = spec.get_min_max()
            target_range = [min_val, max_val]

        # Generate value within quality-appropriate range
        min_val, max_val = target_range[0], target_range[1]
        center = (min_val + max_val) / 2
        range_size = max_val - min_val

        if context.quality_target == "excellent":
            # Near optimal center with tight distribution
            variation = range_size * 0.15  # 15% of range
            value = center + random.gauss(0, variation / 2)
            # Clamp to range
            value = max(min_val, min(max_val, value))

        elif context.quality_target == "good":
            # Within good range with moderate variation
            # Use gaussian distribution centered on the range
            variation = range_size * 0.3  # 30% of range
            value = center + random.gauss(0, variation / 2)
            # Clamp to range
            value = max(min_val, min(max_val, value))

        elif context.quality_target == "acceptable":
            # Wider variation, can be near edges
            variation = range_size * 0.5  # 50% of range
            value = center + random.gauss(0, variation / 2)
            # Clamp to range
            value = max(min_val, min(max_val, value))

        else:  # poor
            # Can be anywhere in range with bias toward edges
            if random.random() < 0.3:
                # 30% chance: near minimum
                value = min_val + random.uniform(0, range_size * 0.15)
            elif random.random() < 0.6:
                # 30% chance: near maximum
                value = max_val - random.uniform(0, range_size * 0.15)
            else:
                # 40% chance: anywhere in range
                value = random.uniform(min_val, max_val)

        # Apply physical constraints for specific parameters
        value = self._apply_parameter_constraints(param_name, value, context)

        # Round to appropriate precision
        value = round(value, spec.precision)

        return value

    def simulate_value_update(
        self,
        param_name: str,
        current_value: float,
        dt: float,
        context: Optional[SimulationContext] = None,
    ) -> float:
        """
        Update parameter value with realistic behavior.

        Args:
            param_name: Parameter name
            current_value: Current parameter value
            dt: Time step in seconds
            context: Simulation context

        Returns:
            Updated value
        """
        if context is None:
            context = SimulationContext()

        spec = self.get_parameter_spec(param_name)
        if spec is None:
            return current_value

        # Get target range for stability
        target_range = self._get_target_range(spec, context)
        if not target_range or len(target_range) < 2:
            min_val, max_val = spec.get_min_max()
            target_range = [min_val, max_val]

        # Apply parameter-specific simulation logic
        new_value = self._apply_parameter_behavior(
            param_name, current_value, dt, context, spec, target_range
        )

        # Apply bounds
        min_val, max_val = spec.get_min_max()
        new_value = max(min_val, min(max_val, new_value))

        # Round to precision
        new_value = round(new_value, spec.precision)

        return new_value

    def _get_target_range(
        self, spec: ParameterSpecification, context: SimulationContext
    ) -> Optional[Tuple[float, float]]:
        """Get appropriate target range based on context"""

        # First, try module-type specific ranges (most specific)
        if context.module_type:
            range_key = None
            module_lower = context.module_type.lower()

            # Map module types to range keys
            if "filter" in module_lower or "filtration" in module_lower:
                range_key = "filtered"
            elif "clarif" in module_lower or "sedimentation" in module_lower:
                range_key = "clarified"
            elif "membrane" in module_lower:
                range_key = "membrane_filtered"
            elif "raw" in module_lower or "intake" in module_lower:
                range_key = "raw_water"

            if range_key and range_key in spec.ranges:
                range_vals = spec.ranges[range_key]
                if len(range_vals) >= 2:
                    return (range_vals[0], range_vals[1])

        # Check for quality indicators
        quality_indicator_ranges = {}
        for range_name in ["excellent", "good", "acceptable", "poor"]:
            if range_name in spec.ranges:
                quality_indicator_ranges[range_name] = spec.ranges[range_name]

        if quality_indicator_ranges and context.quality_target in quality_indicator_ranges:
            range_vals = quality_indicator_ranges[context.quality_target]
            if len(range_vals) >= 2:
                return (range_vals[0], range_vals[1])

        # Try typical/normal/standard ranges
        for range_name in ["typical", "normal", "standard", "drinking_water", "process_water"]:
            if range_name in spec.ranges:
                range_vals = spec.ranges[range_name]
                if len(range_vals) >= 2:
                    return (range_vals[0], range_vals[1])

        # Use default range from spec
        default_range = spec.get_default_range()
        if default_range and len(default_range) >= 2:
            return (default_range[0], default_range[1])

        return None

    def _apply_parameter_constraints(
        self, param_name: str, value: float, context: SimulationContext
    ) -> float:
        """Apply physical constraints and relationships to parameter values"""

        # Motor current should be 0 when not operating
        if param_name == "motor_current" and not context.operating:
            return 0.0

        # Pump speed should be 0 or above minimum when not operating
        if param_name == "pump_speed" and not context.operating:
            return 0.0

        # Chlorine residual should be 0 in raw water (before chlorination)
        if param_name == "chlorine_residual":
            if context.module_type and any(x in context.module_type.lower()
                                          for x in ["intake", "raw", "pretreat"]):
                return 0.0
            # Ensure non-negative
            value = max(0.0, value)

        # Non-negative parameters
        non_negative_params = [
            "turbidity", "level", "flow_rate", "pressure", "differential_pressure",
            "dissolved_oxygen", "alkalinity", "toc", "vibration", "power_consumption",
            "chemical_tank_level", "dose_rate"
        ]
        if param_name in non_negative_params:
            value = max(0.0, value)

        # Temperature-dependent parameters
        if param_name in [
            "dissolved_oxygen",
            "conductivity",
        ] and context.temperature != 20.0:
            spec = self.get_parameter_spec(param_name)
            if spec and hasattr(spec, "temperature_coefficient"):
                # Apply temperature compensation
                # temp_diff = context.temperature - 20.0
                # This is simplified - real compensation would be in the measurement
                pass

        return value

    def _apply_parameter_behavior(
        self,
        param_name: str,
        current_value: float,
        dt: float,
        context: SimulationContext,
        spec: ParameterSpecification,
        target_range: Tuple[float, float],
    ) -> float:
        """Apply parameter-specific realistic behavior"""

        # Get center of target range for stability reference
        range_center = (target_range[0] + target_range[1]) / 2
        range_size = target_range[1] - target_range[0]

        # Base noise - measurement uncertainty (smaller for higher precision)
        noise_factor = range_size * (0.001 if spec.precision > 2 else 0.01)
        noise = random.gauss(0, noise_factor)

        # Slow drift toward target range center
        drift_rate = 0.01  # 1% correction per second
        drift = (range_center - current_value) * drift_rate * dt

        # Parameter-specific behaviors
        if param_name == "turbidity":
            # Turbidity can have spikes and gradual changes
            spike_probability = 0.001 * dt  # 0.1% per second
            if random.random() < spike_probability:
                spike = random.uniform(0, range_size * 0.3)
                return current_value + spike
            # Gradual settling
            settling_rate = 0.02 * dt
            return current_value * (1 - settling_rate) + noise + drift

        elif param_name == "ph":
            # pH changes slowly and is buffered
            max_change_rate = 0.1 / 3600  # 0.1 pH per hour maximum
            change = random.gauss(0, max_change_rate) * dt
            return current_value + change + noise + drift * 0.1  # Slow drift due to buffering

        elif param_name == "temperature":
            # Temperature follows daily cycles
            daily_cycle = math.sin(context.simulation_time * 2 * math.pi / 86400)  # 24-hour
            seasonal_effect = daily_cycle * 3.0  # ±3°C daily variation
            thermal_inertia = 0.001  # Very slow changes
            return current_value + seasonal_effect * thermal_inertia * dt + noise

        elif param_name == "flow_rate":
            # Flow follows demand patterns
            if context.operating:
                # 2-hour demand cycle
                demand_cycle = math.sin(context.simulation_time * 2 * math.pi / 7200)
                demand_variation = range_center * 0.2 * demand_cycle
                flow_noise = random.uniform(-range_size * 0.05, range_size * 0.05)
                return range_center + demand_variation + flow_noise + noise
            else:
                return 0.0

        elif param_name == "level":
            # Tank level changes slowly based on flow balance
            # Simulate random fill/drain with bounds checking
            level_change_rate = random.uniform(-0.05, 0.05)  # m per second
            new_level = current_value + level_change_rate * dt + noise
            # Add bounce back from limits
            min_level, max_level = spec.get_min_max()
            if new_level < min_level * 1.1:
                level_change_rate = abs(level_change_rate)  # Start filling
            elif new_level > max_level * 0.9:
                level_change_rate = -abs(level_change_rate)  # Start draining
            return new_level

        elif param_name == "pressure":
            # Pressure fluctuates with pump operation and demand
            if context.operating:
                pump_vibration = math.sin(context.simulation_time * 60) * 0.05  # 60 Hz
                demand_effect = (context.flow_rate / 100.0) * 0.1
                return (
                    range_center + pump_vibration + demand_effect * range_size + noise
                )
            else:
                # Decay to static pressure
                static_pressure = target_range[0] * 0.3
                decay_rate = 0.1 * dt
                return current_value * (1 - decay_rate) + static_pressure * decay_rate

        elif param_name == "differential_pressure":
            # Increases with filter loading
            loading_rate = 0.5 / 86400  # 0.5 mbar per day
            loading = loading_rate * dt
            return current_value + loading + noise

        elif param_name == "chlorine_residual":
            # Chlorine decays over time
            decay_rate = 0.05 / 3600  # 5% per hour
            decay = current_value * decay_rate * dt
            # Dosing adds chlorine (simulated as random additions)
            if random.random() < 0.01 * dt:  # 1% chance per second
                dosing = random.uniform(0, range_size * 0.1)
                return current_value - decay + dosing + noise
            return current_value - decay + noise

        elif param_name == "motor_current":
            # Motor current varies with load
            if context.operating:
                load_variation = math.sin(context.simulation_time * 2 * math.pi / 60)
                load_noise = random.uniform(-range_size * 0.02, range_size * 0.02)
                return range_center + load_variation * 0.5 + load_noise + noise
            else:
                return 0.0

        elif param_name == "motor_temperature":
            # Motor heats up when running, cools when off
            if context.operating:
                heating_rate = 1.0 / 600  # 1°C per 10 minutes
                target_temp = target_range[0] + range_size * 0.6  # Operating temp
                return current_value + (target_temp - current_value) * heating_rate * dt + noise
            else:
                cooling_rate = 1.0 / 1800  # 1°C per 30 minutes
                ambient_temp = 25.0
                return current_value - (current_value - ambient_temp) * cooling_rate * dt + noise

        elif param_name == "vibration":
            # Vibration increases with equipment wear
            if context.operating:
                wear_trend = context.simulation_time / 1e6  # Very slow increase
                vibration_noise = random.gauss(range_center, range_size * 0.1)
                return vibration_noise + wear_trend + noise
            else:
                return 0.0

        elif param_name == "dose_rate":
            # Flow proportional dosing
            target_dose = range_center
            flow_proportion = context.flow_rate / 100.0
            return target_dose * flow_proportion + noise + drift

        elif param_name == "pump_speed":
            # Pump speed controlled by VFD, stable around setpoint
            if context.operating:
                setpoint = range_center
                control_noise = random.uniform(-1.0, 1.0)
                return setpoint + control_noise + noise
            else:
                return 0.0

        elif param_name == "valve_position":
            # Valve position changes for control
            control_adjustment = random.uniform(-2.0, 2.0) * dt
            return current_value + control_adjustment + drift * 0.5

        elif param_name in ["run_status", "alarm_status", "maintenance_mode"]:
            # Boolean/status parameters
            return current_value  # Handle separately

        # Default behavior for other parameters
        # Slow random walk toward target range center
        random_walk = random.gauss(0, range_size * 0.01) * dt
        return current_value + random_walk + noise + drift * 0.1

    def get_min_max_for_parameter(self, param_name: str) -> Tuple[float, float]:
        """Get min and max values for a parameter"""
        spec = self.get_parameter_spec(param_name)
        if spec:
            return spec.get_min_max()
        return (0.0, 100.0)

    def get_precision_for_parameter(self, param_name: str) -> int:
        """Get precision (decimal places) for a parameter"""
        spec = self.get_parameter_spec(param_name)
        if spec:
            return spec.precision
        return 2
