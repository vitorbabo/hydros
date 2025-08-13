"""
Industrial PLC Readers Implementation

This module contains production-ready implementations of various PLC protocol readers
for connecting to real industrial equipment or simulated protocol servers.
"""

import logging
import time
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass
from enum import Enum

# Protocol-specific imports
try:
    from pymodbus.client import ModbusTcpClient
    from pymodbus.client import ModbusSerialClient  
    from pymodbus.exceptions import ModbusException
    MODBUS_AVAILABLE = True
except ImportError:
    try:
        # Fallback for older pymodbus versions
        from pymodbus.client.sync import ModbusTcpClient
        from pymodbus.client.sync import ModbusSerialClient
        from pymodbus.exceptions import ModbusException
        MODBUS_AVAILABLE = True
    except ImportError:
        MODBUS_AVAILABLE = False

try:
    from opcua import Client as OPCUAClient
    from opcua.ua.uaerrors import UaError
    OPCUA_AVAILABLE = True
except ImportError:
    OPCUA_AVAILABLE = False

try:
    import snap7
    from snap7.util import get_real, get_int, get_bool
    S7_AVAILABLE = True
except ImportError:
    S7_AVAILABLE = False

from data_mapper import PLCDataReader, PLCConnection, DataQuality


class ModbusTcpReader(PLCDataReader):
    """Production Modbus TCP client implementation"""
    
    def __init__(self, connection: PLCConnection):
        super().__init__(connection)
        self.client = None
        self.logger = logging.getLogger(__name__)
        
        if not MODBUS_AVAILABLE:
            raise ImportError("pymodbus is required. Install with: pip install pymodbus")
    
    def connect(self) -> bool:
        """Connect to Modbus TCP server"""
        try:
            self.client = ModbusTcpClient(
                host=self.connection.ip_address,
                port=self.connection.port,
                timeout=self.connection.timeout_ms / 1000.0,
                retry_on_empty=True,
                retry_on_invalid=True,
                retries=self.connection.retry_attempts
            )
            
            # Test connection
            connection_result = self.client.connect()
            if connection_result:
                self.is_connected = True
                self.logger.info(f"Connected to Modbus TCP at {self.connection.ip_address}:{self.connection.port}")
                return True
            else:
                self.last_error = "Failed to establish Modbus connection"
                return False
                
        except Exception as e:
            self.last_error = str(e)
            self.logger.error(f"Modbus connection failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from Modbus server"""
        if self.client:
            self.client.close()
            self.is_connected = False
            self.logger.info("Disconnected from Modbus TCP server")
    
    def _parse_modbus_address(self, address: str) -> Tuple[str, int]:
        """Parse Modbus address format (e.g., '40001' -> ('hr', 0))"""
        try:
            addr_int = int(address)
            
            if 1 <= addr_int <= 9999:  # Coils (0x)
                return 'coils', addr_int - 1
            elif 10001 <= addr_int <= 19999:  # Discrete Inputs (1x)
                return 'discrete_inputs', addr_int - 10001
            elif 30001 <= addr_int <= 39999:  # Input Registers (3x)
                return 'input_registers', addr_int - 30001
            elif 40001 <= addr_int <= 49999:  # Holding Registers (4x)
                return 'holding_registers', addr_int - 40001
            else:
                raise ValueError(f"Invalid Modbus address: {address}")
                
        except ValueError as e:
            raise ValueError(f"Cannot parse Modbus address '{address}': {e}")
    
    def read_tag(self, tag_address: str, data_type: str) -> Tuple[Any, DataQuality]:
        """Read single Modbus register"""
        if not self.is_connected or not self.client:
            return None, DataQuality.COMM_ERROR
        
        try:
            register_type, address = self._parse_modbus_address(tag_address)
            
            # Read based on register type
            if register_type == 'coils':
                result = self.client.read_coils(address, 1, unit=self.connection.unit_id)
            elif register_type == 'discrete_inputs':
                result = self.client.read_discrete_inputs(address, 1, unit=self.connection.unit_id)
            elif register_type == 'input_registers':
                result = self.client.read_input_registers(address, 1, unit=self.connection.unit_id)
            elif register_type == 'holding_registers':
                result = self.client.read_holding_registers(address, 1, unit=self.connection.unit_id)
            else:
                return None, DataQuality.BAD
            
            # Check for errors
            if result.isError():
                self.logger.warning(f"Modbus read error for {tag_address}: {result}")
                return None, DataQuality.COMM_ERROR
            
            # Extract value
            if register_type in ['coils', 'discrete_inputs']:
                value = bool(result.bits[0])
            else:
                raw_value = result.registers[0]
                
                # Convert based on data type
                if data_type.upper() == 'INT16':
                    # Handle signed 16-bit integer
                    value = raw_value if raw_value < 32768 else raw_value - 65536
                elif data_type.upper() == 'UINT16':
                    value = raw_value
                elif data_type.upper() == 'REAL':
                    # Assume scaled integer (divide by 100 for 2 decimal places)
                    signed_val = raw_value if raw_value < 32768 else raw_value - 65536
                    value = float(signed_val) / 100.0
                else:
                    value = raw_value
            
            return value, DataQuality.GOOD
            
        except ModbusException as e:
            self.logger.error(f"Modbus exception reading {tag_address}: {e}")
            return None, DataQuality.COMM_ERROR
        except Exception as e:
            self.logger.error(f"Unexpected error reading {tag_address}: {e}")
            return None, DataQuality.BAD
    
    def read_tags(self, tags: List[str]) -> Dict[str, Tuple[Any, DataQuality]]:
        """Read multiple Modbus tags"""
        results = {}
        
        # Group tags by register type for efficient batch reading
        # For simplicity, read individually for now
        for tag in tags:
            results[tag] = self.read_tag(tag, "REAL")  # Default to REAL
        
        return results


class OPCUAReader(PLCDataReader):
    """Production OPC UA client implementation"""
    
    def __init__(self, connection: PLCConnection):
        super().__init__(connection)
        self.client = None
        self.logger = logging.getLogger(__name__)
        
        if not OPCUA_AVAILABLE:
            raise ImportError("opcua library is required. Install with: pip install opcua")
    
    def connect(self) -> bool:
        """Connect to OPC UA server"""
        try:
            endpoint = f"opc.tcp://{self.connection.ip_address}:{self.connection.port}"
            if hasattr(self.connection, 'endpoint_url') and self.connection.endpoint_url:
                endpoint = self.connection.endpoint_url
            
            self.client = OPCUAClient(endpoint)
            
            # Set timeout
            self.client.set_timeout(self.connection.timeout_ms / 1000.0)
            
            # Connect
            self.client.connect()
            self.is_connected = True
            self.logger.info(f"Connected to OPC UA server at {endpoint}")
            return True
            
        except UaError as e:
            self.last_error = f"OPC UA error: {e}"
            self.logger.error(f"OPC UA connection failed: {e}")
            return False
        except Exception as e:
            self.last_error = str(e)
            self.logger.error(f"Unexpected OPC UA connection error: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from OPC UA server"""
        if self.client:
            try:
                self.client.disconnect()
                self.is_connected = False
                self.logger.info("Disconnected from OPC UA server")
            except Exception as e:
                self.logger.warning(f"Error during OPC UA disconnect: {e}")
    
    def read_tag(self, tag_address: str, data_type: str) -> Tuple[Any, DataQuality]:
        """Read single OPC UA node"""
        if not self.is_connected or not self.client:
            return None, DataQuality.COMM_ERROR
        
        try:
            # Get node by identifier
            node = self.client.get_node(tag_address)
            
            # Read value
            value = node.get_value()
            
            # Check if value is valid
            if value is None:
                return None, DataQuality.BAD
            
            return value, DataQuality.GOOD
            
        except UaError as e:
            self.logger.warning(f"OPC UA read error for {tag_address}: {e}")
            return None, DataQuality.COMM_ERROR
        except Exception as e:
            self.logger.error(f"Unexpected error reading OPC UA node {tag_address}: {e}")
            return None, DataQuality.BAD
    
    def read_tags(self, tags: List[str]) -> Dict[str, Tuple[Any, DataQuality]]:
        """Read multiple OPC UA nodes"""
        results = {}
        
        if not self.is_connected or not self.client:
            return {tag: (None, DataQuality.COMM_ERROR) for tag in tags}
        
        try:
            # Get all nodes
            nodes = []
            tag_to_node = {}
            
            for tag in tags:
                try:
                    node = self.client.get_node(tag)
                    nodes.append(node)
                    tag_to_node[tag] = node
                except Exception as e:
                    results[tag] = (None, DataQuality.BAD)
                    self.logger.warning(f"Could not get OPC UA node for {tag}: {e}")
            
            # Batch read values
            if nodes:
                values = self.client.get_values(nodes)
                
                for tag in tags:
                    if tag in tag_to_node:
                        node = tag_to_node[tag]
                        node_index = nodes.index(node)
                        if node_index < len(values):
                            value = values[node_index]
                            results[tag] = (value, DataQuality.GOOD if value is not None else DataQuality.BAD)
        
        except Exception as e:
            self.logger.error(f"Error in OPC UA batch read: {e}")
            # Fallback to individual reads
            for tag in tags:
                if tag not in results:
                    results[tag] = self.read_tag(tag, "")
        
        return results


class S7Reader(PLCDataReader):
    """Siemens S7 PLC reader implementation"""
    
    def __init__(self, connection: PLCConnection):
        super().__init__(connection)
        self.client = None
        self.logger = logging.getLogger(__name__)
        
        if not S7_AVAILABLE:
            raise ImportError("snap7 library is required. Install with: pip install snap7")
    
    def connect(self) -> bool:
        """Connect to Siemens S7 PLC"""
        try:
            self.client = snap7.client.Client()
            
            # Extract rack and slot from connection config
            rack = getattr(self.connection, 'rack', 0)
            slot = getattr(self.connection, 'slot', 1)
            
            # Connect
            self.client.connect(self.connection.ip_address, rack, slot)
            self.is_connected = True
            self.logger.info(f"Connected to S7 PLC at {self.connection.ip_address} (rack {rack}, slot {slot})")
            return True
            
        except Exception as e:
            self.last_error = str(e)
            self.logger.error(f"S7 connection failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from S7 PLC"""
        if self.client:
            self.client.disconnect()
            self.is_connected = False
            self.logger.info("Disconnected from S7 PLC")
    
    def _parse_s7_address(self, address: str) -> Tuple[int, int, int, str]:
        """Parse S7 address (e.g., 'DB1.DBW100' -> (1, 100, 2, 'WORD'))"""
        try:
            if not address.startswith('DB'):
                raise ValueError("Only DB (Data Block) addresses supported")
            
            parts = address.split('.')
            if len(parts) != 2:
                raise ValueError("Invalid S7 address format")
            
            # Extract DB number
            db_num = int(parts[0][2:])  # Remove 'DB' prefix
            
            # Extract offset and data type
            offset_part = parts[1]
            if offset_part.startswith('DBW'):  # Word (16-bit)
                offset = int(offset_part[3:])
                size = 2
                data_type = 'WORD'
            elif offset_part.startswith('DBD'):  # Double word (32-bit)
                offset = int(offset_part[3:])
                size = 4
                data_type = 'DWORD'
            elif offset_part.startswith('DBX'):  # Bit
                bit_address = offset_part[3:].split('.')
                offset = int(bit_address[0])
                bit = int(bit_address[1]) if len(bit_address) > 1 else 0
                size = 1
                data_type = f'BIT.{bit}'
            else:
                raise ValueError(f"Unsupported S7 data type: {offset_part}")
            
            return db_num, offset, size, data_type
            
        except (ValueError, IndexError) as e:
            raise ValueError(f"Cannot parse S7 address '{address}': {e}")
    
    def read_tag(self, tag_address: str, data_type: str) -> Tuple[Any, DataQuality]:
        """Read single S7 tag"""
        if not self.is_connected or not self.client:
            return None, DataQuality.COMM_ERROR
        
        try:
            db_num, offset, size, s7_data_type = self._parse_s7_address(tag_address)
            
            # Read data block
            data = self.client.db_read(db_num, offset, size)
            
            # Convert based on data type
            if s7_data_type.startswith('BIT'):
                bit_num = int(s7_data_type.split('.')[1])
                value = get_bool(data, 0, bit_num)
            elif s7_data_type == 'WORD':
                if data_type.upper() == 'REAL':
                    # Assume scaled integer
                    raw_value = get_int(data, 0)
                    value = float(raw_value) / 100.0
                else:
                    value = get_int(data, 0)
            elif s7_data_type == 'DWORD':
                value = get_real(data, 0)  # 32-bit IEEE 754 float
            else:
                value = 0
            
            return value, DataQuality.GOOD
            
        except Exception as e:
            self.logger.error(f"S7 read error for {tag_address}: {e}")
            return None, DataQuality.COMM_ERROR
    
    def read_tags(self, tags: List[str]) -> Dict[str, Tuple[Any, DataQuality]]:
        """Read multiple S7 tags"""
        results = {}
        
        # Group tags by DB number for efficient batch reading
        # For simplicity, read individually for now
        for tag in tags:
            results[tag] = self.read_tag(tag, "REAL")
        
        return results


# Factory function to create appropriate reader based on protocol
def create_plc_reader(connection: PLCConnection) -> PLCDataReader:
    """Factory function to create appropriate PLC reader"""
    
    protocol = connection.protocol
    
    if hasattr(protocol, 'value'):
        protocol_name = protocol.value
    else:
        protocol_name = str(protocol).lower()
    
    if 'modbus' in protocol_name:
        return ModbusTcpReader(connection)
    elif 'opcua' in protocol_name or 'opc_ua' in protocol_name:
        return OPCUAReader(connection)
    elif 's7' in protocol_name:
        return S7Reader(connection)
    else:
        # Fallback to mock reader from data_mapper
        from data_mapper import MockPLCReader
        return MockPLCReader(connection)