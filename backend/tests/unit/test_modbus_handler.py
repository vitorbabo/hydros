"""
Unit tests for Modbus Handler.
"""
import pytest
from unittest.mock import MagicMock, patch


class TestModbusHandlerInitialization:
    """Test Modbus Handler initialization."""

    @patch('pymodbus.client.ModbusTcpClient')
    def test_modbus_handler_creation(self, mock_client_class):
        """Test creating a Modbus handler instance."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(
            host="192.168.1.100",
            port=502,
            unit_id=1
        )

        assert handler is not None
        assert handler.host == "192.168.1.100"
        assert handler.port == 502
        assert handler.unit_id == 1

    @patch('pymodbus.client.ModbusTcpClient')
    def test_modbus_handler_default_port(self, mock_client_class):
        """Test Modbus handler uses default port 502."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100")

        assert handler.port == 502  # Default Modbus port


class TestModbusConnection:
    """Test Modbus connection management."""

    @patch('pymodbus.client.ModbusTcpClient')
    def test_connect_success(self, mock_client_class):
        """Test successful Modbus connection."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_client.connect.return_value = True
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        result = handler.connect()

        assert result is True
        mock_client.connect.assert_called_once()

    @patch('pymodbus.client.ModbusTcpClient')
    def test_connect_failure(self, mock_client_class):
        """Test Modbus connection failure handling."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_client.connect.return_value = False
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)

        with pytest.raises(ConnectionError):
            handler.connect()

    @patch('pymodbus.client.ModbusTcpClient')
    def test_disconnect(self, mock_client_class):
        """Test Modbus disconnection."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.disconnect()

        mock_client.close.assert_called_once()


class TestModbusReading:
    """Test Modbus register reading."""

    @patch('pymodbus.client.ModbusTcpClient')
    def test_read_holding_register(self, mock_client_class):
        """Test reading holding registers."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = False
        mock_response.registers = [1234]
        mock_client.read_holding_registers.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        value = handler.read_holding_register(address=100, count=1)

        assert value == [1234]
        mock_client.read_holding_registers.assert_called_once_with(100, 1, unit=1)

    @patch('pymodbus.client.ModbusTcpClient')
    def test_read_input_register(self, mock_client_class):
        """Test reading input registers."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = False
        mock_response.registers = [5678]
        mock_client.read_input_registers.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        value = handler.read_input_register(address=200, count=1)

        assert value == [5678]
        mock_client.read_input_registers.assert_called_once_with(200, 1, unit=1)

    @patch('pymodbus.client.ModbusTcpClient')
    def test_read_register_error(self, mock_client_class):
        """Test error handling when reading registers."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = True
        mock_client.read_holding_registers.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        with pytest.raises(Exception):
            handler.read_holding_register(address=100, count=1)

    @patch('pymodbus.client.ModbusTcpClient')
    def test_read_multiple_registers(self, mock_client_class):
        """Test reading multiple registers at once."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = False
        mock_response.registers = [100, 200, 300, 400]
        mock_client.read_holding_registers.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        values = handler.read_holding_register(address=1000, count=4)

        assert len(values) == 4
        assert values == [100, 200, 300, 400]


class TestModbusWriting:
    """Test Modbus register writing."""

    @patch('pymodbus.client.ModbusTcpClient')
    def test_write_holding_register(self, mock_client_class):
        """Test writing to holding register."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = False
        mock_client.write_register.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        handler.write_holding_register(address=100, value=999)

        mock_client.write_register.assert_called_once_with(100, 999, unit=1)

    @patch('pymodbus.client.ModbusTcpClient')
    def test_write_multiple_registers(self, mock_client_class):
        """Test writing to multiple registers."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = False
        mock_client.write_registers.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        values = [100, 200, 300]
        handler.write_multiple_registers(address=1000, values=values)

        mock_client.write_registers.assert_called_once_with(1000, values, unit=1)

    @patch('pymodbus.client.ModbusTcpClient')
    def test_write_register_error(self, mock_client_class):
        """Test error handling when writing registers."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = True
        mock_client.write_register.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        with pytest.raises(Exception):
            handler.write_holding_register(address=100, value=999)


class TestModbusAddressConversion:
    """Test Modbus address conversion (tag to register)."""

    def test_convert_holding_register_address(self):
        """Test converting Modbus 4xxxx addresses."""
        from protocols.modbus_handler import ModbusHandler

        # Tag 40001 should map to register 0
        register_address = ModbusHandler.convert_tag_to_register(40001)
        assert register_address == 0

        # Tag 40100 should map to register 99
        register_address = ModbusHandler.convert_tag_to_register(40100)
        assert register_address == 99

    def test_convert_input_register_address(self):
        """Test converting Modbus 3xxxx addresses."""
        from protocols.modbus_handler import ModbusHandler

        # Tag 30001 should map to register 0
        register_address = ModbusHandler.convert_tag_to_register(30001)
        assert register_address == 0

    def test_invalid_address_conversion(self):
        """Test that invalid addresses raise errors."""
        from protocols.modbus_handler import ModbusHandler

        with pytest.raises(ValueError):
            ModbusHandler.convert_tag_to_register(99999)  # Invalid range


class TestModbusParameterMapping:
    """Test parameter ID to Modbus address mapping."""

    @patch('pymodbus.client.ModbusTcpClient')
    def test_read_parameter_with_mapping(self, mock_client_class):
        """Test reading a parameter using mapping."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = False
        mock_response.registers = [550]  # 5.5 * 100 (scaled)
        mock_client.read_holding_registers.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        # Setup mapping
        handler.mappings = {
            "site-01.tank.level": {
                "modbus_address": 40001,
                "data_type": "REAL",
                "scale_factor": 0.01  # Divide by 100
            }
        }

        value = handler.read_parameter("site-01.tank.level")

        # Should apply scale factor: 550 * 0.01 = 5.5
        assert value == 5.5

    @patch('pymodbus.client.ModbusTcpClient')
    def test_write_parameter_with_mapping(self, mock_client_class):
        """Test writing a parameter using mapping."""
        from protocols.modbus_handler import ModbusHandler

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.isError.return_value = False
        mock_client.write_register.return_value = mock_response
        mock_client_class.return_value = mock_client

        handler = ModbusHandler(host="192.168.1.100", port=502)
        handler.client = mock_client

        # Setup mapping
        handler.mappings = {
            "site-01.tank.setpoint": {
                "modbus_address": 40100,
                "data_type": "REAL",
                "scale_factor": 100.0  # Multiply by 100
            }
        }

        handler.write_parameter("site-01.tank.setpoint", 7.5)

        # Should apply scale factor: 7.5 * 100 = 750
        mock_client.write_register.assert_called_once_with(99, 750, unit=1)
