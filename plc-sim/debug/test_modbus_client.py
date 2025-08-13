#!/usr/bin/env python3
"""
Test Modbus client to verify protocol server data flow
"""

import time
import threading
from pymodbus.client import ModbusTcpClient
from protocol_servers import ModbusTCPServer, ProtocolServerConfig, ProtocolType

def start_server():
    """Start a Modbus server with test data"""
    config = ProtocolServerConfig(
        protocol=ProtocolType.MODBUS_TCP,
        host="0.0.0.0",
        port=5020,
        device_id=1
    )
    
    server = ModbusTCPServer(config)
    server.start()
    
    print("✓ Modbus server started")
    
    # Wait for server to initialize
    time.sleep(2)
    
    # Update with realistic test data
    test_data = {
        "DB1.DBW100": 7.25,   # Raw water level - should map to 40100
        "DB1.DBW102": 45.5,   # Raw water flow - should map to 40102  
        "DB1.DBW104": 12.8,   # Raw water turbidity - should map to 40104
    }
    
    print(f"Updating server with: {test_data}")
    server.update_data(test_data)
    
    return server

def test_client():
    """Test Modbus client reading"""
    print("\n=== Testing Modbus Client ===")
    
    client = ModbusTcpClient("localhost", port=5020)
    
    if client.connect():
        print("✓ Connected to Modbus server")
        
        # Test reading holding registers
        # Address mapping: DB1.DBW100 -> 40100 -> holding register 99 (40100-40001)
        addresses_to_test = [
            (99, "DB1.DBW100", "Raw water level"),      # 40100
            (101, "DB1.DBW102", "Raw water flow"),       # 40102
            (103, "DB1.DBW104", "Raw water turbidity"),  # 40104
        ]
        
        for addr, tag, description in addresses_to_test:
            try:
                result = client.read_holding_registers(addr, 1, slave=1)
                if result.isError():
                    print(f"✗ Failed to read {tag} ({description}) from address {addr}")
                else:
                    raw_value = result.registers[0]
                    # Values are stored scaled by 100 (see protocol_servers.py line 269)
                    actual_value = raw_value / 100.0
                    print(f"✓ {tag} ({description}): {actual_value} (raw: {raw_value})")
            except Exception as e:
                print(f"✗ Error reading {tag}: {e}")
        
        client.close()
        print("✓ Client disconnected")
    else:
        print("✗ Failed to connect to Modbus server")

def main():
    print("=== Modbus Server/Client Test ===")
    
    # Start server in background thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()
    
    # Wait for server to start
    time.sleep(3)
    
    # Test client
    test_client()
    
    print("\nTest completed. Server will continue running for 10 seconds...")
    time.sleep(10)

if __name__ == "__main__":
    main()