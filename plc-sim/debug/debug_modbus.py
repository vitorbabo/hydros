#!/usr/bin/env python3
"""
Debug Modbus server data updates
"""

import time
import logging
from pymodbus.client import ModbusTcpClient
from protocol_servers import ModbusTCPServer, ProtocolServerConfig, ProtocolType

# Enable detailed logging
logging.basicConfig(level=logging.INFO, format='%(name)s - %(levelname)s - %(message)s')

def main():
    print("=== Debug Modbus Server Data Updates ===")
    
    config = ProtocolServerConfig(
        protocol=ProtocolType.MODBUS_TCP,
        host="0.0.0.0",
        port=5020,
        device_id=1
    )
    
    server = ModbusTCPServer(config)
    print("✓ Server created")
    
    server.start()
    print("✓ Server started")
    
    time.sleep(2)
    
    # Test data updates with debug output
    test_data = {
        "DB1.DBW100": 123.45,  # This should map to 40100
        "DB1.DBW102": 678.90,  # This should map to 40102
    }
    
    print(f"\nUpdating with test data: {test_data}")
    server.update_data(test_data)
    print("✓ Update_data called")
    
    # Wait a moment then test client
    time.sleep(1)
    
    print("\n=== Testing Client Read ===")
    client = ModbusTcpClient("localhost", port=5020)
    
    if client.connect():
        print("✓ Client connected")
        
        # Read the exact addresses we expect
        for addr, expected in [(99, 123.45), (101, 678.90)]:  # 40100-40001=99, 40102-40001=101
            result = client.read_holding_registers(addr, 1, slave=1)
            if not result.isError():
                raw_value = result.registers[0]
                scaled_value = raw_value / 100.0
                print(f"  Address {addr}: raw={raw_value}, scaled={scaled_value:.2f}, expected={expected}")
            else:
                print(f"  Address {addr}: ERROR - {result}")
        
        client.close()
    else:
        print("✗ Client connection failed")
    
    print("\nStopping server...")
    server.stop()
    print("✓ Server stopped")

if __name__ == "__main__":
    main()