#!/usr/bin/env python3
"""
Plant Model

Unified plant model representing the digital twin of the WTP system.
Manages component lifecycle, state synchronization, and parameter mapping.
"""

import logging
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum

try:
    import yaml

    YAML_AVAILABLE = True
except ImportError:
    YAML_AVAILABLE = False


class ComponentState(Enum):
    """Component operational states"""

    INACTIVE = "inactive"
    ACTIVE = "active"
    FAULT = "fault"
    MAINTENANCE = "maintenance"


@dataclass
class ComponentMetadata:
    """Metadata for plant components"""

    component_id: str
    component_type: str
    module_id: str
    description: str = ""
    tags: List[str] = field(default_factory=list)
    parameters: Dict[str, Any] = field(default_factory=dict)
    state: ComponentState = ComponentState.INACTIVE
    last_update: float = field(default_factory=time.time)


class PlantModel:
    """
    Unified plant model that manages all components and their states.

    This class serves as the central digital twin, maintaining:
    - Component registry and metadata
    - Real-time parameter values
    - Component relationships and dependencies
    - State synchronization across simulation and edge gateway modes
    """

    def __init__(self, config_file: Optional[str] = None):
        self.logger = logging.getLogger(self.__class__.__name__)

        # Component management
        self.components: Dict[str, Any] = {}  # component_id -> component instance
        self.metadata: Dict[str, ComponentMetadata] = {}  # component_id -> metadata
        self.parameters: Dict[str, Any] = {}  # parameter_id -> current value

        # Plant configuration
        self.plant_config = {}
        self.modules = {}

        # Runtime statistics
        self.stats = {
            "total_components": 0,
            "active_components": 0,
            "total_parameters": 0,
            "last_update_cycle": 0,
            "update_count": 0,
        }

        if config_file:
            self.load_plant_configuration(config_file)

    def load_plant_configuration(self, config_file: str, site_id: str = "wtp-porto-01"):
        """Load plant configuration from YAML file"""
        if not YAML_AVAILABLE:
            raise ImportError("PyYAML required for configuration loading")

        try:
            with open(config_file, "r") as f:
                self.plant_config = yaml.safe_load(f)

            self.logger.info(f"Loaded plant configuration from {config_file}")

            # Extract modules configuration from site configurations
            site_configs = self.plant_config.get("site_configurations", {})
            site_data = site_configs.get(site_id, {})

            if not site_data:
                self.logger.warning(f"Site configuration '{site_id}' not found")
                self.modules = {}
            else:
                # Convert modules list to dict format
                modules_list = site_data.get("modules", [])
                self.modules = {mod: {"id": mod} for mod in modules_list}

            self.logger.info(f"Configured {len(self.modules)} plant modules")

        except Exception as e:
            self.logger.error(f"Failed to load plant configuration: {e}")
            raise

    def load_site_configuration(self, site_config_file: str, templates_dir: str):
        """Load site-specific configuration with centralized templates"""
        if not YAML_AVAILABLE:
            raise ImportError("PyYAML required for configuration loading")

        try:
            # Load site configuration
            with open(site_config_file, "r") as f:
                self.site_config = yaml.safe_load(f)

            # Load module templates
            modules_template_file = f"{templates_dir}/modules.yaml"
            with open(modules_template_file, "r") as f:
                self.module_templates = yaml.safe_load(f)

            # Load parameter specifications
            params_template_file = f"{templates_dir}/parameters.yaml"
            with open(params_template_file, "r") as f:
                self.parameter_specs = yaml.safe_load(f)

            self.logger.info(f"Loaded site configuration from {site_config_file}")

            # Extract site information
            site_info = self.site_config.get("site_info", {})
            self.site_id = site_info.get("site_id", "unknown")
            self.plant_name = site_info.get("name", "Unknown Plant")

            # Convert modules list to dict format for compatibility
            modules_list = self.site_config.get("modules", [])
            self.modules = {mod: {"id": mod} for mod in modules_list}
            
            # Store the full plant config for compatibility with existing code
            # This creates a backward-compatible structure
            self.plant_config = {
                "site_configurations": {
                    self.site_id: {
                        "modules": modules_list,
                        **self.site_config
                    }
                },
                "module_templates": self.module_templates.get("module_templates", {}),
                "parameter_specifications": self.parameter_specs.get("parameter_specifications", {})
            }

            self.logger.info(f"Configured {len(self.modules)} plant modules for site {self.site_id}")

        except Exception as e:
            self.logger.error(f"Failed to load site configuration: {e}")
            raise

    def register_component(
        self, component_id: str, component: Any, metadata: ComponentMetadata
    ):
        """Register a component with the plant model"""
        self.components[component_id] = component
        self.metadata[component_id] = metadata

        # Initialize component parameters
        if hasattr(component, "get_parameters"):
            params = component.get_parameters()
            for param_name, param_value in params.items():
                param_id = f"{component_id}.{param_name}"
                self.parameters[param_id] = param_value

        self.stats["total_components"] += 1
        if metadata.state == ComponentState.ACTIVE:
            self.stats["active_components"] += 1

        self.logger.debug(f"Registered component: {component_id}")

    def unregister_component(self, component_id: str):
        """Unregister a component from the plant model"""
        if component_id in self.components:
            # Remove component parameters
            param_keys_to_remove = [
                k for k in self.parameters.keys() if k.startswith(f"{component_id}.")
            ]
            for param_key in param_keys_to_remove:
                del self.parameters[param_key]

            # Remove component and metadata
            metadata = self.metadata.get(component_id)
            if metadata and metadata.state == ComponentState.ACTIVE:
                self.stats["active_components"] -= 1

            del self.components[component_id]
            del self.metadata[component_id]
            self.stats["total_components"] -= 1

            self.logger.debug(f"Unregistered component: {component_id}")

    def update_component_state(self, component_id: str, new_state: ComponentState):
        """Update component operational state"""
        if component_id in self.metadata:
            old_state = self.metadata[component_id].state
            self.metadata[component_id].state = new_state
            self.metadata[component_id].last_update = time.time()

            # Update active component count
            if (
                old_state == ComponentState.ACTIVE
                and new_state != ComponentState.ACTIVE
            ):
                self.stats["active_components"] -= 1
            elif (
                old_state != ComponentState.ACTIVE
                and new_state == ComponentState.ACTIVE
            ):
                self.stats["active_components"] += 1

            self.logger.debug(
                f"Component {component_id} state: {old_state.value} -> {new_state.value}"
            )

    def update_component_parameters(self, component_id: str) -> Dict[str, Any]:
        """Update parameters for a specific component"""
        if component_id not in self.components:
            return {}

        component = self.components[component_id]
        updated_params = {}

        try:
            # Update component simulation
            if hasattr(component, "update"):
                component.update()

            # Get current parameters
            if hasattr(component, "get_parameters"):
                params = component.get_parameters()

                for param_name, param_value in params.items():
                    param_id = f"{component_id}.{param_name}"
                    old_value = self.parameters.get(param_id)

                    if old_value != param_value:
                        self.parameters[param_id] = param_value
                        updated_params[param_id] = param_value

                # Update metadata
                if component_id in self.metadata:
                    self.metadata[component_id].last_update = time.time()

        except Exception as e:
            self.logger.error(f"Error updating component {component_id}: {e}")
            self.update_component_state(component_id, ComponentState.FAULT)

        return updated_params

    def update_all_components(self) -> Dict[str, Any]:
        """Update all active components and return changed parameters"""
        start_time = time.time()
        all_updated_params = {}

        active_components = [
            comp_id
            for comp_id, metadata in self.metadata.items()
            if metadata.state == ComponentState.ACTIVE
        ]

        for component_id in active_components:
            updated_params = self.update_component_parameters(component_id)
            all_updated_params.update(updated_params)

        # Update statistics
        self.stats["last_update_cycle"] = time.time() - start_time
        self.stats["update_count"] += 1
        self.stats["total_parameters"] = len(self.parameters)

        self.logger.debug(
            f"Updated {len(active_components)} components, {len(all_updated_params)} parameters changed"
        )

        return all_updated_params

    def get_parameter_value(self, parameter_id: str) -> Any:
        """Get current value of a parameter"""
        return self.parameters.get(parameter_id)

    def set_parameter_value(self, parameter_id: str, value: Any) -> bool:
        """Set parameter value (for external control)"""
        try:
            # Parse component and parameter from ID
            if "." not in parameter_id:
                self.logger.warning(f"Invalid parameter ID format: {parameter_id}")
                return False

            component_id, param_name = parameter_id.rsplit(".", 1)

            if component_id not in self.components:
                self.logger.warning(f"Component not found: {component_id}")
                return False

            component = self.components[component_id]

            # Set parameter on component if it supports it
            if hasattr(component, "set_parameter"):
                success = component.set_parameter(param_name, value)
                if success:
                    self.parameters[parameter_id] = value
                    return True
            else:
                # Direct parameter update
                self.parameters[parameter_id] = value
                return True

        except Exception as e:
            self.logger.error(f"Error setting parameter {parameter_id}: {e}")

        return False

    def get_all_parameters(self) -> Dict[str, Any]:
        """Get all current parameter values"""
        return self.parameters.copy()

    def get_component_parameters(self, component_id: str) -> Dict[str, Any]:
        """Get all parameters for a specific component"""
        prefix = f"{component_id}."
        return {
            param_id: value
            for param_id, value in self.parameters.items()
            if param_id.startswith(prefix)
        }

    def get_components_by_type(self, component_type: str) -> Dict[str, Any]:
        """Get all components of a specific type"""
        return {
            comp_id: component
            for comp_id, component in self.components.items()
            if self.metadata[comp_id].component_type == component_type
        }

    def get_components_by_module(self, module_id: str) -> Dict[str, Any]:
        """Get all components belonging to a specific module"""
        return {
            comp_id: component
            for comp_id, component in self.components.items()
            if self.metadata[comp_id].module_id == module_id
        }

    def get_plant_statistics(self) -> Dict[str, Any]:
        """Get current plant statistics"""
        stats = self.stats.copy()

        # Add state breakdown
        state_counts = {}
        for metadata in self.metadata.values():
            state = metadata.state.value
            state_counts[state] = state_counts.get(state, 0) + 1

        stats["component_states"] = state_counts
        stats["modules_configured"] = len(self.modules)

        return stats

    def export_current_state(self) -> Dict[str, Any]:
        """Export complete current state for persistence or debugging"""
        return {
            "timestamp": time.time(),
            "parameters": self.get_all_parameters(),
            "component_metadata": {
                comp_id: {
                    "type": meta.component_type,
                    "module": meta.module_id,
                    "state": meta.state.value,
                    "last_update": meta.last_update,
                }
                for comp_id, meta in self.metadata.items()
            },
            "statistics": self.get_plant_statistics(),
        }

    def import_state(self, state_data: Dict[str, Any]):
        """Import state data (for initialization or recovery)"""
        try:
            if "parameters" in state_data:
                for param_id, value in state_data["parameters"].items():
                    self.set_parameter_value(param_id, value)

            if "component_metadata" in state_data:
                for comp_id, meta_data in state_data["component_metadata"].items():
                    if comp_id in self.metadata:
                        state_value = meta_data.get("state", "inactive")
                        try:
                            new_state = ComponentState(state_value)
                            self.update_component_state(comp_id, new_state)
                        except ValueError:
                            self.logger.warning(
                                f"Invalid state value for {comp_id}: {state_value}"
                            )

            self.logger.info("Successfully imported plant state")

        except Exception as e:
            self.logger.error(f"Error importing state: {e}")
            raise
