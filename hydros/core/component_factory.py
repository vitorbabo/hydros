"""
Component Factory for Building Modular Water Treatment Plant Configurations

This module provides a factory pattern for creating different WTP configurations
from predefined templates and custom specifications.
"""

from typing import Any, Dict, List, Optional

import yaml

from .wtp_components import MeasurementType, Parameter, ParameterType, WTPComponent


class ComponentFactory:
    """Factory for creating WTP components from configuration templates"""

    def __init__(self, config_file: str = "wtp_config.yaml"):
        with open(config_file, "r") as f:
            self.config = yaml.safe_load(f)

        self.module_templates = self.config.get("module_templates", {})
        self.site_configurations = self.config.get("site_configurations", {})

    def create_site_components(self, site_id: str) -> Dict[str, WTPComponent]:
        """Create all components for a specific site configuration"""

        if site_id not in self.site_configurations:
            raise ValueError(f"Site configuration '{site_id}' not found")

        site_config = self.site_configurations[site_id]
        modules = site_config.get("modules", [])

        components = {}
        tag_counter = {"DB": 1, "offset": 100}

        for i, module_name in enumerate(modules):
            # Handle multiple instances of same module type (e.g., intake_pump_1, intake_pump_2)
            base_module = module_name.rstrip("_0123456789")
            instance_id = module_name

            if base_module in self.module_templates:
                component = self._create_component_from_template(
                    base_module, instance_id, tag_counter, site_config
                )
                components[instance_id] = component

        return components

    def _create_component_from_template(
        self,
        template_name: str,
        component_id: str,
        tag_counter: Dict[str, int],
        site_config: Dict[str, Any],
    ) -> WTPComponent:
        """Create a component from a template definition"""

        template = self.module_templates[template_name]

        # Generate parameters based on template
        parameters = []

        # Add required sensors
        for sensor_type in template.get("required_sensors", []):
            param = self._create_parameter(
                sensor_type,
                ParameterType.SENSOR,
                tag_counter,
                template_name,
                site_config,
            )
            if param:
                parameters.append(param)

        # Add optional sensors (with probability)
        for sensor_type in template.get("optional_sensors", []):
            if self._should_include_optional(sensor_type, template_name):
                param = self._create_parameter(
                    sensor_type,
                    ParameterType.SENSOR,
                    tag_counter,
                    template_name,
                    site_config,
                )
                if param:
                    parameters.append(param)

        # Add actuators
        for actuator_type in template.get("actuators", []):
            param = self._create_parameter(
                actuator_type,
                ParameterType.ACTUATOR,
                tag_counter,
                template_name,
                site_config,
            )
            if param:
                parameters.append(param)

        # Add status parameters based on component type
        if template.get("type") in ["pump", "filtration", "disinfection"]:
            # Most equipment has run status
            param = self._create_parameter(
                "run_status",
                ParameterType.STATUS,
                tag_counter,
                template_name,
                site_config,
            )
            if param:
                parameters.append(param)

        return WTPComponent(
            component_id=component_id,
            component_name=template.get(
                "description", component_id.replace("_", " ").title()
            ),
            component_type=template.get("type", "generic"),
            parameters=parameters,
        )

    def _create_parameter(
        self,
        measurement_name: str,
        param_type: ParameterType,
        tag_counter: Dict[str, int],
        template_name: str,
        site_config: Dict[str, Any],
    ) -> Optional[Parameter]:
        """Create a parameter with appropriate PLC tag and characteristics"""

        # Map measurement names to MeasurementType enum
        measurement_map = {
            "level": MeasurementType.LEVEL,
            "flow_rate": MeasurementType.FLOW_RATE,
            "turbidity": MeasurementType.TURBIDITY,
            "ph": MeasurementType.PH,
            "temperature": MeasurementType.TEMPERATURE,
            "pressure": MeasurementType.PRESSURE,
            "differential_pressure": MeasurementType.DIFFERENTIAL_PRESSURE,
            "conductivity": MeasurementType.CONDUCTIVITY,
            "dissolved_oxygen": MeasurementType.DISSOLVED_OXYGEN,
            "chlorine_residual": MeasurementType.CHLORINE_RESIDUAL,
            "alkalinity": MeasurementType.ALKALINITY,
            "toc": MeasurementType.TOC,
            "motor_current": MeasurementType.MOTOR_CURRENT,
            "motor_temperature": MeasurementType.MOTOR_TEMPERATURE,
            "vibration": MeasurementType.VIBRATION,
            "power_consumption": MeasurementType.POWER_CONSUMPTION,
            "chemical_tank_level": MeasurementType.CHEMICAL_TANK_LEVEL,
            "chemical_dose_rate": MeasurementType.CHEMICAL_DOSE_RATE,
            "pump_speed": MeasurementType.PUMP_SPEED,
            "valve_position": MeasurementType.VALVE_POSITION,
            "run_status": MeasurementType.RUN_STATUS,
            "alarm_status": MeasurementType.ALARM_STATUS,
            "maintenance_mode": MeasurementType.MAINTENANCE_MODE,
        }

        if measurement_name not in measurement_map:
            return None

        measurement_type = measurement_map[measurement_name]

        # Generate unique PLC tag
        tag = self._generate_plc_tag(tag_counter, param_type)

        # Define parameter characteristics based on measurement type
        param_specs = self._get_parameter_specs(
            measurement_type, template_name, site_config
        )

        return Parameter(
            tag=tag,
            parameter_type=param_type,
            measurement=measurement_type,
            unit=param_specs["unit"],
            min_value=param_specs["min_value"],
            max_value=param_specs["max_value"],
            precision=param_specs["precision"],
            quality_degradation_chance=param_specs.get(
                "quality_degradation_chance", 0.02
            ),
        )

    def _generate_plc_tag(
        self, tag_counter: Dict[str, int], param_type: ParameterType
    ) -> str:
        """Generate realistic PLC tag addresses"""

        db = tag_counter["DB"]
        offset = tag_counter["offset"]

        if param_type == ParameterType.STATUS:
            # Boolean/bit parameters use DBX format
            tag = f"DB{db}.DBX{offset}.0"
            tag_counter["offset"] += 2  # Bits take 2-byte boundaries in S7
        else:
            # Numeric parameters use DBW (Word) format
            tag = f"DB{db}.DBW{offset}"
            tag_counter["offset"] += 2  # Words are 2 bytes

        # Move to next DB block every 50 parameters
        if tag_counter["offset"] >= 200:
            tag_counter["DB"] += 1
            tag_counter["offset"] = 100

        return tag

    def _get_parameter_specs(
        self,
        measurement_type: MeasurementType,
        template_name: str,
        site_config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Get parameter specifications based on measurement type and context"""

        # Default specifications for each measurement type
        specs = {
            MeasurementType.LEVEL: {
                "unit": "m",
                "min_value": 0.0,
                "max_value": 10.0,
                "precision": 2,
            },
            MeasurementType.FLOW_RATE: {
                "unit": "m3/h",
                "min_value": 0.0,
                "max_value": 100.0,
                "precision": 1,
            },
            MeasurementType.TURBIDITY: {
                "unit": "NTU",
                "min_value": 0.0,
                "max_value": 100.0,
                "precision": 2,
            },
            MeasurementType.PH: {
                "unit": "pH",
                "min_value": 4.0,
                "max_value": 12.0,
                "precision": 2,
            },
            MeasurementType.TEMPERATURE: {
                "unit": "°C",
                "min_value": -10.0,
                "max_value": 50.0,
                "precision": 1,
            },
            MeasurementType.PRESSURE: {
                "unit": "bar",
                "min_value": 0.0,
                "max_value": 10.0,
                "precision": 2,
            },
            MeasurementType.DIFFERENTIAL_PRESSURE: {
                "unit": "mbar",
                "min_value": 0,
                "max_value": 500,
                "precision": 0,
            },
            MeasurementType.CONDUCTIVITY: {
                "unit": "µS/cm",
                "min_value": 50,
                "max_value": 2000,
                "precision": 0,
            },
            MeasurementType.DISSOLVED_OXYGEN: {
                "unit": "mg/L",
                "min_value": 0.0,
                "max_value": 20.0,
                "precision": 2,
            },
            MeasurementType.CHLORINE_RESIDUAL: {
                "unit": "mg/L",
                "min_value": 0.0,
                "max_value": 5.0,
                "precision": 2,
            },
            MeasurementType.ALKALINITY: {
                "unit": "mg/L",
                "min_value": 20.0,
                "max_value": 300.0,
                "precision": 1,
            },
            MeasurementType.TOC: {
                "unit": "mg/L",
                "min_value": 0.0,
                "max_value": 20.0,
                "precision": 2,
            },
            MeasurementType.MOTOR_CURRENT: {
                "unit": "A",
                "min_value": 0.0,
                "max_value": 50.0,
                "precision": 1,
            },
            MeasurementType.MOTOR_TEMPERATURE: {
                "unit": "°C",
                "min_value": 15.0,
                "max_value": 100.0,
                "precision": 1,
            },
            MeasurementType.VIBRATION: {
                "unit": "mm/s",
                "min_value": 0.1,
                "max_value": 10.0,
                "precision": 2,
            },
            MeasurementType.POWER_CONSUMPTION: {
                "unit": "kW",
                "min_value": 0.0,
                "max_value": 50.0,
                "precision": 1,
            },
            MeasurementType.CHEMICAL_TANK_LEVEL: {
                "unit": "m",
                "min_value": 0.1,
                "max_value": 5.0,
                "precision": 2,
            },
            MeasurementType.CHEMICAL_DOSE_RATE: {
                "unit": "mg/L",
                "min_value": 0.0,
                "max_value": 50.0,
                "precision": 2,
            },
            MeasurementType.PUMP_SPEED: {
                "unit": "%",
                "min_value": 0.0,
                "max_value": 100.0,
                "precision": 1,
            },
            MeasurementType.VALVE_POSITION: {
                "unit": "%",
                "min_value": 0.0,
                "max_value": 100.0,
                "precision": 1,
            },
            MeasurementType.RUN_STATUS: {
                "unit": "bool",
                "min_value": 0,
                "max_value": 1,
                "precision": 0,
            },
            MeasurementType.ALARM_STATUS: {
                "unit": "bool",
                "min_value": 0,
                "max_value": 1,
                "precision": 0,
            },
            MeasurementType.MAINTENANCE_MODE: {
                "unit": "bool",
                "min_value": 0,
                "max_value": 1,
                "precision": 0,
            },
        }

        # Adjust ranges based on template type and site configuration
        base_spec = specs.get(
            measurement_type,
            {"unit": "unit", "min_value": 0, "max_value": 100, "precision": 2},
        )

        # Context-specific adjustments
        if (
            template_name == "intake_pump"
            and measurement_type == MeasurementType.FLOW_RATE
        ):
            # Intake pumps typically have higher flow rates
            base_spec["max_value"] = (
                site_config.get("parameters", {}).get("normal_flow_rate", 50) * 1.5
            )

        elif (
            template_name == "finished_water_pump"
            and measurement_type == MeasurementType.PRESSURE
        ):
            # Distribution pumps need higher pressure
            base_spec["max_value"] = 8.0

        elif measurement_type == MeasurementType.TURBIDITY:
            # Adjust turbidity ranges based on treatment stage
            if "raw" in template_name or "intake" in template_name:
                base_spec["max_value"] = 50.0
            elif "clarifier" in template_name:
                base_spec["max_value"] = 10.0
            elif "filter" in template_name:
                base_spec["max_value"] = 2.0

        return base_spec

    def _should_include_optional(self, sensor_type: str, template_name: str) -> bool:
        """Determine if optional sensors should be included"""

        # Include advanced sensors in more modern/larger plants
        advanced_sensors = [
            "dissolved_oxygen",
            "toc",
            "chlorophyll_a",
            "streaming_current",
        ]

        if sensor_type in advanced_sensors:
            return True  # For demo purposes, include most advanced sensors

        return True  # Include all optional sensors for comprehensive demo

    def list_available_configurations(self) -> List[str]:
        """List all available site configurations"""
        return list(self.site_configurations.keys())

    def list_available_modules(self) -> List[str]:
        """List all available module templates"""
        return list(self.module_templates.keys())

    def get_site_info(self, site_id: str) -> Dict[str, Any]:
        """Get information about a specific site configuration"""
        if site_id not in self.site_configurations:
            return {}

        config = self.site_configurations[site_id]
        return {
            "name": config.get("name", site_id),
            "capacity": config.get("design_capacity", "Unknown"),
            "treatment_train": config.get("treatment_train", "conventional"),
            "modules": config.get("modules", []),
            "parameters": config.get("parameters", {}),
        }
