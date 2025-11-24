"""
Centralized configuration service to eliminate duplication.

This service provides a single source of truth for loading, validating,
and caching configuration files across the Hydros system.
"""
import yaml
import os
from pathlib import Path
from typing import Dict, Any, Optional
import logging
from functools import lru_cache


logger = logging.getLogger(__name__)


class ConfigurationService:
    """
    Centralized service for all configuration operations.

    Eliminates duplication across DigitalTwin, ComponentFactory, and ProtocolMapper
    by providing a single, cached, validated configuration loading mechanism.
    """

    def __init__(self, config_base_path: Optional[Path] = None):
        """
        Initialize the configuration service.

        Args:
            config_base_path: Base path for configuration files.
                            Defaults to backend/config
        """
        if config_base_path is None:
            # Default to backend/config directory
            current_dir = Path(__file__).parent.parent
            config_base_path = current_dir / "config"

        self.config_base_path = Path(config_base_path)
        self.cache: Dict[str, Any] = {}

        logger.info(f"ConfigurationService initialized with base path: {self.config_base_path}")

    def _load_yaml_file(self, file_path: Path) -> Dict[str, Any]:
        """
        Load a YAML file with error handling.

        Args:
            file_path: Path to the YAML file

        Returns:
            Parsed YAML content as dictionary

        Raises:
            FileNotFoundError: If file doesn't exist
            yaml.YAMLError: If YAML parsing fails
        """
        if not file_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {file_path}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = yaml.safe_load(f)

            if content is None:
                logger.warning(f"Empty YAML file: {file_path}")
                return {}

            return content

        except yaml.YAMLError as e:
            logger.error(f"YAML parsing error in {file_path}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error loading {file_path}: {e}")
            raise

    def get_site_config_path(self, site_id: str) -> Path:
        """
        Get the path to a site's configuration file.

        Args:
            site_id: Site identifier (e.g., 'wtp-porto-01')

        Returns:
            Path to site configuration file
        """
        return self.config_base_path / "sites" / site_id / "plant.yaml"

    def get_templates_path(self) -> Path:
        """Get the path to module templates file."""
        return self.config_base_path / "templates" / "modules.yaml"

    def get_parameter_specs_path(self) -> Path:
        """Get the path to parameter specifications file."""
        return self.config_base_path / "templates" / "parameters.yaml"

    def load_site_configuration(self, site_id: str, use_cache: bool = True) -> Dict[str, Any]:
        """
        Load site configuration with caching.

        Args:
            site_id: Site identifier
            use_cache: Whether to use cached configuration

        Returns:
            Site configuration dictionary

        Raises:
            FileNotFoundError: If site configuration not found
            yaml.YAMLError: If configuration is invalid
        """
        cache_key = f"site_{site_id}"

        if use_cache and cache_key in self.cache:
            logger.debug(f"Using cached configuration for site: {site_id}")
            return self.cache[cache_key]

        config_path = self.get_site_config_path(site_id)
        logger.info(f"Loading site configuration from: {config_path}")

        config = self._load_yaml_file(config_path)

        # Validate required fields
        if "site_info" not in config:
            raise ValueError(f"Missing required 'site_info' in site configuration: {site_id}")

        if config["site_info"].get("site_id") != site_id:
            logger.warning(
                f"Site ID mismatch: config has '{config['site_info'].get('site_id')}', "
                f"expected '{site_id}'"
            )

        # Cache the configuration
        self.cache[cache_key] = config
        logger.debug(f"Cached configuration for site: {site_id}")

        return config

    def load_module_templates(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        Load module templates with caching.

        Args:
            use_cache: Whether to use cached templates

        Returns:
            Module templates dictionary

        Raises:
            FileNotFoundError: If templates file not found
            yaml.YAMLError: If templates are invalid
        """
        cache_key = "module_templates"

        if use_cache and cache_key in self.cache:
            logger.debug("Using cached module templates")
            return self.cache[cache_key]

        templates_path = self.get_templates_path()
        logger.info(f"Loading module templates from: {templates_path}")

        templates = self._load_yaml_file(templates_path)

        # Validate structure
        if "module_templates" not in templates:
            raise ValueError("Missing required 'module_templates' key in templates file")

        # Cache the templates
        self.cache[cache_key] = templates
        logger.debug("Cached module templates")

        return templates

    def load_parameter_specifications(self, use_cache: bool = True) -> Dict[str, Any]:
        """
        Load parameter specifications with caching.

        Args:
            use_cache: Whether to use cached specifications

        Returns:
            Parameter specifications dictionary

        Raises:
            FileNotFoundError: If specifications file not found
            yaml.YAMLError: If specifications are invalid
        """
        cache_key = "parameter_specs"

        if use_cache and cache_key in self.cache:
            logger.debug("Using cached parameter specifications")
            return self.cache[cache_key]

        specs_path = self.get_parameter_specs_path()
        logger.info(f"Loading parameter specifications from: {specs_path}")

        specs = self._load_yaml_file(specs_path)

        # Validate structure
        if "parameter_specifications" not in specs:
            raise ValueError("Missing required 'parameter_specifications' key in specs file")

        # Cache the specifications
        self.cache[cache_key] = specs
        logger.debug("Cached parameter specifications")

        return specs

    def get_available_sites(self) -> list[str]:
        """
        Get list of available site IDs.

        Returns:
            List of site IDs that have configuration files
        """
        sites_dir = self.config_base_path / "sites"

        if not sites_dir.exists():
            logger.warning(f"Sites directory not found: {sites_dir}")
            return []

        sites = []
        for site_dir in sites_dir.iterdir():
            if site_dir.is_dir():
                config_file = site_dir / "plant.yaml"
                if config_file.exists():
                    sites.append(site_dir.name)

        logger.debug(f"Found {len(sites)} available sites")
        return sorted(sites)

    def clear_cache(self, site_id: Optional[str] = None):
        """
        Clear cached configurations.

        Args:
            site_id: If provided, only clear cache for this site.
                    If None, clear all caches.
        """
        if site_id:
            cache_key = f"site_{site_id}"
            if cache_key in self.cache:
                del self.cache[cache_key]
                logger.info(f"Cleared cache for site: {site_id}")
        else:
            self.cache.clear()
            logger.info("Cleared all configuration caches")

    def reload_site_configuration(self, site_id: str) -> Dict[str, Any]:
        """
        Force reload of site configuration (bypass cache).

        Args:
            site_id: Site identifier

        Returns:
            Reloaded site configuration
        """
        logger.info(f"Force reloading configuration for site: {site_id}")
        self.clear_cache(site_id)
        return self.load_site_configuration(site_id, use_cache=False)

    def validate_site_configuration(self, site_id: str) -> bool:
        """
        Validate a site configuration without caching.

        Args:
            site_id: Site identifier

        Returns:
            True if configuration is valid

        Raises:
            Various exceptions if configuration is invalid
        """
        try:
            config = self.load_site_configuration(site_id, use_cache=False)

            # Basic validation
            required_keys = ["site_info", "modules"]
            for key in required_keys:
                if key not in config:
                    raise ValueError(f"Missing required key: {key}")

            # Validate site_info structure
            site_info = config["site_info"]
            required_site_info_keys = ["site_id", "name"]
            for key in required_site_info_keys:
                if key not in site_info:
                    raise ValueError(f"Missing required site_info key: {key}")

            logger.info(f"Configuration validation successful for site: {site_id}")
            return True

        except Exception as e:
            logger.error(f"Configuration validation failed for site {site_id}: {e}")
            raise

    def save_site_configuration(self, site_id: str, config: Dict[str, Any]):
        """
        Save site configuration to file.

        Args:
            site_id: Site identifier
            config: Configuration dictionary to save

        Raises:
            ValueError: If configuration is invalid
            IOError: If file cannot be written
        """
        # Validate before saving
        if "site_info" not in config:
            raise ValueError("Configuration must contain 'site_info'")

        config_path = self.get_site_config_path(site_id)
        config_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            with open(config_path, 'w', encoding='utf-8') as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)

            logger.info(f"Saved configuration for site: {site_id}")

            # Clear cache to force reload on next access
            self.clear_cache(site_id)

        except Exception as e:
            logger.error(f"Failed to save configuration for site {site_id}: {e}")
            raise


# Global singleton instance
_config_service: Optional[ConfigurationService] = None


def get_configuration_service(config_base_path: Optional[Path] = None) -> ConfigurationService:
    """
    Get the global ConfigurationService instance (singleton pattern).

    Args:
        config_base_path: Base path for configuration files.
                         Only used on first call.

    Returns:
        ConfigurationService instance
    """
    global _config_service

    if _config_service is None:
        _config_service = ConfigurationService(config_base_path)

    return _config_service
