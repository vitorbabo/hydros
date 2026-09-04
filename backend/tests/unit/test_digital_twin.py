"""
Unit tests for DigitalTwin.

DigitalTwin holds arbitrary component objects keyed by id, alongside
ComponentInfo metadata and a flat "<component_id>.<param>" parameter map.
Components are duck-typed: anything exposing get_parameters()/update()/
set_parameter() participates in the update cycle.
"""
import pytest

from core.digital_twin import ComponentInfo, DigitalTwin, OperationalState


class FakeComponent:
    """Minimal stand-in for a simulation component."""

    def __init__(self, parameters=None, raises=False):
        self._parameters = dict(parameters or {})
        self._raises = raises
        self.update_count = 0

    def get_parameters(self):
        return dict(self._parameters)

    def update(self):
        if self._raises:
            raise RuntimeError("component failure")
        self.update_count += 1

    def set_parameter(self, name, value):
        if name not in self._parameters:
            return False
        self._parameters[name] = value
        return True


def make_info(
    component_id="raw_intake",
    module_id="intake",
    state=OperationalState.ACTIVE,
    component_type="intake",
):
    return ComponentInfo(
        component_id=component_id,
        component_type=component_type,
        module_id=module_id,
        state=state,
    )


@pytest.fixture
def twin():
    return DigitalTwin()


class TestComponentRegistration:
    def test_register_component_records_metadata_and_stats(self, twin):
        twin.register_component("raw_intake", FakeComponent(), make_info())

        assert twin.components["raw_intake"] is not None
        assert twin.metadata["raw_intake"].component_type == "intake"
        assert twin.stats["total_components"] == 1
        assert twin.stats["active_components"] == 1

    def test_register_seeds_parameters_from_component(self, twin):
        twin.register_component(
            "raw_intake", FakeComponent({"level": 5.5, "flow_rate": 30.0}), make_info()
        )

        assert twin.get_parameter_value("raw_intake.level") == 5.5
        assert twin.get_parameter_value("raw_intake.flow_rate") == 30.0

    def test_inactive_component_does_not_count_as_active(self, twin):
        twin.register_component(
            "raw_intake", FakeComponent(), make_info(state=OperationalState.INACTIVE)
        )

        assert twin.stats["total_components"] == 1
        assert twin.stats["active_components"] == 0

    def test_unregister_removes_component_and_its_parameters(self, twin):
        twin.register_component("raw_intake", FakeComponent({"level": 5.5}), make_info())

        twin.unregister_component("raw_intake")

        assert "raw_intake" not in twin.components
        assert twin.get_parameter_value("raw_intake.level") is None


class TestParameterManagement:
    def test_set_parameter_value_delegates_to_component(self, twin):
        component = FakeComponent({"level": 5.5})
        twin.register_component("raw_intake", component, make_info())

        assert twin.set_parameter_value("raw_intake.level", 7.5) is True
        assert twin.get_parameter_value("raw_intake.level") == 7.5
        assert component.get_parameters()["level"] == 7.5

    def test_set_parameter_value_rejects_unqualified_id(self, twin):
        assert twin.set_parameter_value("level", 1.0) is False

    def test_set_parameter_value_rejects_unknown_component(self, twin):
        assert twin.set_parameter_value("nope.level", 1.0) is False

    def test_get_component_parameters_scopes_by_prefix(self, twin):
        twin.register_component(
            "raw_intake", FakeComponent({"level": 5.5, "ph": 7.2}), make_info()
        )
        twin.register_component(
            "clearwell", FakeComponent({"level": 2.0}), make_info("clearwell", "storage", component_type="storage")
        )

        params = twin.get_component_parameters("raw_intake")

        assert params == {"raw_intake.level": 5.5, "raw_intake.ph": 7.2}

    def test_get_all_parameters_returns_a_copy(self, twin):
        twin.register_component("raw_intake", FakeComponent({"level": 5.5}), make_info())

        twin.get_all_parameters()["raw_intake.level"] = 999

        assert twin.get_parameter_value("raw_intake.level") == 5.5


class TestComponentState:
    def test_update_component_state_adjusts_active_count(self, twin):
        twin.register_component("raw_intake", FakeComponent(), make_info())

        twin.update_component_state("raw_intake", OperationalState.FAULT)

        assert twin.metadata["raw_intake"].state == OperationalState.FAULT
        assert twin.stats["active_components"] == 0

    def test_reactivating_restores_active_count(self, twin):
        twin.register_component(
            "raw_intake", FakeComponent(), make_info(state=OperationalState.INACTIVE)
        )

        twin.update_component_state("raw_intake", OperationalState.ACTIVE)

        assert twin.stats["active_components"] == 1

    def test_update_state_of_unknown_component_is_a_noop(self, twin):
        twin.update_component_state("ghost", OperationalState.FAULT)

        assert "ghost" not in twin.metadata


class TestUpdateCycle:
    def test_update_all_components_reports_changed_parameters(self, twin):
        component = FakeComponent({"level": 5.5})
        twin.register_component("raw_intake", component, make_info())

        component._parameters["level"] = 6.0
        changed = twin.update_all_components()

        assert changed == {"raw_intake.level": 6.0}
        assert twin.stats["update_count"] == 1

    def test_update_all_components_skips_inactive(self, twin):
        component = FakeComponent({"level": 5.5})
        twin.register_component(
            "raw_intake", component, make_info(state=OperationalState.INACTIVE)
        )

        twin.update_all_components()

        assert component.update_count == 0

    def test_failing_component_is_marked_faulted(self, twin):
        twin.register_component("raw_intake", FakeComponent(raises=True), make_info())

        twin.update_all_components()

        assert twin.metadata["raw_intake"].state == OperationalState.FAULT


class TestDigitalTwinStatistics:
    def test_statistics_include_state_breakdown(self, twin):
        twin.register_component("raw_intake", FakeComponent(), make_info())
        twin.register_component(
            "clearwell",
            FakeComponent(),
            make_info("clearwell", "storage", OperationalState.FAULT, "storage"),
        )

        stats = twin.get_plant_statistics()

        assert stats["total_components"] == 2
        assert stats["component_states"] == {"active": 1, "fault": 1}

    def test_export_state_round_trips_through_import(self, twin):
        twin.register_component("raw_intake", FakeComponent({"level": 5.5}), make_info())
        exported = twin.export_current_state()

        twin.set_parameter_value("raw_intake.level", 1.0)
        twin.import_state(exported)

        assert twin.get_parameter_value("raw_intake.level") == 5.5


class TestComponentLookup:
    def test_get_components_by_type(self, twin):
        twin.register_component("raw_intake", FakeComponent(), make_info())
        twin.register_component(
            "clearwell", FakeComponent(), make_info("clearwell", "storage", component_type="storage")
        )

        assert list(twin.get_components_by_type("intake")) == ["raw_intake"]

    def test_get_components_by_module(self, twin):
        twin.register_component("raw_intake", FakeComponent(), make_info())
        twin.register_component(
            "clearwell", FakeComponent(), make_info("clearwell", "storage", component_type="storage")
        )

        assert list(twin.get_components_by_module("storage")) == ["clearwell"]
