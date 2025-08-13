#!/usr/bin/env python3
"""
Unified Hydros System

Main entry point for the unified WTP simulation and edge gateway system.
"""

import argparse
import asyncio
import logging
import signal
import sys
from pathlib import Path
from typing import Optional

from core.plant_model import PlantModel
from gateway.edge_gateway import EdgeGateway, GatewayMode
from protocols.protocol_registry import ProtocolRegistry
from simulation.simulator import SimulationEngine, SimulationMode


class HydrosSystem:
    """
    Unified Hydros system that can operate in multiple modes:
    - Pure simulation mode (for testing and development)
    - Pure edge gateway mode (for production data collection)
    - Hybrid mode (simulation + protocol serving)
    """

    def __init__(self, mode: str = "simulation"):
        self.mode = mode.lower()
        self.logger = logging.getLogger(self.__class__.__name__)

        # Core components
        self.plant_model = PlantModel()
        self.protocol_registry = ProtocolRegistry()

        # Mode-specific components
        self.simulation_engine: Optional[SimulationEngine] = None
        self.edge_gateway: Optional[EdgeGateway] = None

        # Configuration
        self.config_dir = Path("config")
        self.plant_config_file = self.config_dir / "plant_config.yaml"
        self.gateway_config_file = (
            self.config_dir / "wtp-porto-01_edge_gateway_config.yaml"
        )

        # Runtime state
        self.running = False

        self.logger.info(f"Initialized Hydros system in {mode} mode")

    def validate_configuration(self) -> bool:
        """Validate that required configuration files exist"""
        required_files = [self.plant_config_file]

        if self.mode in ["gateway", "edge_gateway", "hybrid"]:
            required_files.append(self.gateway_config_file)

        missing_files = []
        for config_file in required_files:
            if not config_file.exists():
                missing_files.append(str(config_file))

        if missing_files:
            self.logger.error(f"Missing configuration files: {missing_files}")
            return False

        return True

    def initialize_simulation_mode(self):
        """Initialize pure simulation mode"""
        self.logger.info("Initializing simulation mode")

        # Create simulation engine
        self.simulation_engine = SimulationEngine(
            self.plant_model, SimulationMode.REAL_TIME
        )
        self.simulation_engine.initialize_simulation(str(self.plant_config_file))

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

    def initialize_gateway_mode(self):
        """Initialize pure edge gateway mode"""
        self.logger.info("Initializing edge gateway mode")

        # Create edge gateway
        self.edge_gateway = EdgeGateway(self.plant_model, GatewayMode.PRODUCTION)

        # Load configuration
        self.edge_gateway.load_gateway_configuration(str(self.gateway_config_file))

    def initialize_hybrid_mode(self):
        """Initialize hybrid mode (simulation + edge gateway)"""
        self.logger.info("Initializing hybrid mode")

        # Initialize both simulation and gateway components
        self.initialize_simulation_mode()

        # Create edge gateway in hybrid mode (for testing with real PLCs + simulation fallback)
        self.edge_gateway = EdgeGateway(self.plant_model, GatewayMode.HYBRID)
        self.edge_gateway.load_gateway_configuration(str(self.gateway_config_file))

    async def run_simulation_mode(self):
        """Run in pure simulation mode"""
        self.simulation_engine.start_simulation()

        # Get Modbus server
        modbus_server = self.protocol_registry.get_handler("sim_modbus_server")

        # Start Modbus server
        if modbus_server:
            asyncio.create_task(modbus_server.start_server())

        # Allow server to start
        await asyncio.sleep(1.0)

        # Run simulation loop
        asyncio.create_task(self.simulation_engine.run_simulation_loop())

        # Update Modbus server with simulation data
        while self.running:
            try:
                # Get current parameter values
                parameter_values = self.plant_model.get_all_parameters()

                # Update Modbus server
                if modbus_server and hasattr(modbus_server, "update_server_parameters"):
                    modbus_server.update_server_parameters(parameter_values)

                await asyncio.sleep(1.0)

            except Exception as e:
                self.logger.error(f"Error in simulation mode loop: {e}")
                await asyncio.sleep(1.0)

    async def run_gateway_mode(self):
        """Run in pure edge gateway mode"""
        await self.edge_gateway.start()

    async def run_hybrid_mode(self):
        """Run in hybrid mode"""
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

    async def _update_modbus_server_loop(self, modbus_server):
        """Update Modbus server with simulation data"""
        while self.running:
            try:
                if modbus_server and hasattr(modbus_server, "update_server_parameters"):
                    # Get current parameter values from PlantModel
                    parameter_values = self.plant_model.get_all_parameters()

                    # PlantModel and Modbus mappings use the same Paramter ID format:
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

    async def start(self):
        """Start the Hydros system"""
        try:
            self.logger.info("Starting Hydros system")

            # Validate configuration
            if not self.validate_configuration():
                raise RuntimeError("Configuration validation failed")

            # Load plant model
            self.plant_model.load_plant_configuration(str(self.plant_config_file))

            # Initialize based on mode
            if self.mode == "simulation":
                self.initialize_simulation_mode()
                self.running = True
                await self.run_simulation_mode()

            elif self.mode in ["gateway", "edge_gateway"]:
                self.initialize_gateway_mode()
                self.running = True
                await self.run_gateway_mode()

            elif self.mode == "hybrid":
                self.initialize_hybrid_mode()
                self.running = True
                await self.run_hybrid_mode()

            else:
                raise ValueError(f"Unknown mode: {self.mode}")

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
    parser = argparse.ArgumentParser(description="Unified Hydros WTP System")

    parser.add_argument(
        "--mode",
        choices=["simulation", "gateway", "edge_gateway", "hybrid"],
        default="simulation",
        help="Operation mode",
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

    args = parser.parse_args()

    # Setup logging
    setup_logging(args.log_level)

    # Setup signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Create and start system
    try:
        system = HydrosSystem(args.mode)
        system.config_dir = Path(args.config_dir)

        # Update config file paths
        system.plant_config_file = system.config_dir / "plant_config.yaml"
        system.mapping_config_file = (
            system.config_dir / "wtp-porto-01_modbus_mapping.json"
        )
        system.gateway_config_file = (
            system.config_dir / "wtp-porto-01_edge_gateway_config.yaml"
        )

        await system.start()

    except KeyboardInterrupt:
        print("\nShutdown requested by user")
    except Exception as e:
        print(f"Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
