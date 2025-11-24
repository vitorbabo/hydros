"""
Unit tests for ConfigurationService.
"""
import pytest
from pathlib import Path
from services.configuration_service import ConfigurationService, get_configuration_service


class TestConfigurationServiceInitialization:
    """Test ConfigurationService initialization."""

    def test_service_creation(self, temp_config_dir):
        """Test creating a ConfigurationService instance."""
        service = ConfigurationService(temp_config_dir)
        assert service is not None
        assert service.config_base_path == temp_config_dir
        assert isinstance(service.cache, dict)
        assert len(service.cache) == 0

    def test_service_default_path(self):
        """Test service uses default path when none provided."""
        service = ConfigurationService()
        assert service.config_base_path is not None
        assert service.config_base_path.name == "config"


class TestSiteConfigurationLoading:
    """Test site configuration loading."""

    def test_load_site_configuration(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test loading a valid site configuration."""
        site_id = "test-site-01"
        write_yaml_config(f"{site_id}/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)
        config = service.load_site_configuration(site_id)

        assert config is not None
        assert "site_info" in config
        assert config["site_info"]["site_id"] == site_id

    def test_load_site_configuration_caching(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test that site configurations are cached."""
        site_id = "test-site-01"
        write_yaml_config(f"{site_id}/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)

        # First load
        config1 = service.load_site_configuration(site_id)

        # Second load should use cache
        config2 = service.load_site_configuration(site_id)

        # Should return same object from cache
        assert config1 is config2

    def test_load_site_configuration_bypass_cache(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test loading site configuration bypassing cache."""
        site_id = "test-site-01"
        write_yaml_config(f"{site_id}/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)

        # First load (cached)
        config1 = service.load_site_configuration(site_id)

        # Second load bypassing cache
        config2 = service.load_site_configuration(site_id, use_cache=False)

        # Should be different objects
        assert config1 is not config2
        # But same content
        assert config1 == config2

    def test_load_nonexistent_site(self, temp_config_dir):
        """Test loading configuration for non-existent site."""
        service = ConfigurationService(temp_config_dir)

        with pytest.raises(FileNotFoundError):
            service.load_site_configuration("nonexistent-site")

    def test_load_site_missing_site_info(
        self, temp_config_dir, write_yaml_config
    ):
        """Test loading site configuration missing required fields."""
        site_id = "test-site-01"
        invalid_config = {
            "modules": ["intake"],
            # Missing site_info
        }
        write_yaml_config(f"{site_id}/plant.yaml", invalid_config)

        service = ConfigurationService(temp_config_dir)

        with pytest.raises(ValueError, match="Missing required 'site_info'"):
            service.load_site_configuration(site_id)


class TestModuleTemplateLoading:
    """Test module template loading."""

    def test_load_module_templates(
        self, temp_config_dir, sample_module_templates, write_yaml_config
    ):
        """Test loading module templates."""
        write_yaml_config("modules.yaml", sample_module_templates, subdir="templates")

        service = ConfigurationService(temp_config_dir)
        templates = service.load_module_templates()

        assert templates is not None
        assert "module_templates" in templates
        assert "raw_intake" in templates["module_templates"]

    def test_load_module_templates_caching(
        self, temp_config_dir, sample_module_templates, write_yaml_config
    ):
        """Test that module templates are cached."""
        write_yaml_config("modules.yaml", sample_module_templates, subdir="templates")

        service = ConfigurationService(temp_config_dir)

        # First load
        templates1 = service.load_module_templates()

        # Second load should use cache
        templates2 = service.load_module_templates()

        # Should return same object from cache
        assert templates1 is templates2

    def test_load_nonexistent_templates(self, temp_config_dir):
        """Test loading non-existent templates file."""
        service = ConfigurationService(temp_config_dir)

        with pytest.raises(FileNotFoundError):
            service.load_module_templates()


class TestParameterSpecificationLoading:
    """Test parameter specification loading."""

    def test_load_parameter_specs(
        self, temp_config_dir, sample_parameter_specs, write_yaml_config
    ):
        """Test loading parameter specifications."""
        write_yaml_config("parameters.yaml", sample_parameter_specs, subdir="templates")

        service = ConfigurationService(temp_config_dir)
        specs = service.load_parameter_specifications()

        assert specs is not None
        assert "parameter_specifications" in specs
        assert "level" in specs["parameter_specifications"]

    def test_load_parameter_specs_caching(
        self, temp_config_dir, sample_parameter_specs, write_yaml_config
    ):
        """Test that parameter specifications are cached."""
        write_yaml_config("parameters.yaml", sample_parameter_specs, subdir="templates")

        service = ConfigurationService(temp_config_dir)

        # First load
        specs1 = service.load_parameter_specifications()

        # Second load should use cache
        specs2 = service.load_parameter_specifications()

        # Should return same object from cache
        assert specs1 is specs2


class TestCacheManagement:
    """Test cache management operations."""

    def test_clear_cache_all(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test clearing all caches."""
        site_id = "test-site-01"
        write_yaml_config(f"{site_id}/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)

        # Load to populate cache
        service.load_site_configuration(site_id)
        assert len(service.cache) > 0

        # Clear all caches
        service.clear_cache()
        assert len(service.cache) == 0

    def test_clear_cache_specific_site(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test clearing cache for specific site."""
        site_id = "test-site-01"
        write_yaml_config(f"{site_id}/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)

        # Load to populate cache
        service.load_site_configuration(site_id)
        cache_key = f"site_{site_id}"
        assert cache_key in service.cache

        # Clear specific site cache
        service.clear_cache(site_id)
        assert cache_key not in service.cache

    def test_reload_site_configuration(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test force reloading site configuration."""
        site_id = "test-site-01"
        write_yaml_config(f"{site_id}/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)

        # First load
        config1 = service.load_site_configuration(site_id)

        # Reload (should bypass cache)
        config2 = service.reload_site_configuration(site_id)

        # Should be different objects
        assert config1 is not config2


class TestSiteDiscovery:
    """Test site discovery functionality."""

    def test_get_available_sites(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test discovering available sites."""
        # Create multiple site configurations
        write_yaml_config("site-01/plant.yaml", sample_site_config)
        write_yaml_config("site-02/plant.yaml", sample_site_config)
        write_yaml_config("site-03/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)
        sites = service.get_available_sites()

        assert len(sites) == 3
        assert "site-01" in sites
        assert "site-02" in sites
        assert "site-03" in sites
        # Should be sorted
        assert sites == sorted(sites)

    def test_get_available_sites_empty(self, temp_config_dir):
        """Test discovering sites when none exist."""
        service = ConfigurationService(temp_config_dir)
        sites = service.get_available_sites()

        assert sites == []


class TestConfigurationValidation:
    """Test configuration validation."""

    def test_validate_site_configuration_valid(
        self, temp_config_dir, sample_site_config, write_yaml_config
    ):
        """Test validating a valid site configuration."""
        site_id = "test-site-01"
        write_yaml_config(f"{site_id}/plant.yaml", sample_site_config)

        service = ConfigurationService(temp_config_dir)
        result = service.validate_site_configuration(site_id)

        assert result is True

    def test_validate_site_configuration_missing_modules(
        self, temp_config_dir, write_yaml_config
    ):
        """Test validating configuration missing required fields."""
        site_id = "test-site-01"
        invalid_config = {
            "site_info": {
                "site_id": site_id,
                "name": "Test Site"
            }
            # Missing modules
        }
        write_yaml_config(f"{site_id}/plant.yaml", invalid_config)

        service = ConfigurationService(temp_config_dir)

        with pytest.raises(ValueError, match="Missing required key: modules"):
            service.validate_site_configuration(site_id)


class TestConfigurationSaving:
    """Test configuration saving."""

    def test_save_site_configuration(
        self, temp_config_dir, sample_site_config
    ):
        """Test saving a site configuration."""
        site_id = "new-site"
        service = ConfigurationService(temp_config_dir)

        # Save configuration
        service.save_site_configuration(site_id, sample_site_config)

        # Verify file was created
        config_path = service.get_site_config_path(site_id)
        assert config_path.exists()

        # Verify content can be loaded
        loaded_config = service.load_site_configuration(site_id)
        assert loaded_config["site_info"]["site_id"] == sample_site_config["site_info"]["site_id"]

    def test_save_invalid_configuration(self, temp_config_dir):
        """Test saving invalid configuration raises error."""
        site_id = "new-site"
        invalid_config = {
            "modules": ["intake"]
            # Missing site_info
        }

        service = ConfigurationService(temp_config_dir)

        with pytest.raises(ValueError, match="Configuration must contain 'site_info'"):
            service.save_site_configuration(site_id, invalid_config)


class TestSingletonPattern:
    """Test singleton pattern for global service instance."""

    def test_get_configuration_service_singleton(self, temp_config_dir):
        """Test that get_configuration_service returns singleton."""
        # Note: This test may be affected by other tests
        # In a real scenario, you'd reset the global variable between tests

        service1 = get_configuration_service(temp_config_dir)
        service2 = get_configuration_service()

        # Should return same instance
        assert service1 is service2


class TestPathGeneration:
    """Test configuration path generation."""

    def test_get_site_config_path(self, temp_config_dir):
        """Test generating site configuration path."""
        service = ConfigurationService(temp_config_dir)
        path = service.get_site_config_path("test-site")

        expected = temp_config_dir / "sites" / "test-site" / "plant.yaml"
        assert path == expected

    def test_get_templates_path(self, temp_config_dir):
        """Test generating templates path."""
        service = ConfigurationService(temp_config_dir)
        path = service.get_templates_path()

        expected = temp_config_dir / "templates" / "modules.yaml"
        assert path == expected

    def test_get_parameter_specs_path(self, temp_config_dir):
        """Test generating parameter specifications path."""
        service = ConfigurationService(temp_config_dir)
        path = service.get_parameter_specs_path()

        expected = temp_config_dir / "templates" / "parameters.yaml"
        assert path == expected
