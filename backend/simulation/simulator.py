#!/usr/bin/env python3
"""
Simulation Engine

Main simulation engine that orchestrates component updates and physics models.
"""

import asyncio
import logging
import time
from enum import Enum
from typing import Any, Dict, Optional

from core.digital_twin import ComponentInfo, DigitalTwin, OperationalState


class SimulationMode(Enum):
    """Simulation operation modes"""

    REAL_TIME = "real_time"  # Run at real-time speed
    ACCELERATED = "accelerated"  # Run faster than real-time
    STEP_BY_STEP = "step_by_step"  # Manual stepping


class SimulationEngine:
    """
    Core simulation engine that manages the digital twin simulation.

    Responsibilities:
    - Component lifecycle management
    - Real-time simulation orchestration
    - Physics model integration
    - State synchronization with plant model
    """

    def __init__(
        self,
        plant_model: DigitalTwin,
        simulation_mode: SimulationMode = SimulationMode.REAL_TIME,
    ):
        self.plant_model = plant_model
        self.simulation_mode = simulation_mode

        self.logger = logging.getLogger(self.__class__.__name__)

        # Simulation state
        self.running = False
        self.simulation_time = 0.0
        self.real_start_time = 0.0
        self.time_scale = 1.0  # Simulation speed multiplier

        # Component factory for creating simulated components
        self.component_factory = None

        # Simulation parameters
        self.update_interval = 1.0  # Base update interval in seconds
        self.max_dt = 0.1  # Maximum time step for physics

        # Statistics
        self.stats = {
            "simulation_cycles": 0,
            "components_created": 0,
            "total_simulation_time": 0.0,
            "average_cycle_time": 0.0,
            "last_cycle_time": 0.0,
        }

    def initialize_simulation(
        self,
        config_file: Optional[str] = None,
        site_config_file: Optional[str] = None,
        templates_dir: Optional[str] = None,
    ):
        """Initialize simulation with plant configuration"""
        try:
            # Support both new and legacy configuration loading
            if site_config_file and templates_dir:
                # New site-based configuration
                # Note: plant_model should already be loaded by HydrosSystem
                from core.plant_builder import ComponentFactory

                self.component_factory = ComponentFactory(
                    site_config_file=site_config_file, templates_dir=templates_dir
                )
            elif config_file:
                # Legacy configuration loading
                self.plant_model.load_plant_configuration(config_file)
                from core.plant_builder import ComponentFactory

                self.component_factory = ComponentFactory(
                    legacy_config_file=config_file
                )
            else:
                # Try to create factory from already-loaded plant model
                from core.plant_builder import ComponentFactory

                self.component_factory = ComponentFactory.create_from_digital_twin(
                    self.plant_model
                )

            # Create components from site configuration
            # For now, use the first available site
            sites = list(self.component_factory.site_configurations.keys())
            self.logger.debug(f"Available sites: {sites}")

            if sites:
                site_id = sites[0]  # Use first site
                self.logger.debug(f"Creating components for site: {site_id}")

                try:
                    # Create WTP components first
                    wtp_components = self.component_factory.create_site_components(
                        site_id
                    )
                    self.logger.debug(f"Created {len(wtp_components)} WTP components")

                    # Wrap them in simulation components
                    from .components import SimulatedPlantComponent

                    for comp_name, wtp_component in wtp_components.items():
                        # Create simulation wrapper
                        sim_component = SimulatedPlantComponent(wtp_component)
                        comp_id = f"{site_id}.{comp_name}"

                        # Create metadata
                        metadata = ComponentInfo(
                            component_id=comp_id,
                            component_type=type(wtp_component).__name__,
                            module_id=site_id,
                            description=f"Component {comp_name} in site {site_id}",
                            state=OperationalState.ACTIVE,
                        )

                        # Register with plant model
                        self.plant_model.register_component(
                            comp_id, sim_component, metadata
                        )
                        self.stats["components_created"] += 1

                        self.logger.debug(f"Created simulation component: {comp_id}")

                except Exception as e:
                    self.logger.error(f"Error creating simulation components: {e}")
                    import traceback

                    self.logger.debug(traceback.format_exc())
                    raise

            # Initialize simulation time
            self.simulation_time = 0.0
            self.real_start_time = time.time()

            self.logger.info(
                f"Simulation initialized with {len(self.plant_model.components)} components"
            )

        except Exception as e:
            self.logger.error(f"Failed to initialize simulation: {e}")
            import traceback

            self.logger.debug(traceback.format_exc())
            raise

    def set_simulation_mode(self, mode: SimulationMode, time_scale: float = 1.0):
        """Change simulation mode and time scaling"""
        self.simulation_mode = mode
        self.time_scale = time_scale

        if mode == SimulationMode.REAL_TIME:
            self.time_scale = 1.0
        elif mode == SimulationMode.STEP_BY_STEP:
            self.time_scale = 0.0  # No automatic advancement

        self.logger.info(
            f"Simulation mode: {mode.value}, time scale: {self.time_scale}x"
        )

    def step_simulation(self, dt: Optional[float] = None) -> Dict[str, Any]:
        """Execute one simulation step"""
        start_time = time.perf_counter()

        # Calculate time step
        if dt is None:
            if self.simulation_mode == SimulationMode.STEP_BY_STEP:
                dt = self.update_interval
            else:
                current_real_time = time.time()
                real_elapsed = current_real_time - self.real_start_time
                target_sim_time = real_elapsed * self.time_scale
                dt = min(target_sim_time - self.simulation_time, self.max_dt)

        if dt <= 0:
            return {}

        try:
            # Update simulation time
            self.simulation_time += dt

            # Update all components
            updated_parameters = self.plant_model.update_all_components()

            # Update statistics
            cycle_time = time.perf_counter() - start_time
            self.stats["simulation_cycles"] += 1
            self.stats["last_cycle_time"] = cycle_time
            self.stats["total_simulation_time"] = self.simulation_time

            # Calculate rolling average cycle time
            cycle_count = self.stats["simulation_cycles"]
            if cycle_count == 1:
                self.stats["average_cycle_time"] = cycle_time
            else:
                # Exponential moving average
                alpha = 0.1
                self.stats["average_cycle_time"] = (
                    alpha * cycle_time + (1 - alpha) * self.stats["average_cycle_time"]
                )

            self.logger.debug(
                f"Simulation step: dt={dt:.3f}s, {len(updated_parameters)} parameters updated"
            )

            return updated_parameters

        except Exception as e:
            self.logger.error(f"Error in simulation step: {e}")
            return {}

    async def run_simulation_loop(self):
        """Main simulation loop for real-time and accelerated modes"""
        self.logger.info(
            f"Starting simulation loop in {self.simulation_mode.value} mode"
        )

        last_stats_time = time.time()
        stats_interval = 30.0  # Print stats every 30 seconds

        while self.running:
            try:
                # Execute simulation step
                self.step_simulation()

                # Print periodic statistics
                current_time = time.time()
                if current_time - last_stats_time >= stats_interval:
                    self._print_simulation_stats()
                    last_stats_time = current_time

                # Sleep for real-time synchronization
                if self.simulation_mode == SimulationMode.REAL_TIME:
                    await asyncio.sleep(self.update_interval)
                elif self.simulation_mode == SimulationMode.ACCELERATED:
                    # Shorter sleep for accelerated mode
                    await asyncio.sleep(
                        self.update_interval / max(self.time_scale, 1.0)
                    )
                else:
                    # Step-by-step mode doesn't auto-advance
                    await asyncio.sleep(0.1)

            except Exception as e:
                self.logger.error(f"Error in simulation loop: {e}")
                await asyncio.sleep(1.0)  # Brief pause on error

    def _print_simulation_stats(self):
        """Print simulation statistics"""
        stats = self.get_simulation_statistics()
        plant_stats = self.plant_model.get_plant_statistics()

        self.logger.info("=== Simulation Statistics ===")
        self.logger.info(f"Simulation time: {stats['total_simulation_time']:.1f}s")
        self.logger.info(f"Simulation cycles: {stats['simulation_cycles']}")
        self.logger.info(
            f"Average cycle time: {stats['average_cycle_time'] * 1000:.1f}ms"
        )
        self.logger.info(f"Active components: {plant_stats['active_components']}")
        self.logger.info(f"Total parameters: {plant_stats['total_parameters']}")
        self.logger.info(f"Time scale: {self.time_scale}x")

    def start_simulation(self):
        """Start the simulation engine"""
        if self.running:
            self.logger.warning("Simulation already running")
            return

        self.running = True
        self.real_start_time = time.time()
        self.logger.info("Simulation engine started")

    def stop_simulation(self):
        """Stop the simulation engine"""
        if not self.running:
            return

        self.running = False
        self.logger.info("Simulation engine stopped")
        self._print_simulation_stats()

    def pause_simulation(self):
        """Pause the simulation (can be resumed)"""
        self.running = False
        self.logger.info("Simulation paused")

    def resume_simulation(self):
        """Resume paused simulation"""
        if self.running:
            return

        self.running = True
        self.real_start_time = time.time() - (self.simulation_time / self.time_scale)
        self.logger.info("Simulation resumed")

    def reset_simulation(self):
        """Reset simulation to initial state"""
        self.running = False
        self.simulation_time = 0.0

        # Reset all component states
        for comp_id in self.plant_model.components:
            self.plant_model.update_component_state(comp_id, OperationalState.ACTIVE)

        # Clear statistics
        self.stats = {
            "simulation_cycles": 0,
            "components_created": self.stats[
                "components_created"
            ],  # Keep created count
            "total_simulation_time": 0.0,
            "average_cycle_time": 0.0,
            "last_cycle_time": 0.0,
        }

        self.logger.info("Simulation reset")

    def get_simulation_statistics(self) -> Dict[str, Any]:
        """Get current simulation statistics"""
        stats = self.stats.copy()
        stats["simulation_mode"] = self.simulation_mode.value
        stats["time_scale"] = self.time_scale
        stats["running"] = self.running
        return stats

    def get_component_by_id(self, component_id: str):
        """Get a specific component by ID"""
        return self.plant_model.components.get(component_id)

    def set_component_parameter(
        self, component_id: str, parameter: str, value: Any
    ) -> bool:
        """Set a parameter on a specific component"""
        param_id = f"{component_id}.{parameter}"
        return self.plant_model.set_parameter_value(param_id, value)

    def get_all_parameter_values(self) -> Dict[str, Any]:
        """Get all current parameter values"""
        return self.plant_model.get_all_parameters()
