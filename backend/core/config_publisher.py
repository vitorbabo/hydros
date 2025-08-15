#!/usr/bin/env python3
"""
Configuration Publisher

MQTT-based configuration publisher for real-time distribution of plant configurations
to dashboards and other consumers. Publishes site configurations, module templates,
and parameter specifications to structured MQTT topics.
"""

import asyncio
import json
import logging
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

try:
    import yaml
    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False

from core.config_validator import ConfigValidator


@dataclass
class ConfigurationMessage:
    """Standardized configuration message structure for MQTT publishing"""
    
    site_id: str
    config_type: str  # 'plant', 'modules', 'parameters'
    version: str
    timestamp: str
    data: Dict[str, Any]
    source: str = "hydros-backend"
    seq: int = 1


class ConfigurationPublisher:
    """
    MQTT-based configuration publisher for real-time configuration distribution.
    
    Publishes configuration data to MQTT topics for consumption by dashboards,
    other systems, and monitoring tools.
    
    Topic Structure:
    - /wtp/{site_id}/configuration/plant - Site-specific plant configuration
    - /wtp/{site_id}/configuration/status - Configuration status and health
    - /wtp/global/configuration/templates - Global module templates
    - /wtp/global/configuration/parameters - Global parameter specifications
    """
    
    def __init__(self, site_id: str, mqtt_handler: Optional[Any] = None):
        self.site_id = site_id
        self.mqtt_handler = mqtt_handler
        
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Maintain backward compatibility properties
        self.connected = mqtt_handler.is_connected() if mqtt_handler else False
        self.sequence_number = 1
        
        # Configuration paths
        self.config_dir = Path("config")
        self.site_config_dir = self.config_dir / "sites" / site_id
        self.templates_dir = self.config_dir / "templates"
        
        # Configuration validator
        self.validator = ConfigValidator()
        
        # Publishing state
        self.last_published: Dict[str, float] = {}
        self.publish_interval = 30.0  # seconds
        
        self.logger.info(f"Initialized configuration publisher for site {site_id}")
    
    async def connect(self) -> bool:
        """Connect to MQTT broker (now handled by shared MQTT handler)"""
        if self.mqtt_handler:
            self.connected = self.mqtt_handler.is_connected()
            return self.connected
        else:
            self.logger.warning("No MQTT handler available")
            return False
    
    async def disconnect(self):
        """Disconnect from MQTT broker (now handled by shared MQTT handler)"""
        # MQTT handler is managed by HydrosSystem, nothing to do here
        self.connected = False
    
    def _load_yaml_file(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Load and parse YAML configuration file"""
        if not YAML_AVAILABLE:
            self.logger.error("YAML not available - PyYAML not installed")
            return None
            
        try:
            if not file_path.exists():
                self.logger.warning(f"Configuration file not found: {file_path}")
                return None
                
            with open(file_path, 'r') as f:
                return yaml.safe_load(f)
                
        except Exception as e:
            self.logger.error(f"Failed to load configuration file {file_path}: {e}")
            return None
    
    def _create_config_message(self, config_type: str, data: Dict[str, Any]) -> ConfigurationMessage:
        """Create standardized configuration message"""
        return ConfigurationMessage(
            site_id=self.site_id,
            config_type=config_type,
            version="1.0",
            timestamp=datetime.now(timezone.utc).isoformat(),
            data=data,
            seq=self.sequence_number
        )
    
    async def publish_plant_configuration(self) -> bool:
        """Publish site-specific plant configuration"""
        if not self.mqtt_handler:
            self.logger.warning("MQTT handler not available")
            return False
            
        # Load plant configuration
        plant_config_file = self.site_config_dir / "plant.yaml"
        plant_config = self._load_yaml_file(plant_config_file)
        
        if not plant_config:
            self.logger.error(f"Failed to load plant configuration for {self.site_id}")
            return False
        
        # Validate configuration
        try:
            valid, errors = self.validator.validate_site_config(self.site_id)
            if valid:
                self.logger.debug("Plant configuration validation successful")
            else:
                self.logger.warning(f"Plant configuration validation failed: {errors}")
        except Exception as e:
            self.logger.warning(f"Plant configuration validation failed: {e}")
            # Continue publishing even if validation fails
        
        # Create and publish message using shared MQTT handler
        config_msg = self._create_config_message("plant", plant_config)
        
        try:
            success = await self.mqtt_handler.publish_configuration(
                "plant", 
                asdict(config_msg), 
                site_id=self.site_id, 
                qos=1
            )
            
            if success:
                self.sequence_number += 1
                self.last_published["plant"] = time.time()
                self.logger.info(f"Published plant configuration to wtp/{self.site_id}/configuration/plant")
                return True
            else:
                self.logger.error("Failed to publish plant configuration")
                return False
                
        except Exception as e:
            self.logger.error(f"Error publishing plant configuration: {e}")
            return False
    
    async def publish_global_templates(self) -> bool:
        """Publish global module templates"""
        if not self.mqtt_handler:
            self.logger.warning("MQTT handler not available")
            return False
        
        # Load module templates
        modules_file = self.templates_dir / "modules.yaml"
        modules_config = self._load_yaml_file(modules_file)
        
        if not modules_config:
            self.logger.error("Failed to load module templates")
            return False
        
        # Validate configuration
        try:
            valid, errors = self.validator.validate_module_templates()
            if valid:
                self.logger.debug("Module templates validation successful")
            else:
                self.logger.warning(f"Module templates validation failed: {errors}")
        except Exception as e:
            self.logger.warning(f"Module templates validation failed: {e}")
        
        # Create and publish message using shared MQTT handler
        config_msg = self._create_config_message("modules", modules_config)
        
        try:
            success = await self.mqtt_handler.publish_configuration(
                "templates", 
                asdict(config_msg), 
                site_id=None,  # Global configuration
                qos=1
            )
            
            if success:
                self.sequence_number += 1
                self.last_published["modules"] = time.time()
                self.logger.info("Published module templates to wtp/global/configuration/templates")
                return True
            else:
                self.logger.error("Failed to publish module templates")
                return False
                
        except Exception as e:
            self.logger.error(f"Error publishing module templates: {e}")
            return False
    
    async def publish_global_parameters(self) -> bool:
        """Publish global parameter specifications"""
        if not self.mqtt_handler:
            self.logger.warning("MQTT handler not available")
            return False
        
        # Load parameter specifications
        parameters_file = self.templates_dir / "parameters.yaml"
        parameters_config = self._load_yaml_file(parameters_file)
        
        if not parameters_config:
            self.logger.error("Failed to load parameter specifications")
            return False
        
        # Validate configuration
        try:
            valid, errors = self.validator.validate_parameter_specifications()
            if valid:
                self.logger.debug("Parameter specifications validation successful")
            else:
                self.logger.warning(f"Parameter specifications validation failed: {errors}")
        except Exception as e:
            self.logger.warning(f"Parameter specifications validation failed: {e}")
        
        # Create and publish message using shared MQTT handler
        config_msg = self._create_config_message("parameters", parameters_config)
        
        try:
            success = await self.mqtt_handler.publish_configuration(
                "parameters", 
                asdict(config_msg), 
                site_id=None,  # Global configuration
                qos=1
            )
            
            if success:
                self.sequence_number += 1
                self.last_published["parameters"] = time.time()
                self.logger.info("Published parameter specifications to wtp/global/configuration/parameters")
                return True
            else:
                self.logger.error("Failed to publish parameter specifications")
                return False
                
        except Exception as e:
            self.logger.error(f"Error publishing parameter specifications: {e}")
            return False
    
    async def publish_configuration_status(self) -> bool:
        """Publish configuration status and health information"""
        if not self.mqtt_handler:
            self.logger.warning("MQTT handler not available")
            return False
        
        # Gather status information
        status_data = {
            "site_id": self.site_id,
            "status": "healthy",
            "last_validation": datetime.now(timezone.utc).isoformat(),
            "configuration_files": {
                "plant": {
                    "exists": (self.site_config_dir / "plant.yaml").exists(),
                    "last_published": self.last_published.get("plant", 0)
                },
                "modules": {
                    "exists": (self.templates_dir / "modules.yaml").exists(),
                    "last_published": self.last_published.get("modules", 0)
                },
                "parameters": {
                    "exists": (self.templates_dir / "parameters.yaml").exists(),
                    "last_published": self.last_published.get("parameters", 0)
                }
            },
            "mqtt": {
                "connected": self.mqtt_handler.is_connected(),
                "handler_stats": self.mqtt_handler.get_statistics()
            }
        }
        
        # Run quick validation check
        try:
            self.validator.validate_all_configurations()
            status_data["validation_status"] = "passed"
        except Exception as e:
            status_data["validation_status"] = "failed"
            status_data["validation_error"] = str(e)
        
        # Create and publish message using shared MQTT handler
        config_msg = self._create_config_message("status", status_data)
        
        try:
            success = await self.mqtt_handler.publish_status(
                "configuration", 
                asdict(config_msg), 
                site_id=self.site_id, 
                qos=0
            )
            
            if success:
                self.sequence_number += 1
                self.logger.debug(f"Published configuration status to wtp/{self.site_id}/status/configuration")
                return True
            else:
                self.logger.error("Failed to publish configuration status")
                return False
                
        except Exception as e:
            self.logger.error(f"Error publishing configuration status: {e}")
            return False
    
    async def publish_all_configurations(self) -> bool:
        """Publish all configuration types"""
        success = True
        
        self.logger.info("Publishing all configurations...")
        
        # Publish in order: global templates first, then site-specific
        success &= await self.publish_global_templates()
        success &= await self.publish_global_parameters()
        success &= await self.publish_plant_configuration()
        success &= await self.publish_configuration_status()
        
        if success:
            self.logger.info("Successfully published all configurations")
        else:
            self.logger.warning("Some configuration publications failed")
        
        return success
    
    async def start_periodic_publishing(self, interval: float = 300.0):
        """Start periodic configuration publishing"""
        self.publish_interval = interval
        self.logger.info(f"Starting periodic configuration publishing every {interval} seconds")
        
        while self.connected:
            try:
                await self.publish_all_configurations()
                await asyncio.sleep(interval)
            except asyncio.CancelledError:
                self.logger.info("Periodic publishing cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error in periodic publishing: {e}")
                await asyncio.sleep(30)  # Wait before retry
    
    async def reload_and_publish(self) -> bool:
        """Reload configurations from disk and publish immediately"""
        self.logger.info("Reloading and publishing configurations...")
        return await self.publish_all_configurations()


# Convenience function for standalone usage
async def publish_site_configuration(site_id: str, mqtt_host: str = "localhost", mqtt_port: int = 1883) -> bool:
    """Standalone function to publish configuration for a specific site"""
    publisher = ConfigurationPublisher(site_id, mqtt_host, mqtt_port)
    
    if not await publisher.connect():
        return False
    
    try:
        result = await publisher.publish_all_configurations()
        return result
    finally:
        await publisher.disconnect()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Hydros Configuration Publisher")
    parser.add_argument("--site-id", default="wtp-porto-01", help="Site ID to publish configuration for")
    parser.add_argument("--mqtt-host", default="localhost", help="MQTT broker host")
    parser.add_argument("--mqtt-port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--periodic", action="store_true", help="Start periodic publishing")
    parser.add_argument("--interval", type=float, default=300.0, help="Publishing interval in seconds")
    
    args = parser.parse_args()
    
    logging.basicConfig(level=logging.INFO)
    
    async def main():
        publisher = ConfigurationPublisher(args.site_id, args.mqtt_host, args.mqtt_port)
        
        if not await publisher.connect():
            print("Failed to connect to MQTT broker")
            return
        
        try:
            if args.periodic:
                await publisher.start_periodic_publishing(args.interval)
            else:
                await publisher.publish_all_configurations()
        finally:
            await publisher.disconnect()
    
    asyncio.run(main())