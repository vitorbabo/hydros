"""
Unit tests for ModbusHandler.

ModbusHandler(mode, host, port) works in "client" or "server" mode and
addresses registers indirectly: callers name a parameter_id, and the loaded
ModbusMapping supplies address, register type, scaling and offset. Tests drive
a mock pymodbus client so scaling and register-type dispatch are exercised
without a live server.
"""
import json

import pytest

from protocols.modbus_handler import (
    ModbusHandler,
    ModbusMapping,
    ModbusRegisterType,
)


def holding(param_id="raw_intake.level", address=40001, **kwargs):
    return ModbusMapping(
        parameter_id=param_id,
        address=address,
        register_type=ModbusRegisterType.HOLDING_REGISTER,
        data_type=kwargs.pop("data_type", "uint16"),
        **kwargs,
    )


@pytest.fixture
def client_handler(mocker):
    """Client-mode handler with a connected mock pymodbus client."""
    handler = ModbusHandler(mode="client", host="localhost", port=5020)
    handler.client = mocker.MagicMock()
    handler.connected = True
    return handler


def ok_read(mocker, registers=None, bits=None):
    result = mocker.MagicMock()
    result.isError.return_value = False
    if registers is not None:
        result.registers = registers
    else:
        del result.registers
        result.bits = bits
    return result


def error_result(mocker):
    result = mocker.MagicMock()
    result.isError.return_value = True
    return result


class TestModbusHandlerInitialization:
    def test_client_mode_defaults(self):
        handler = ModbusHandler(mode="client", host="plc.local", port=502)

        assert handler.mode == "client"
        assert handler.host == "plc.local"
        assert handler.port == 502
        assert handler.device_id == 1
        assert handler.connected is False

    def test_mode_is_normalized_to_lowercase(self):
        assert ModbusHandler(mode="SERVER").mode == "server"

    def test_connect_is_client_only(self):
        assert ModbusHandler(mode="server").connect() is False


class TestMappingLoading:
    def test_load_mappings_from_objects(self):
        handler = ModbusHandler(mode="client")

        handler.load_mappings([holding()])

        assert handler.mappings["raw_intake.level"].address == 40001
        assert handler.address_to_param[40001] == "raw_intake.level"

    def test_load_mappings_from_dict(self):
        handler = ModbusHandler(mode="client")

        handler.load_mappings(
            {
                "raw_intake.level": {
                    "address": 30001,
                    "type": "input_register",
                    "data_type": "uint16",
                    "scale_factor": 10.0,
                    "unit": "m",
                }
            }
        )

        mapping = handler.mappings["raw_intake.level"]
        assert mapping.register_type is ModbusRegisterType.INPUT_REGISTER
        assert mapping.scale_factor == 10.0
        assert mapping.unit == "m"

    def test_load_mappings_from_file(self, tmp_path):
        path = tmp_path / "mappings.json"
        path.write_text(
            json.dumps(
                {"mappings": {"raw_intake.level": {"address": 40001, "type": "holding_register"}}}
            )
        )
        handler = ModbusHandler(mode="client")

        handler.load_mappings_from_file(str(path))

        assert "raw_intake.level" in handler.mappings

    def test_load_mappings_from_missing_file_raises(self, tmp_path):
        handler = ModbusHandler(mode="client")

        with pytest.raises(Exception):
            handler.load_mappings_from_file(str(tmp_path / "nope.json"))

    def test_get_parameter_mappings_round_trips(self):
        handler = ModbusHandler(mode="client")
        handler.load_mappings([holding(scale_factor=10.0, unit="m")])

        exported = handler.get_parameter_mappings()["raw_intake.level"]

        assert exported["address"] == 40001
        assert exported["type"] == "holding_register"
        assert exported["scale_factor"] == 10.0


class TestReadParameter:
    def test_read_holding_register_applies_scaling(self, client_handler, mocker):
        client_handler.load_mappings([holding(scale_factor=10.0)])
        client_handler.client.read_holding_registers.return_value = ok_read(
            mocker, registers=[55]
        )

        assert client_handler.read_parameter("raw_intake.level") == 5.5
        client_handler.client.read_holding_registers.assert_called_once_with(
            40001, 1, device_id=1
        )

    def test_read_input_register_dispatches_correctly(self, client_handler, mocker):
        client_handler.load_mappings(
            [
                ModbusMapping(
                    parameter_id="raw_intake.flow",
                    address=30001,
                    register_type=ModbusRegisterType.INPUT_REGISTER,
                )
            ]
        )
        client_handler.client.read_input_registers.return_value = ok_read(
            mocker, registers=[42]
        )

        assert client_handler.read_parameter("raw_intake.flow") == 42.0
        client_handler.client.read_input_registers.assert_called_once()

    def test_read_coil_returns_bool(self, client_handler, mocker):
        client_handler.load_mappings(
            [
                ModbusMapping(
                    parameter_id="pump.run",
                    address=1,
                    register_type=ModbusRegisterType.COIL,
                    data_type="bool",
                )
            ]
        )
        client_handler.client.read_coils.return_value = ok_read(mocker, bits=[True])

        assert client_handler.read_parameter("pump.run") is True

    def test_read_unmapped_parameter_returns_none(self, client_handler):
        assert client_handler.read_parameter("not.mapped") is None

    def test_read_while_disconnected_returns_none(self, client_handler):
        client_handler.load_mappings([holding()])
        client_handler.connected = False

        assert client_handler.read_parameter("raw_intake.level") is None

    def test_read_error_response_returns_none(self, client_handler, mocker):
        client_handler.load_mappings([holding()])
        client_handler.client.read_holding_registers.return_value = error_result(mocker)

        assert client_handler.read_parameter("raw_intake.level") is None

    def test_read_exception_is_contained(self, client_handler):
        client_handler.load_mappings([holding()])
        client_handler.client.read_holding_registers.side_effect = OSError("boom")

        assert client_handler.read_parameter("raw_intake.level") is None

    def test_read_parameters_skips_failures(self, client_handler, mocker):
        client_handler.load_mappings([holding()])
        client_handler.client.read_holding_registers.return_value = ok_read(
            mocker, registers=[10]
        )

        results = client_handler.read_parameters(["raw_intake.level", "not.mapped"])

        assert results == {"raw_intake.level": 10.0}


class TestWriteParameter:
    def test_write_holding_register_applies_scaling(self, client_handler, mocker):
        client_handler.load_mappings([holding(scale_factor=10.0)])
        client_handler.client.write_register.return_value = ok_read(mocker, registers=[])

        assert client_handler.write_parameter("raw_intake.level", 5.5) is True
        client_handler.client.write_register.assert_called_once_with(
            40001, 55, device_id=1
        )

    def test_write_clamps_to_register_range(self, client_handler, mocker):
        client_handler.load_mappings([holding()])
        client_handler.client.write_register.return_value = ok_read(mocker, registers=[])

        client_handler.write_parameter("raw_intake.level", 999_999)

        _, value = client_handler.client.write_register.call_args[0]
        assert value == 65535

    def test_write_to_read_only_register_type_is_refused(self, client_handler):
        client_handler.load_mappings(
            [
                ModbusMapping(
                    parameter_id="raw_intake.flow",
                    address=30001,
                    register_type=ModbusRegisterType.INPUT_REGISTER,
                )
            ]
        )

        assert client_handler.write_parameter("raw_intake.flow", 1.0) is False

    def test_write_unmapped_parameter_is_refused(self, client_handler):
        assert client_handler.write_parameter("not.mapped", 1.0) is False

    def test_write_while_disconnected_is_refused(self, client_handler):
        client_handler.load_mappings([holding()])
        client_handler.connected = False

        assert client_handler.write_parameter("raw_intake.level", 1.0) is False

    def test_write_error_response_returns_false(self, client_handler, mocker):
        client_handler.load_mappings([holding()])
        client_handler.client.write_register.return_value = error_result(mocker)

        assert client_handler.write_parameter("raw_intake.level", 1.0) is False

    def test_write_parameters_counts_successes(self, client_handler, mocker):
        client_handler.load_mappings([holding()])
        client_handler.client.write_register.return_value = ok_read(mocker, registers=[])

        count = client_handler.write_parameters(
            {"raw_intake.level": 1.0, "not.mapped": 2.0}
        )

        assert count == 1


class TestServerMode:
    def test_update_server_parameter_requires_context(self):
        handler = ModbusHandler(mode="server")
        handler.load_mappings([holding()])

        assert handler.update_server_parameter("raw_intake.level", 1.0) is False

    def test_client_mode_rejects_server_updates(self, client_handler):
        client_handler.load_mappings([holding()])

        assert client_handler.update_server_parameter("raw_intake.level", 1.0) is False


class TestDisconnectAndStatistics:
    def test_disconnect_closes_client(self, client_handler):
        client_handler.disconnect()

        client_handler.client.close.assert_called_once()
        assert client_handler.connected is False

    def test_disconnect_when_never_connected_is_safe(self):
        ModbusHandler(mode="client").disconnect()

    def test_statistics_report_mode_and_mapping_count(self, client_handler):
        client_handler.load_mappings([holding()])

        stats = client_handler.get_statistics()

        assert stats["mode"] == "client"
        assert stats["connected"] is True
        assert stats["mappings_count"] == 1
        assert stats["port"] == 5020
