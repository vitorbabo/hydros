"""
Unit tests for ConfigValidator.

ConfigValidator is path-based: it loads JSON schemas from <base>/schemas and
validates YAML files it locates itself. Tests therefore build a temporary
config tree (using the repo's real schemas) rather than passing dicts in.
"""
import json
import shutil
from pathlib import Path

import pytest
import yaml

from core.config_validator import ConfigurationValidationError, ConfigValidator

REPO_CONFIG = Path(__file__).resolve().parents[2] / "config"


@pytest.fixture
def config_tree(tmp_path):
    """A temp config base seeded with the repo's real JSON schemas."""
    base = tmp_path / "config"
    (base / "schemas").mkdir(parents=True)
    (base / "sites").mkdir()
    (base / "templates").mkdir()

    for schema in (REPO_CONFIG / "schemas").glob("*.json"):
        shutil.copy(schema, base / "schemas" / schema.name)

    return base


def write_site(base: Path, site_id: str, data: dict) -> Path:
    site_dir = base / "sites" / site_id
    site_dir.mkdir(parents=True, exist_ok=True)
    path = site_dir / "plant.yaml"
    path.write_text(yaml.dump(data, default_flow_style=False))
    return path


class TestSchemaLoading:
    def test_loads_repo_schemas(self, config_tree):
        validator = ConfigValidator(str(config_tree))

        assert "site_config" in validator._validators
        assert "module_templates" in validator._validators

    def test_missing_schemas_are_tolerated(self, tmp_path):
        """A base path with no schemas loads, but reports schemas unavailable."""
        validator = ConfigValidator(str(tmp_path))

        is_valid, errors = validator.validate_module_templates()
        assert is_valid is False
        assert "schema not available" in errors[0]

    def test_malformed_schema_raises(self, config_tree):
        (config_tree / "schemas" / "site_config_schema.json").write_text("{not json")

        with pytest.raises(ConfigurationValidationError):
            ConfigValidator(str(config_tree))


class TestSiteConfigValidation:
    def test_valid_site_config_passes(self, config_tree, sample_site_config):
        write_site(config_tree, "test-site-01", sample_site_config)
        validator = ConfigValidator(str(config_tree))

        is_valid, errors = validator.validate_site_config("test-site-01")

        assert is_valid is True, errors
        assert errors == []

    def test_missing_required_field_is_reported(self, config_tree, sample_site_config):
        del sample_site_config["site_info"]["name"]
        write_site(config_tree, "test-site-01", sample_site_config)
        validator = ConfigValidator(str(config_tree))

        is_valid, errors = validator.validate_site_config("test-site-01")

        assert is_valid is False
        assert errors

    def test_wrong_data_type_is_reported(self, config_tree, sample_site_config):
        sample_site_config["site_info"]["design_capacity"] = "not_a_number"
        write_site(config_tree, "test-site-01", sample_site_config)
        validator = ConfigValidator(str(config_tree))

        is_valid, errors = validator.validate_site_config("test-site-01")

        assert is_valid is False
        assert errors

    def test_absent_site_file_is_reported(self, config_tree):
        validator = ConfigValidator(str(config_tree))

        is_valid, errors = validator.validate_site_config("no-such-site")

        assert is_valid is False
        assert errors


class TestModuleTemplateValidation:
    def test_valid_templates_pass(self, config_tree, sample_module_templates):
        (config_tree / "templates" / "modules.yaml").write_text(
            yaml.dump(sample_module_templates, default_flow_style=False)
        )
        validator = ConfigValidator(str(config_tree))

        is_valid, errors = validator.validate_module_templates()

        assert is_valid is True, errors

    def test_wrong_shape_is_reported(self, config_tree):
        (config_tree / "templates" / "modules.yaml").write_text(
            yaml.dump({"module_templates": ["not", "an", "object"]})
        )
        validator = ConfigValidator(str(config_tree))

        is_valid, errors = validator.validate_module_templates()

        assert is_valid is False
        assert errors


class TestValidationSummary:
    def test_summary_renders_both_outcomes(self, config_tree):
        validator = ConfigValidator(str(config_tree))

        summary = validator.get_validation_summary(
            {"site: a": (True, []), "site: b": (False, ["boom"])}
        )

        assert "site: a" in summary
        assert "site: b" in summary
        assert "boom" in summary
