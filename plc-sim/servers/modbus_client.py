#!/usr/bin/env python3
"""
Modbus TCP Client for WTP Simulator

A client for writing values to the Modbus TCP server.
"""

import logging
import time
from typing import Dict, Any, Optional
from pymodbus.client import ModbusTcpClient


class ModbusTCPClient:
    """Modbus TCP client for writing WTP simulator data"""
    
    def __init__(self, host: str = "localhost", port: int = 5020, device_id: int = 1):
        self.host = host
        self.port = port
        self.device_id = device_id
        self.logger = logging.getLogger(f"{self.__class__.__name__}")
        self.client = None
        self.connected = False
        
        # Address mapping from DB tags to Modbus addresses
        self.tag_address_map = {
            # Raw Water Intake System (DB1.DBW100-108)
            "DB1.DBW100": 100,  # Raw water level -> register 100
            "DB1.DBW102": 102,  # Raw water flow -> register 102
            "DB1.DBW104": 104,  # Raw water turbidity -> register 104
            "DB1.DBW106": 106,  # Raw water pH -> register 106
            "DB1.DBW108": 108,  # Raw water temperature -> register 108
            "DB1.DBW110": 110,  # Conductivity
            "DB1.DBW112": 112,  # Dissolved oxygen
            
            # Intake Pump System (DB1.DBW114-128)
            "DB1.DBW114": 114,  # Pump flow
            "DB1.DBW116": 116,  # Pump pressure
            "DB1.DBW118": 118,  # Motor current
            "DB1.DBW120": 120,  # Motor temperature
            "DB1.DBW122": 122,  # Vibration
            "DB1.DBW124": 124,  # Power consumption
            "DB1.DBW126": 126,  # Speed
            "DB1.DBW128": 128,  # Efficiency
            "DB1.DBX130.0": 130, # Pump run status -> coil 130
            
            # Rapid Mixing System (DB1.DBW132-140)
            "DB1.DBW132": 132,  # Tank level
            "DB1.DBW134": 134,  # Flow rate
            "DB1.DBW136": 136,  # Mixer speed
            "DB1.DBW138": 138,  # Power consumption
            "DB1.DBW140": 140,  # Tank pressure
            
            # Chemical Dosing System (DB1.DBW142-148)
            "DB1.DBW142": 142,  # Tank level
            "DB1.DBW144": 144,  # Dose rate
            "DB1.DBW146": 146,  # Pump speed
            "DB1.DBW148": 148,  # Chemical concentration
            
            # Clarifier System (DB1.DBW150-162)
            "DB1.DBW150": 150,  # Inlet turbidity
            "DB1.DBW152": 152,  # Effluent turbidity
            "DB1.DBW154": 154,  # Sludge level
            "DB1.DBW156": 156,  # Water level
            "DB1.DBW158": 158,  # Flow rate
            "DB1.DBW160": 160,  # Temperature
            "DB1.DBW162": 162,  # pH
            "DB1.DBX164.0": 164, # Scraper run status -> coil 164
            
            # Chlorination System (DB1.DBW166-172)
            "DB1.DBW166": 166,  # Chlorine residual
            "DB1.DBW168": 168,  # Dose rate
            "DB1.DBW170": 170,  # Contact time
            "DB1.DBW172": 172,  # Tank level
            
            # Legacy mappings (kept for compatibility but may not be used)
            "DB2.DBW100": 200,  # Legacy pump flow
            "DB2.DBW102": 202,  # Legacy pump pressure
            "DB2.DBW104": 204,  # Legacy motor current
            "DB2.DBW106": 206,  # Legacy motor temperature
            "DB2.DBW108": 208,  # Legacy vibration
            "DB2.DBX100.0": 100, # Legacy pump run status -> coil 100
            
            "DB4.DBW100": 300,  # Legacy chemical tank level
            "DB4.DBW102": 302,  # Legacy dose rate
            
            "DB6.DBW100": 600,  # Legacy filter differential pressure
            "DB6.DBW102": 602,  # Legacy effluent turbidity
            
            "DB7.DBW100": 700,  # Legacy chlorine residual
            "DB7.DBW102": 702,  # Legacy chlorine dose rate
            
            "DB9.DBW100": 900,  # Legacy storage tank level
            "DB9.DBW102": 902,  # Legacy tank chlorine residual
        }
    
    def connect(self, max_retries: int = 5, retry_delay: float = 1.0) -> bool:
        """Connect to the Modbus server with retries"""
        for attempt in range(max_retries):
            try:
                self.client = ModbusTcpClient(self.host, port=self.port)
                if self.client.connect():
                    self.connected = True
                    self.logger.info(f"Connected to Modbus server at {self.host}:{self.port}")
                    return True
                else:
                    self.logger.warning(f"Connection attempt {attempt + 1} failed")
            except Exception as e:
                self.logger.warning(f"Connection attempt {attempt + 1} failed: {e}")
            
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
        
        self.logger.error(f"Failed to connect to Modbus server after {max_retries} attempts")
        return False
    
    def disconnect(self):
        """Disconnect from the Modbus server"""
        if self.client and self.connected:
            self.client.close()
            self.connected = False
            self.logger.info("Disconnected from Modbus server")
    
    def write_tag_values(self, tag_values: Dict[str, Any]) -> bool:
        """Write tag values to the Modbus server"""
        if not self.connected or not self.client:
            self.logger.error("Not connected to Modbus server")
            return False
        
        success_count = 0
        total_count = len(tag_values)
        
        for tag_name, value in tag_values.items():
            try:
                # Map semantic tag to Modbus address
                if tag_name in self.tag_address_map:
                    address = self.tag_address_map[tag_name]
                    
                    # Scale float values to integers (preserving 2 decimal places)
                    if isinstance(value, float):
                        int_value = int(value * 100)
                    else:
                        int_value = int(value)
                    
                    # Clamp to 16-bit unsigned range
                    int_value = max(0, min(65535, int_value))
                    
                    # Write the value to the server
                    if tag_name.startswith("DB") and "DBX" not in tag_name:
                        # Write to holding register
                        result = self.client.write_register(address, int_value, device_id=self.device_id)
                        if not result.isError():
                            self.logger.debug(f"✓ Wrote {tag_name} = {value} -> address {address} = {int_value}")
                            success_count += 1
                        else:
                            self.logger.error(f"✗ Failed to write {tag_name} to address {address}: {result}")
                    elif "DBX" in tag_name:
                        # Write to coil
                        bool_val = bool(int_value)
                        result = self.client.write_coil(address, bool_val, device_id=self.device_id)
                        if not result.isError():
                            self.logger.debug(f"✓ Wrote {tag_name} = {value} -> coil {address} = {bool_val}")
                            success_count += 1
                        else:
                            self.logger.error(f"✗ Failed to write {tag_name} to coil {address}: {result}")
                    else:
                        self.logger.warning(f"Unknown tag format: {tag_name}")
                else:
                    self.logger.debug(f"Tag {tag_name} not mapped to Modbus address")
                    
            except Exception as e:
                self.logger.error(f"Error writing {tag_name}: {e}")
        
        if success_count > 0:
            self.logger.info(f"Successfully wrote {success_count}/{total_count} values to Modbus server")
        
        return success_count > 0
    
    def read_tag_values(self, tag_names: list[str]) -> Dict[str, Any]:
        """Read tag values from the Modbus server"""
        if not self.connected or not self.client:
            self.logger.error("Not connected to Modbus server")
            return {}
        
        results = {}
        
        for tag_name in tag_names:
            try:
                if tag_name in self.tag_address_map:
                    address = self.tag_address_map[tag_name]
                    
                    if tag_name.startswith("DB") and "DBX" not in tag_name:
                        # Read from holding register
                        result = self.client.read_holding_registers(address, count=1, device_id=self.device_id)
                        if not result.isError():
                            raw_value = result.registers[0]
                            scaled_value = raw_value / 100.0
                            results[tag_name] = scaled_value
                            self.logger.debug(f"✓ Read {tag_name} = {scaled_value} from address {address}")
                        else:
                            self.logger.error(f"✗ Failed to read {tag_name} from address {address}: {result}")
                    elif "DBX" in tag_name:
                        # Read from coil
                        result = self.client.read_coils(address, count=1, device_id=self.device_id)
                        if not result.isError():
                            bool_value = result.bits[0]
                            results[tag_name] = bool_value
                            self.logger.debug(f"✓ Read {tag_name} = {bool_value} from coil {address}")
                        else:
                            self.logger.error(f"✗ Failed to read {tag_name} from coil {address}: {result}")
                else:
                    self.logger.warning(f"Tag {tag_name} not mapped to Modbus address")
                    
            except Exception as e:
                self.logger.error(f"Error reading {tag_name}: {e}")
        
        return results


def test_client():
    """Test the Modbus client"""
    import logging
    logging.basicConfig(level=logging.INFO)
    
    print("=== Testing Modbus Client ===")
    
    # Create client
    client = ModbusTCPClient()
    
    # Connect to server
    if client.connect():
        print("✓ Connected to server")
        
        # Test writing values
        test_values = {
            "DB1.DBW100": 7.50,   # Raw water level
            "DB1.DBW102": 45.0,   # Raw water flow
            "DB1.DBW104": 12.5,   # Raw water turbidity
            "DB2.DBX100.0": 1,    # Pump run status
        }
        
        print("\n=== Writing test values ===")
        success = client.write_tag_values(test_values)
        
        if success:
            print("✓ Successfully wrote test values")
            
            # Test reading values back
            print("\n=== Reading values back ===")
            read_values = client.read_tag_values(list(test_values.keys()))
            
            for tag, value in read_values.items():
                print(f"  {tag}: {value}")
        else:
            print("✗ Failed to write test values")
        
        # Disconnect
        client.disconnect()
        print("✓ Disconnected from server")
    else:
        print("✗ Failed to connect to server")
    
    print("Test completed")


if __name__ == "__main__":
    test_client()
