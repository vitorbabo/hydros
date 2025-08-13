#!/usr/bin/env python3
"""
Test address mapping between server and client
"""

import time
import logging
from pymodbus.client import ModbusTcpClient
from protocol_servers import ModbusTCPServer, ProtocolServerConfig, ProtocolType

# Enable detailed logging
logging.basicConfig(level=logging.DEBUG, format='%(name)s - %(levelname)s - %(message)s')

def main():
    print("=== Test Address Mapping ===")
    
    config = ProtocolServerConfig(
        protocol=ProtocolType.MODBUS_TCP,
        host="0.0.0.0",
        port=5020,
        device_id=1
    )
    
    server = ModbusTCPServer(config)
    server.start()
    time.sleep(2)
    
    # Test smaller value that won't get clamped
    test_data = {"DB1.DBW100": 123.45}  # Should become 12345 when scaled
    
    print(f"Updating with: {test_data}")
    server.update_data(test_data)
    time.sleep(1)
    
    # Test client with different address calculations
    client = ModbusTcpClient("localhost", port=5020)
    
    if client.connect():
        print("✓ Client connected")
        
        # Test various address interpretations
        # Note: Server shows "setValues[4] address-100" when we set address 99
        # This suggests pymodbus 3.11.1 uses 0-based internal addressing
        addresses_to_test = [
            (100, "40100 -> internal addr 100 (corrected for 0-based)"),
            (99, "40100-40001 = 99 (standard calc)"),
            (101, "addr 99+1 = 101"),  
            (0, "Direct address 0"),
        ]
        
        for addr, description in addresses_to_test:
            try:
                result = client.read_holding_registers(addr, count=1, device_id=1)  # New API with keyword args
                if result.isError():
                    print(f"  Address {addr:3d}: ERROR - {result}")
                else:
                    raw_value = result.registers[0] 
                    print(f"  Address {addr:3d}: {raw_value:5d} -> {raw_value/100:7.2f} ({description})")
            except Exception as e:
                print(f"  Address {addr:3d}: EXCEPTION - {e}")
        
        client.close()
    else:
        print("✗ Failed to connect")
    
    server.stop()

if __name__ == "__main__":
    main()