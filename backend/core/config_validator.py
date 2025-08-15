"""
Configuration Validator Module

Provides comprehensive validation for Hydros configuration files using JSON schemas.
Validates site configurations, module templates, and parameter specifications.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import jsonschema
import yaml
from jsonschema import Draft7Validator

logger = logging.getLogger(__name__)


class ConfigurationValidationError(Exception):
    """Raised when configuration validation fails."""

    def __init__(self, message: str, errors: List[str] = None):
        super().__init__(message)
        self.errors = errors or []


class ConfigValidator:
    """
    Configuration validator using JSON schemas.

    Provides validation for:
    - Site configurations (plant.yaml files)
    - Module templates (modules.yaml)
    - Parameter specifications (parameters.yaml)
    """

    def __init__(self, config_base_path: Optional[str] = None):
        """
        Initialize the configuration validator.

        Args:
            config_base_path: Base path for configuration files. If None, uses default.
        """
        if config_base_path:
            self.config_base_path = Path(config_base_path)
        else:
            # Default to backend/config relative to this file
            self.config_base_path = Path(__file__).parent.parent / "config"

        self.schemas_path = self.config_base_path / "schemas"
        self._schemas: Dict[str, Dict] = {}
        self._validators: Dict[str, Draft7Validator] = {}

        # Load schemas on initialization
        self._load_schemas()

    def _load_schemas(self) -> None:
        """Load JSON schemas from the schemas directory."""
        schema_files = {
            "site_config": "site_config_schema.json",
            "module_templates": "module_templates_schema.json",
            "parameter_specifications": "parameter_specifications_schema.json",
        }

        for schema_name, filename in schema_files.items():
            schema_path = self.schemas_path / filename

            if not schema_path.exists():
                logger.warning(f"Schema file not found: {schema_path}")
                continue

            try:
                with open(schema_path, "r") as f:
                    schema = json.load(f)

                self._schemas[schema_name] = schema

                # Create validator with custom error handling
                validator_cls = jsonschema.validators.validator_for(schema)
                validator_cls.check_schema(schema)
                self._validators[schema_name] = validator_cls(schema)

                logger.debug(f"Loaded schema: {schema_name}")

            except Exception as e:
                logger.error(f"Failed to load schema {filename}: {e}")
                raise ConfigurationValidationError(
                    f"Failed to load validation schema {filename}: {e}"
                )

    def _load_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        """
        Load and parse a YAML file.

        Args:
            file_path: Path to the YAML file

        Returns:
            Parsed YAML content as dictionary

        Raises:
            ConfigurationValidationError: If file cannot be loaded or parsed
        """
        try:
            with open(file_path, "r") as f:
                content = yaml.safe_load(f)
                if content is None:
                    raise ValueError("Empty or invalid YAML file")
                return content

        except FileNotFoundError:
            raise ConfigurationValidationError(
                f"Configuration file not found: {file_path}"
            )
        except yaml.YAMLError as e:
            raise ConfigurationValidationError(
                f"Invalid YAML syntax in {file_path}: {e}"
            )
        except Exception as e:
            raise ConfigurationValidationError(f"Failed to load {file_path}: {e}")

    def _format_validation_errors(
        self, errors: List[jsonschema.ValidationError]
    ) -> List[str]:
        """
        Format validation errors into human-readable messages.

        Args:
            errors: List of jsonschema validation errors

        Returns:
            List of formatted error messages
        """
        formatted_errors = []

        for error in errors:
            path = (
                ".".join(str(p) for p in error.absolute_path)
                if error.absolute_path
                else "root"
            )

            # Customize error messages for better clarity
            if error.validator == "required":
                missing_props = ", ".join(f"'{prop}'" for prop in error.validator_value)
                message = f"Missing required properties {missing_props} at '{path}'"
            elif error.validator == "pattern":
                message = f"Value '{error.instance}' at '{path}' doesn't match required pattern '{error.validator_value}'"
            elif error.validator == "enum":
                allowed = ", ".join(f"'{v}'" for v in error.validator_value)
                message = (
                    f"Value '{error.instance}' at '{path}' must be one of: {allowed}"
                )
            elif error.validator == "type":
                message = f"Value at '{path}' must be of type '{error.validator_value}', got '{type(error.instance).__name__}'"
            elif error.validator in ["minimum", "maximum"]:
                message = f"Value '{error.instance}' at '{path}' {error.message}"
            elif error.validator in ["minItems", "maxItems"]:
                message = f"Array at '{path}' {error.message}"
            else:
                message = f"Validation error at '{path}': {error.message}"

            formatted_errors.append(message)

        return formatted_errors

    def validate_site_config(self, site_id: str) -> Tuple[bool, List[str]]:
        """
        Validate a site configuration file.

        Args:
            site_id: Site identifier (e.g., 'wtp-porto-01')

        Returns:
            Tuple of (is_valid, error_messages)
        """
        if "site_config" not in self._validators:
            return False, ["Site configuration schema not available"]

        site_config_path = self.config_base_path / "sites" / site_id / "plant.yaml"

        try:
            config_data = self._load_yaml_file(site_config_path)

            # Validate against schema
            validator = self._validators["site_config"]
            errors = list(validator.iter_errors(config_data))

            if errors:
                error_messages = self._format_validation_errors(errors)
                logger.warning(
                    f"Site configuration validation failed for {site_id}: {len(errors)} errors"
                )
                return False, error_messages

            # Additional custom validations
            custom_errors = self._validate_site_config_custom(config_data)

            if custom_errors:
                logger.warning(
                    f"Site configuration custom validation failed for {site_id}: {len(custom_errors)} errors"
                )
                return False, custom_errors

            logger.info(f"Site configuration validation passed for {site_id}")
            return True, []

        except ConfigurationValidationError as e:
            return False, [str(e)] + e.errors

    def _validate_site_config_custom(self, config_data: Dict[str, Any]) -> List[str]:
        """
        Perform custom validation logic for site configurations.

        Args:
            config_data: Loaded configuration data

        Returns:
            List of error messages
        """
        errors = []

        # Validate that operational flow rates make sense
        op_params = config_data.get("operational_parameters", {})
        normal_flow = op_params.get("normal_flow_rate", 0)
        design_flow = op_params.get("design_flow_rate", 0)

        if normal_flow > design_flow:
            errors.append("Normal flow rate cannot exceed design flow rate")

        # Validate that all modules in protocol clients exist in modules list
        modules = set(config_data.get("modules", []))
        for client in config_data.get("protocol_clients", []):
            assigned_modules = set(client.get("modules_assigned", []))
            invalid_modules = assigned_modules - modules
            if invalid_modules:
                client_id = client.get("client_id", "unknown")
                errors.append(
                    f"Protocol client '{client_id}' references non-existent modules: {list(invalid_modules)}"
                )

        # Validate control strategy references
        for strategy_name, strategy in config_data.get(
            "control_strategies", {}
        ).items():
            for param in strategy.get("inputs", []) + strategy.get("outputs", []):
                if "." in param:
                    module_name = param.split(".")[0]
                    if module_name not in modules:
                        errors.append(
                            f"Control strategy '{strategy_name}' references non-existent module '{module_name}'"
                        )

        # Validate alarm definition references
        for category, alarms in config_data.get("alarm_definitions", {}).items():
            for alarm_name, alarm in alarms.items():
                param = alarm.get("parameter", "")
                if "." in param:
                    module_name = param.split(".")[0]
                    if module_name not in modules:
                        errors.append(
                            f"Alarm '{category}.{alarm_name}' references non-existent module '{module_name}'"
                        )

        return errors

    def validate_module_templates(self) -> Tuple[bool, List[str]]:
        """
        Validate the module templates configuration.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        if "module_templates" not in self._validators:
            return False, ["Module templates schema not available"]

        templates_path = self.config_base_path / "templates" / "modules.yaml"

        try:
            config_data = self._load_yaml_file(templates_path)

            # Validate against schema
            validator = self._validators["module_templates"]
            errors = list(validator.iter_errors(config_data))

            if errors:
                error_messages = self._format_validation_errors(errors)
                logger.warning(
                    f"Module templates validation failed: {len(errors)} errors"
                )
                return False, error_messages

            logger.info("Module templates validation passed")
            return True, []

        except ConfigurationValidationError as e:
            return False, [str(e)] + e.errors

    def validate_parameter_specifications(self) -> Tuple[bool, List[str]]:
        """
        Validate the parameter specifications configuration.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        if "parameter_specifications" not in self._validators:
            return False, ["Parameter specifications schema not available"]

        params_path = self.config_base_path / "templates" / "parameters.yaml"

        try:
            config_data = self._load_yaml_file(params_path)

            # Validate against schema
            validator = self._validators["parameter_specifications"]
            errors = list(validator.iter_errors(config_data))

            if errors:
                error_messages = self._format_validation_errors(errors)
                logger.warning(
                    f"Parameter specifications validation failed: {len(errors)} errors"
                )
                return False, error_messages

            logger.info("Parameter specifications validation passed")
            return True, []

        except ConfigurationValidationError as e:
            return False, [str(e)] + e.errors

    def validate_all_configurations(
        self, site_ids: Optional[List[str]] = None
    ) -> Dict[str, Tuple[bool, List[str]]]:
        """
        Validate all configuration files.

        Args:
            site_ids: List of site IDs to validate. If None, validates all found sites.

        Returns:
            Dictionary with validation results for each configuration type
        """
        results = {}

        # Validate templates first (dependencies for sites)
        results["module_templates"] = self.validate_module_templates()
        results["parameter_specifications"] = self.validate_parameter_specifications()

        # Find all sites if not specified
        if site_ids is None:
            sites_dir = self.config_base_path / "sites"
            if sites_dir.exists():
                site_ids = [d.name for d in sites_dir.iterdir() if d.is_dir()]
            else:
                site_ids = []

        # Validate each site configuration
        for site_id in site_ids:
            results[f"site_{site_id}"] = self.validate_site_config(site_id)

        return results

    def get_validation_summary(self, results: Dict[str, Tuple[bool, List[str]]]) -> str:
        """
        Generate a human-readable summary of validation results.

        Args:
            results: Validation results from validate_all_configurations()

        Returns:
            Formatted validation summary
        """
        total_configs = len(results)
        passed_configs = sum(1 for is_valid, _ in results.values() if is_valid)
        failed_configs = total_configs - passed_configs

        summary = "Configuration Validation Summary:\n"
        summary += f"  Total configurations: {total_configs}\n"
        summary += f"  Passed: {passed_configs}\n"
        summary += f"  Failed: {failed_configs}\n\n"

        if failed_configs > 0:
            summary += "Failed configurations:\n"
            for config_name, (is_valid, errors) in results.items():
                if not is_valid:
                    summary += f"  ❌ {config_name}:\n"
                    for error in errors[:5]:  # Limit to first 5 errors
                        summary += f"     • {error}\n"
                    if len(errors) > 5:
                        summary += f"     • ... and {len(errors) - 5} more errors\n"
                    summary += "\n"

        if passed_configs > 0:
            summary += "Passed configurations:\n"
            for config_name, (is_valid, _) in results.items():
                if is_valid:
                    summary += f"  ✅ {config_name}\n"

        return summary

    def validate_configuration_compatibility(
        self, site_id: str
    ) -> Tuple[bool, List[str]]:
        """
        Validate that a site configuration is compatible with loaded templates.

        Args:
            site_id: Site identifier

        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []

        try:
            # Load configurations
            site_config_path = self.config_base_path / "sites" / site_id / "plant.yaml"
            site_config = self._load_yaml_file(site_config_path)

            templates_path = self.config_base_path / "templates" / "modules.yaml"
            module_templates = self._load_yaml_file(templates_path)

            params_path = self.config_base_path / "templates" / "parameters.yaml"
            param_specs = self._load_yaml_file(params_path)

            # Validate module references - handle numbered instances like ComponentFactory
            site_modules = site_config.get("modules", [])
            available_templates = set(
                module_templates.get("module_templates", {}).keys()
            )

            for module in site_modules:
                # Strip numeric suffix to get base module name (same logic as ComponentFactory)
                base_module = module.rstrip("_0123456789")
                if base_module not in available_templates:
                    errors.append(
                        f"Site references undefined module template: '{base_module}' (from instance '{module}')"
                    )

            # Validate parameter references in module templates
            available_params = set(
                param_specs.get("parameter_specifications", {}).keys()
            )

            for template_name, template in module_templates.get(
                "module_templates", {}
            ).items():
                for sensor_list in [
                    "required_sensors",
                    "optional_sensors",
                    "actuators",
                ]:
                    for param in template.get(sensor_list, []):
                        if param not in available_params:
                            errors.append(
                                f"Module template '{template_name}' references undefined parameter: '{param}'"
                            )

            if errors:
                return False, errors

            logger.info(f"Configuration compatibility validation passed for {site_id}")
            return True, []

        except ConfigurationValidationError as e:
            return False, [str(e)] + e.errors


def validate_configurations_cli(
    config_path: str = None, site_ids: List[str] = None
) -> int:
    """
    CLI entry point for configuration validation.

    Args:
        config_path: Path to configuration directory
        site_ids: List of site IDs to validate

    Returns:
        Exit code (0 for success, 1 for failure)
    """
    try:
        validator = ConfigValidator(config_path)
        results = validator.validate_all_configurations(site_ids)

        summary = validator.get_validation_summary(results)
        print(summary)

        # Check if all validations passed
        all_passed = all(is_valid for is_valid, _ in results.values())

        if all_passed:
            print("✅ All configuration validations passed!")
            return 0
        else:
            print("❌ Some configuration validations failed!")
            return 1

    except Exception as e:
        print(f"❌ Configuration validation error: {e}")
        return 1


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Validate Hydros configuration files")
    parser.add_argument("--config-path", help="Path to configuration directory")
    parser.add_argument("--site-ids", nargs="*", help="Site IDs to validate")

    args = parser.parse_args()

    exit_code = validate_configurations_cli(args.config_path, args.site_ids)
    sys.exit(exit_code)
