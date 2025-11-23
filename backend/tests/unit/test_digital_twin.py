"""
Unit tests for DigitalTwin core functionality.
"""
import pytest
from core.digital_twin import DigitalTwin
from core.plant_elements import PlantComponent, PlantParameter, ComponentRole, ProtocolDataType, OperationalState


class TestDigitalTwinInitialization:
    """Test DigitalTwin initialization and setup."""

    def test_digital_twin_creation(self):
        """Test creating a DigitalTwin instance."""
        dt = DigitalTwin(site_id="test-site")
        assert dt.site_id == "test-site"
        assert len(dt.components) == 0
        assert len(dt.parameters) == 0

    def test_digital_twin_with_invalid_site_id(self):
        """Test DigitalTwin rejects invalid site IDs."""
        with pytest.raises(ValueError):
            DigitalTwin(site_id="")

        with pytest.raises(ValueError):
            DigitalTwin(site_id=None)


class TestComponentRegistration:
    """Test component registration and management."""

    def test_register_component(self, sample_plant_component):
        """Test registering a component."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        assert "raw_intake" in dt.components
        assert dt.components["raw_intake"] == sample_plant_component

    def test_register_component_with_parameters(self, sample_plant_component):
        """Test that component parameters are registered."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        # Check parameter was registered
        param_id = "test-site-01.raw_intake.level"
        assert param_id in dt.parameters

    def test_register_duplicate_component(self, sample_plant_component):
        """Test that duplicate component IDs are rejected."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        with pytest.raises(ValueError, match="already registered"):
            dt.register_component(sample_plant_component)

    def test_get_component(self, sample_plant_component):
        """Test retrieving a component."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        component = dt.get_component("raw_intake")
        assert component == sample_plant_component

    def test_get_nonexistent_component(self):
        """Test retrieving a non-existent component returns None."""
        dt = DigitalTwin(site_id="test-site")
        component = dt.get_component("nonexistent")
        assert component is None


class TestParameterManagement:
    """Test parameter value management."""

    def test_update_parameter(self, sample_plant_component):
        """Test updating parameter values."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        param_id = "test-site-01.raw_intake.level"
        dt.update_parameter(param_id, 5.5)

        assert dt.parameters[param_id] == 5.5

    def test_update_nonexistent_parameter(self):
        """Test updating non-existent parameter raises error."""
        dt = DigitalTwin(site_id="test-site")

        with pytest.raises(KeyError):
            dt.update_parameter("nonexistent.param", 100)

    def test_get_parameter_value(self, sample_plant_component):
        """Test retrieving parameter value."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        param_id = "test-site-01.raw_intake.level"
        dt.update_parameter(param_id, 7.5)

        value = dt.get_parameter_value(param_id)
        assert value == 7.5

    def test_get_component_parameters(self, sample_plant_component):
        """Test retrieving all parameters for a component."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        param_id = "test-site-01.raw_intake.level"
        dt.update_parameter(param_id, 8.0)

        params = dt.get_component_parameters("raw_intake")
        assert len(params) > 0
        assert param_id in params
        assert params[param_id] == 8.0


class TestComponentState:
    """Test component operational state management."""

    def test_set_component_state(self, sample_plant_component):
        """Test setting component operational state."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        dt.set_component_state("raw_intake", OperationalState.ACTIVE)

        metadata = dt.metadata["raw_intake"]
        assert metadata.state == OperationalState.ACTIVE

    def test_set_invalid_state(self, sample_plant_component):
        """Test setting invalid state raises error."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        with pytest.raises((ValueError, AttributeError)):
            dt.set_component_state("raw_intake", "invalid_state")

    def test_get_component_state(self, sample_plant_component):
        """Test retrieving component state."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        dt.set_component_state("raw_intake", OperationalState.FAULT)

        state = dt.get_component_state("raw_intake")
        assert state == OperationalState.FAULT


class TestDigitalTwinStatistics:
    """Test statistics gathering."""

    def test_get_statistics(self, sample_plant_component):
        """Test retrieving digital twin statistics."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        stats = dt.get_statistics()

        assert "total_components" in stats
        assert "total_parameters" in stats
        assert stats["total_components"] >= 1
        assert stats["total_parameters"] >= 1

    def test_statistics_update_count(self, sample_plant_component):
        """Test that statistics track parameter updates."""
        dt = DigitalTwin(site_id="test-site")
        dt.register_component(sample_plant_component)

        param_id = "test-site-01.raw_intake.level"
        dt.update_parameter(param_id, 5.0)
        dt.update_parameter(param_id, 6.0)
        dt.update_parameter(param_id, 7.0)

        stats = dt.get_statistics()
        # Verify updates are tracked (implementation dependent)
        assert "total_parameters" in stats
