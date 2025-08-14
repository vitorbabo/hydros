#!/usr/bin/env python3
"""
Process Models

Physics-based process models for water treatment simulation.
"""

import math
import random
from dataclasses import dataclass
from typing import Dict


@dataclass
class FluidProperties:
    """Physical properties of water/fluid"""

    density: float = 1000.0  # kg/m³
    viscosity: float = 0.001  # Pa·s
    temperature: float = 20.0  # °C
    ph: float = 7.0
    turbidity: float = 0.0  # NTU
    dissolved_oxygen: float = 8.0  # mg/L


class HydraulicModel:
    """Hydraulic calculations for water flow"""

    @staticmethod
    def pipe_flow_rate(
        diameter: float,
        length: float,
        pressure_drop: float,
        fluid_props: FluidProperties,
    ) -> float:
        """Calculate flow rate through pipe using Darcy-Weisbach equation"""
        # Simplified calculation for turbulent flow
        if pressure_drop <= 0:
            return 0.0

        # Friction factor (approximation)
        reynolds = HydraulicModel.reynolds_number(diameter, 1.0, fluid_props)
        friction_factor = (
            0.0791 / (reynolds**0.25) if reynolds > 4000 else 16 / reynolds
        )

        # Flow velocity
        velocity = math.sqrt(
            2
            * pressure_drop
            * diameter
            / (friction_factor * length * fluid_props.density)
        )

        # Flow rate
        area = math.pi * (diameter / 2) ** 2
        return velocity * area * 3600  # m³/h

    @staticmethod
    def reynolds_number(
        diameter: float, velocity: float, fluid_props: FluidProperties
    ) -> float:
        """Calculate Reynolds number"""
        return fluid_props.density * velocity * diameter / fluid_props.viscosity

    @staticmethod
    def pump_curve(flow_rate: float, max_flow: float, max_head: float) -> float:
        """Simple pump curve: head vs flow rate"""
        if flow_rate >= max_flow:
            return 0.0

        # Quadratic pump curve
        normalized_flow = flow_rate / max_flow
        head = max_head * (1 - normalized_flow**2)
        return max(0.0, head)

    @staticmethod
    def tank_level_change(
        inflow: float, outflow: float, tank_area: float, dt: float
    ) -> float:
        """Calculate change in tank level"""
        net_flow = inflow - outflow  # m³/h
        net_flow_m3s = net_flow / 3600  # m³/s
        level_change = net_flow_m3s * dt / tank_area  # m
        return level_change


class WaterQualityModel:
    """Water quality process models"""

    @staticmethod
    def chlorine_decay(
        initial_concentration: float, decay_rate: float, time: float
    ) -> float:
        """First-order chlorine decay"""
        return initial_concentration * math.exp(-decay_rate * time)

    @staticmethod
    def ph_buffering(
        current_ph: float, target_ph: float, buffer_capacity: float, dt: float
    ) -> float:
        """pH adjustment with buffering"""
        ph_diff = target_ph - current_ph
        max_change = buffer_capacity * dt

        if abs(ph_diff) <= max_change:
            return target_ph
        else:
            return current_ph + math.copysign(max_change, ph_diff)

    @staticmethod
    def turbidity_removal(inlet_turbidity: float, removal_efficiency: float) -> float:
        """Turbidity removal in treatment process"""
        removed = inlet_turbidity * removal_efficiency
        return max(0.0, inlet_turbidity - removed)

    @staticmethod
    def mixing_model(concentrations: list, flow_rates: list) -> float:
        """Perfect mixing of multiple streams"""
        if not concentrations or not flow_rates:
            return 0.0

        total_mass = sum(c * f for c, f in zip(concentrations, flow_rates))
        total_flow = sum(flow_rates)

        return total_mass / total_flow if total_flow > 0 else 0.0


class FilterModel:
    """Filtration process model"""

    def __init__(self, area: float, initial_permeability: float):
        self.area = area  # m²
        self.initial_permeability = initial_permeability
        self.current_permeability = initial_permeability
        self.accumulated_solids = 0.0  # kg
        self.backwash_threshold = 100.0  # kg

    def update(
        self, inlet_flow: float, inlet_turbidity: float, dt: float
    ) -> Dict[str, float]:
        """Update filter state"""
        # Solids accumulation
        solids_rate = inlet_flow * inlet_turbidity * 0.001  # kg/h (simplified)
        solids_added = solids_rate * dt / 3600
        self.accumulated_solids += solids_added

        # Permeability reduction
        fouling_factor = 1.0 - (self.accumulated_solids / self.backwash_threshold) * 0.8
        self.current_permeability = self.initial_permeability * max(0.1, fouling_factor)

        # Outlet quality
        removal_efficiency = 0.95 * fouling_factor  # Efficiency decreases with fouling
        outlet_turbidity = WaterQualityModel.turbidity_removal(
            inlet_turbidity, removal_efficiency
        )

        # Pressure drop
        pressure_drop = (inlet_flow / self.area) / self.current_permeability

        return {
            "outlet_turbidity": outlet_turbidity,
            "pressure_drop": pressure_drop,
            "accumulated_solids": self.accumulated_solids,
            "removal_efficiency": removal_efficiency,
        }

    def backwash(self):
        """Perform filter backwash"""
        self.accumulated_solids = 0.0
        self.current_permeability = self.initial_permeability


class PumpModel:
    """Centrifugal pump model"""

    def __init__(self, max_flow: float, max_head: float, efficiency: float = 0.75):
        self.max_flow = max_flow  # m³/h
        self.max_head = max_head  # m
        self.efficiency = efficiency
        self.speed_setpoint = 1.0  # Fraction of max speed
        self.running = False

    def update(self, system_head: float, dt: float) -> Dict[str, float]:
        """Update pump operation"""
        if not self.running:
            return {"flow_rate": 0.0, "head": 0.0, "power": 0.0, "speed": 0.0}

        # Adjusted pump curve based on speed
        actual_max_flow = self.max_flow * self.speed_setpoint
        actual_max_head = self.max_head * (self.speed_setpoint**2)

        # Find operating point (simplified)
        # In reality, this would be the intersection of pump curve and system curve
        operating_flow = actual_max_flow * 0.7  # Assume 70% of max flow
        operating_head = HydraulicModel.pump_curve(
            operating_flow, actual_max_flow, actual_max_head
        )

        # Power calculation
        hydraulic_power = (operating_flow / 3600) * operating_head * 9.81 * 1000  # W
        electrical_power = hydraulic_power / self.efficiency

        return {
            "flow_rate": operating_flow,
            "head": operating_head,
            "power": electrical_power / 1000,  # kW
            "speed": self.speed_setpoint * 100,  # %
        }

    def start(self):
        """Start pump"""
        self.running = True

    def stop(self):
        """Stop pump"""
        self.running = False

    def set_speed(self, speed_fraction: float):
        """Set pump speed (0.0 to 1.0)"""
        self.speed_setpoint = max(0.0, min(1.0, speed_fraction))


class TankModel:
    """Storage tank model"""

    def __init__(self, area: float, max_level: float, initial_level: float = 0.0):
        self.area = area  # m²
        self.max_level = max_level  # m
        self.level = initial_level  # m
        self.overflow_level = max_level * 0.95
        self.low_level_alarm = max_level * 0.1

    def update(self, inflow: float, outflow: float, dt: float) -> Dict[str, float]:
        """Update tank level and status"""
        # Level change
        level_change = HydraulicModel.tank_level_change(inflow, outflow, self.area, dt)
        new_level = self.level + level_change

        # Constrain level
        overflow = 0.0
        if new_level > self.max_level:
            overflow = (new_level - self.max_level) * self.area * 3600  # m³/h
            new_level = self.max_level
        elif new_level < 0:
            new_level = 0.0

        self.level = new_level

        # Volume calculation
        volume = self.level * self.area

        # Alarms
        high_level_alarm = self.level > self.overflow_level
        low_level_alarm = self.level < self.low_level_alarm

        return {
            "level": self.level,
            "volume": volume,
            "overflow": overflow,
            "high_level_alarm": high_level_alarm,
            "low_level_alarm": low_level_alarm,
        }


class ProcessModels:
    """Collection of process models for WTP simulation"""

    @staticmethod
    def create_filter_model(area: float = 100.0) -> FilterModel:
        """Create a standard filter model"""
        return FilterModel(area, initial_permeability=0.01)

    @staticmethod
    def create_pump_model(capacity: str = "medium") -> PumpModel:
        """Create a standard pump model"""
        capacities = {
            "small": (50, 20, 0.70),  # 50 m³/h, 20m head
            "medium": (100, 30, 0.75),  # 100 m³/h, 30m head
            "large": (200, 40, 0.80),  # 200 m³/h, 40m head
        }

        max_flow, max_head, efficiency = capacities.get(capacity, capacities["medium"])
        return PumpModel(max_flow, max_head, efficiency)

    @staticmethod
    def create_tank_model(volume: float = 1000.0) -> TankModel:
        """Create a standard tank model"""
        # Assume cylindrical tank with height = diameter
        area = math.sqrt(volume / math.pi)  # Simplified
        height = volume / area
        return TankModel(area, height, height * 0.5)

    @staticmethod
    def simulate_sensor_noise(value: float, noise_level: float = 0.02) -> float:
        """Add realistic sensor noise to measurements"""
        noise = random.gauss(0, noise_level * abs(value))
        return value + noise

    @staticmethod
    def simulate_sensor_drift(
        value: float, drift_rate: float = 0.001, time: float = 0.0
    ) -> float:
        """Add sensor drift over time"""
        drift = drift_rate * time * value
        return value + drift

    @staticmethod
    def apply_measurement_constraints(
        value: float, min_val: float, max_val: float
    ) -> float:
        """Apply physical constraints to measurements"""
        return max(min_val, min(max_val, value))
