#!/usr/bin/env python3
"""
Unified Hydros System

Main entry point for the unified WTP simulation and edge gateway system.

Operation Modes:
- simulation: Starts simulation engine + modbus servers + edge gateway (for testing and development)
- normal: Starts only the edge gateway (for production data collection)

Usage:
- Normal mode (default): python main.py
- Simulation mode: python main.py --mode simulation
"""

import argparse
import asyncio
import logging
import signal
import sys
from pathlib import Path
from typing import Optional

from core.config_validator import ConfigurationValidationError, ConfigValidator
from core.digital_twin import DigitalTwin
from gateway.edge_gateway import EdgeGateway, GatewayMode
from protocols.protocol_registry import ProtocolRegistry
from simulation.simulator import SimulationEngine, SimulationMode


class HydrosSystem:
    """
    Unified Hydros system that can operate in two modes:
    - Simulation mode: Starts simulation engine + modbus servers + edge gateway (for testing and development)
    - Normal mode: Starts only the edge gateway (for production data collection)
    """

    def __init__(self, mode: str = "normal", site_id: str = "wtp-porto-01"):
        self.mode = mode.lower()
        self.site_id = site_id
        self.logger = logging.getLogger(self.__class__.__name__)

        # Core components
        self.plant_model = DigitalTwin()
        self.protocol_registry = ProtocolRegistry()

        # Mode-specific components
        self.simulation_engine: Optional[SimulationEngine] = None
        self.edge_gateway: Optional[EdgeGateway] = None

        # Configuration paths
        self.config_dir = Path("config")
        self.site_config_dir = self.config_dir / "sites" / site_id
        self.templates_dir = self.config_dir / "templates"
        self.plant_config_file = self.site_config_dir / "plant.yaml"
        self.gateway_config_file = self.site_config_dir / "edge_gateway_config.yaml"

        # Runtime state
        self.running = False

        self.logger.info(f"Initialized Hydros system in {mode} mode for site {site_id}")

    def validate_configuration(self) -> bool:
        """Validate configuration files exist and are valid according to schemas"""
        # First check if required files exist
        required_files = [self.plant_config_file]

        # Check for template files
        template_files = [
            self.templates_dir / "modules.yaml",
            self.templates_dir / "parameters.yaml",
        ]
        required_files.extend(template_files)

        if self.mode == "simulation":
            # Simulation mode needs both plant and gateway config
            required_files.append(self.gateway_config_file)
        elif self.mode == "normal":
            # Normal mode needs gateway config
            required_files.append(self.gateway_config_file)

        missing_files = []
        for config_file in required_files:
            if not config_file.exists():
                missing_files.append(str(config_file))

        if missing_files:
            self.logger.error(f"Missing configuration files: {missing_files}")
            self.logger.info(f"Expected site config directory: {self.site_config_dir}")
            return False

        # Perform schema validation if files exist
        try:
            self.logger.info("Validating configuration files against schemas...")
            validator = ConfigValidator(str(self.config_dir))

            # Validate templates first (dependencies for site config)
            templates_valid, template_errors = validator.validate_module_templates()
            if not templates_valid:
                self.logger.error("Module templates validation failed:")
                for error in template_errors:
                    self.logger.error(f"  • {error}")
                return False

            params_valid, params_errors = validator.validate_parameter_specifications()
            if not params_valid:
                self.logger.error("Parameter specifications validation failed:")
                for error in params_errors:
                    self.logger.error(f"  • {error}")
                return False

            # Validate site configuration
            site_valid, site_errors = validator.validate_site_config(self.site_id)
            if not site_valid:
                self.logger.error(
                    f"Site configuration validation failed for {self.site_id}:"
                )
                for error in site_errors:
                    self.logger.error(f"  • {error}")
                return False

            # Validate compatibility between site config and templates
            compat_valid, compat_errors = (
                validator.validate_configuration_compatibility(self.site_id)
            )
            if not compat_valid:
                self.logger.error(
                    f"Configuration compatibility validation failed for {self.site_id}:"
                )
                for error in compat_errors:
                    self.logger.error(f"  • {error}")
                return False

            self.logger.info("✅ All configuration validations passed")
            return True

        except ConfigurationValidationError as e:
            self.logger.error(f"Configuration validation error: {e}")
            for error in e.errors:
                self.logger.error(f"  • {error}")
            return False
        except Exception as e:
            self.logger.warning(f"Schema validation unavailable: {e}")
            self.logger.info("Continuing with basic file existence validation")
            return True  # Fall back to basic validation if schema validation fails

    def initialize_simulation_mode(self):
        """Initialize simulation mode (simulation engine + modbus servers + edge gateway)"""
        self.logger.info("Initializing simulation mode")

        # Create simulation engine
        self.simulation_engine = SimulationEngine(
            self.plant_model, SimulationMode.REAL_TIME
        )
        # Pass new configuration structure to simulation engine
        self.simulation_engine.initialize_simulation(
            site_config_file=str(self.plant_config_file),
            templates_dir=str(self.templates_dir),
        )

        # Create Modbus server for serving simulated data
        modbus_server = self.protocol_registry.create_modbus_server(
            "sim_modbus_server", host="0.0.0.0", port=5020
        )

        if modbus_server:
            # Load mappings from gateway config for consistency
            modbus_server.load_mappings_from_gateway_config(
                str(self.gateway_config_file)
            )
            modbus_server.initialize_server()

        # Create edge gateway in hybrid mode (for testing with real PLCs + simulation fallback)
        self.edge_gateway = EdgeGateway(self.plant_model, GatewayMode.DEVELOPMENT)
        self.edge_gateway.load_gateway_configuration(str(self.gateway_config_file))

    def initialize_normal_mode(self):
        """Initialize normal mode (edge gateway only)"""
        self.logger.info("Initializing normal mode")

        # Create edge gateway
        self.edge_gateway = EdgeGateway(self.plant_model, GatewayMode.PRODUCTION)

        # Load configuration
        self.edge_gateway.load_gateway_configuration(str(self.gateway_config_file))

    async def run_simulation_mode(self):
        """Run in simulation mode (simulation + edge gateway)"""
        # Start simulation
        self.simulation_engine.start_simulation()

        # Get Modbus server and start it
        modbus_server = self.protocol_registry.get_handler("sim_modbus_server")
        if modbus_server:
            asyncio.create_task(modbus_server.start_server())

        # Allow simulation server to fully start before gateway connects
        await asyncio.sleep(3.0)

        # Start simulation loop
        simulation_task = asyncio.create_task(
            self.simulation_engine.run_simulation_loop()
        )

        # Update Modbus server with simulation data in background
        modbus_update_task = asyncio.create_task(
            self._update_modbus_server_loop(modbus_server)
        )

        # Start edge gateway
        gateway_task = asyncio.create_task(self.edge_gateway.start())

        # Wait for all tasks
        await asyncio.gather(simulation_task, modbus_update_task, gateway_task)

    async def run_normal_mode(self):
        """Run in normal mode (edge gateway only)"""
        await self.edge_gateway.start()

    async def _update_modbus_server_loop(self, modbus_server):
        """Update Modbus server with simulation data"""
        while self.running:
            try:
                if modbus_server and hasattr(modbus_server, "update_server_parameters"):
                    # Get current parameter values from DigitalTwin
                    parameter_values = self.plant_model.get_all_parameters()

                    # DigitalTwin and Modbus mappings use the same Paramter ID format:
                    # "site.component.parameter" format
                    if parameter_values:
                        success_count = modbus_server.update_server_parameters(
                            parameter_values
                        )
                        self.logger.debug(
                            f"Updated {success_count}/{len(parameter_values)} Modbus parameters"
                        )

                await asyncio.sleep(1.0)

            except Exception as e:
                self.logger.error(f"Error updating Modbus server: {e}")
                await asyncio.sleep(1.0)

    async def start(self, init_mode: bool = False):
        """Start the Hydros system"""
        try:
            self.logger.info("Starting Hydros system")

            # Validate configuration
            if not self.validate_configuration():
                raise RuntimeError("Configuration validation failed")

            # Run protocol mapper if init mode is enabled
            if init_mode:
                self.logger.info(f"Running protocol mapper for site {self.site_id}")
                try:
                    from core.protocol_mapper import ProtocolMapper

                    protocol_mapper = ProtocolMapper(
                        site_config_file=str(self.plant_config_file),
                        templates_dir=str(self.templates_dir),
                    )

                    # Generate protocol mappings and save to config directory
                    mappings = protocol_mapper.generate_mapping_files(
                        self.site_id, str(self.config_dir)
                    )
                    self.logger.info(
                        f"Generated {len(mappings)} protocol address mappings for {self.site_id}"
                    )

                except Exception as e:
                    self.logger.error(f"Failed to run protocol mapper: {e}")
                    raise

            # Load plant model with site-specific configuration
            self.plant_model.load_site_configuration(
                site_config_file=str(self.plant_config_file),
                templates_dir=str(self.templates_dir),
            )

            # Initialize based on mode
            if self.mode == "simulation":
                self.initialize_simulation_mode()
                self.running = True
                await self.run_simulation_mode()

            elif self.mode == "normal":
                self.initialize_normal_mode()
                self.running = True
                await self.run_normal_mode()

            else:
                raise ValueError(
                    f"Unknown mode: {self.mode}. Use 'simulation' or 'normal'."
                )

        except Exception as e:
            self.logger.error(f"Failed to start Hydros system: {e}")
            raise

    def stop(self):
        """Stop the Hydros system"""
        self.logger.info("Stopping Hydros system")
        self.running = False

        # Stop simulation engine
        if self.simulation_engine:
            self.simulation_engine.stop_simulation()

        # Stop edge gateway
        if self.edge_gateway:
            self.edge_gateway.stop()

        # Disconnect all protocol handlers
        self.protocol_registry.disconnect_all()

        self.logger.info("Hydros system stopped")

    def get_system_status(self) -> dict:
        """Get current system status"""
        status = {
            "mode": self.mode,
            "running": self.running,
            "plant_model": self.plant_model.get_plant_statistics(),
            "protocols": self.protocol_registry.get_all_statistics(),
        }

        if self.simulation_engine:
            status["simulation"] = self.simulation_engine.get_simulation_statistics()

        if self.edge_gateway:
            status["gateway"] = {
                "connections": self.edge_gateway.get_connection_status(),
                "cached_data_count": len(self.edge_gateway.get_cached_data()),
            }

        return status


def signal_handler(signum, frame):
    """Handle shutdown signals"""
    print(f"\nReceived signal {signum}, shutting down gracefully...")
    sys.exit(0)


def setup_logging(level: str = "INFO"):
    """Setup logging configuration"""
    log_level = getattr(logging, level.upper(), logging.INFO)

    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler("hydros.log")],
    )


async def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Unified Hydros WTP System",
        epilog="""
Operation Modes:
  normal      Production mode - runs only the edge gateway (default)
  simulation  Development mode - runs simulation engine + modbus servers + edge gateway

Examples:
  python main.py                    # Normal mode (gateway only)
  python main.py --mode simulation  # Simulation mode (full stack)
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--mode",
        choices=["simulation", "normal"],
        default="normal",
        help="Operation mode: 'simulation' (sim engine + modbus + gateway) or 'normal' (gateway only)",
    )

    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Logging level",
    )

    parser.add_argument(
        "--config-dir", default="config", help="Configuration directory"
    )

    parser.add_argument(
        "--site-id",
        default="wtp-porto-01",
        help="Site/plant identifier (must match directory in config/sites/)",
    )

    parser.add_argument(
        "--init",
        action="store_true",
        help="Run address allocator to generate/update configuration mappings on startup",
    )

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)

    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create and start system
    try:
        system = HydrosSystem(args.mode, args.site_id)
        system.config_dir = Path(args.config_dir)

        # Update config file paths for selected site
        system.site_config_dir = system.config_dir / "sites" / args.site_id
        system.templates_dir = system.config_dir / "templates"
        system.plant_config_file = system.site_config_dir / "plant.yaml"
        system.gateway_config_file = system.site_config_dir / "edge_gateway_config.yaml"

        await system.start(init_mode=args.init)

    except KeyboardInterrupt:
        print("\nShutdown requested by user")
    except Exception as e:
        print(f"Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
